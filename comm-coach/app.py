import os
import io
from typing import Dict, Any, List, Optional

import pandas as pd
import streamlit as st
import matplotlib.pyplot as plt
from audiorecorder import audiorecorder

from src.db import (
    init_db,
    insert_session,
    list_sessions,
    get_session,
    insert_phrase,
    list_phrases,
    phrases_due,
    mark_phrase_reviewed,
    DB_PATH,  # works with current src/db.py; if you later make DB_PATH absolute, this still prints correctly
)
from src.transcribe import transcribe_audio
from src.evaluate import evaluate_transcript
from src.coach_agent import get_ai_feedback, ai_enabled
from src.utils import now_iso, new_audio_path


# ----------------------------
# App config
# ----------------------------
st.set_page_config(page_title="Comm Coach (Local)", layout="wide")

# Initialize DB
init_db()

# ----------------------------
# Prompt tracks (curriculum)
# ----------------------------
TRACKS: Dict[str, List[Dict[str, Any]]] = {
    "Workplace (Core)": [
        {"id": "wk_01", "level": 1, "skill": "clarity", "prompt": "Give a work update: what you did, what's blocked, next step."},
        {"id": "wk_02", "level": 1, "skill": "structure", "prompt": "Explain your current project in 60–90 seconds to a non-technical person."},
        {"id": "wk_03", "level": 1, "skill": "brevity", "prompt": "Summarize a meeting outcome and list 3 next actions."},
        {"id": "wk_04", "level": 2, "skill": "influence", "prompt": "Persuade a skeptical colleague to try your approach. Include 1 risk and 1 mitigation."},
        {"id": "wk_05", "level": 2, "skill": "conflict", "prompt": "Disagree politely with a colleague and propose an alternative with tradeoffs."},
        {"id": "wk_06", "level": 3, "skill": "executive", "prompt": "Deliver a 30-second exec summary: context → decision → impact → ask."},
        {"id": "wk_07", "level": 3, "skill": "story", "prompt": "Tell a short success story: situation → action → measurable result."},
    ],
    "Interview (High Impact)": [
        {"id": "iv_01", "level": 1, "skill": "intro", "prompt": "Introduce yourself in 45 seconds for an interview. End with the role-fit statement."},
        {"id": "iv_02", "level": 1, "skill": "examples", "prompt": "Answer: 'Tell me about a time you solved a difficult problem.' Use STAR format."},
        {"id": "iv_03", "level": 2, "skill": "tradeoffs", "prompt": "Explain a decision you made with tradeoffs and what you learned."},
        {"id": "iv_04", "level": 2, "skill": "conflict", "prompt": "Answer: 'Tell me about a disagreement with a teammate and how you resolved it.'"},
        {"id": "iv_05", "level": 3, "skill": "leadership", "prompt": "Answer: 'How do you influence without authority?' Give one concrete example."},
        {"id": "iv_06", "level": 3, "skill": "closing", "prompt": "Close an interview: recap strengths + interest + ask 2 smart questions."},
    ],
    "Everyday Confidence (Low Pressure)": [
        {"id": "ev_01", "level": 1, "skill": "clarity", "prompt": "Explain something you enjoy to a friend who knows nothing about it."},
        {"id": "ev_02", "level": 1, "skill": "focus", "prompt": "Describe your day in 60 seconds with 3 clear highlights."},
        {"id": "ev_03", "level": 2, "skill": "story", "prompt": "Tell a short story: setup → moment of tension → outcome → takeaway."},
        {"id": "ev_04", "level": 2, "skill": "opinions", "prompt": "Share an opinion politely. Give 2 reasons and 1 example."},
        {"id": "ev_05", "level": 3, "skill": "confidence", "prompt": "Explain a boundary or request clearly and respectfully, without over-explaining."},
    ],
}


# ----------------------------
# Scoring thresholds for progression
# ----------------------------
DEFAULT_TARGETS = {
    "fillers_per_min": 2.5,   # early target; tighten later
    "clarity_score": 0.72,
    "structure_score": 0.10,
}
REQUIRED_STREAK = 2  # must hit targets this many saves in a row to advance


def meets_targets(result: Dict[str, Any], targets: Dict[str, float]) -> bool:
    """Return True if this session meets all progression targets."""
    return (
        float(result["fillers_per_min"]) <= float(targets["fillers_per_min"])
        and float(result["clarity_score"]) >= float(targets["clarity_score"])
        and float(result["structure_score"]) >= float(targets["structure_score"])
    )


def init_state():
    # core working memory
    if "last_audio_bytes" not in st.session_state:
        st.session_state.last_audio_bytes = None
    if "result" not in st.session_state:
        st.session_state.result = None  # last transcript + metrics + coaching
    if "duration_sec" not in st.session_state:
        st.session_state.duration_sec = None

    # plan state
    if "track_name" not in st.session_state:
        st.session_state.track_name = "Workplace (Core)"
    if "plan_index" not in st.session_state:
        st.session_state.plan_index = 0
    if "streak" not in st.session_state:
        st.session_state.streak = 0
    if "targets" not in st.session_state:
        st.session_state.targets = DEFAULT_TARGETS.copy()
    if "model_size" not in st.session_state:
        st.session_state.model_size = "base"
    if "auto_advance" not in st.session_state:
        st.session_state.auto_advance = True
    if "show_debug" not in st.session_state:
        st.session_state.show_debug = False


def get_current_item() -> Dict[str, Any]:
    plan = TRACKS[st.session_state.track_name]
    idx = int(st.session_state.plan_index)
    idx = max(0, min(idx, len(plan) - 1))
    st.session_state.plan_index = idx
    return plan[idx]


def save_audio_bytes(audio_bytes: bytes, path: str) -> None:
    with open(path, "wb") as f:
        f.write(audio_bytes)


def plot_trend(df: pd.DataFrame, col: str, title: str):
    fig = plt.figure()
    plt.plot(df["created_at"], df[col])
    plt.xticks(rotation=45, ha="right")
    plt.title(title)
    plt.tight_layout()
    st.pyplot(fig)


init_state()

# ----------------------------
# Sidebar
# ----------------------------
st.sidebar.title("Comm Coach")

page = st.sidebar.radio("Go to", ["Practice", "History", "Dashboard", "Phrase Bank"], index=0)

st.sidebar.markdown("---")
st.sidebar.write("AI coach:", "ON" if ai_enabled() else "OFF")
st.sidebar.caption("AI mode is optional; local coaching still works.")

st.sidebar.markdown("---")
st.sidebar.checkbox("Show debug", key="show_debug")
if st.session_state.show_debug:
    st.sidebar.code(f"DB_PATH = {DB_PATH}")
    st.sidebar.write("Track:", st.session_state.track_name)
    st.sidebar.write("Plan index:", st.session_state.plan_index)
    st.sidebar.write("Streak:", st.session_state.streak)

# ----------------------------
# Practice page (adaptive loop)
# ----------------------------
if page == "Practice":
    st.title("Practice (Adaptive Plan)")

    # Plan controls
    cA, cB, cC, cD = st.columns([2.2, 1, 1, 1.2])
    with cA:
        st.selectbox("Track", list(TRACKS.keys()), key="track_name")
    with cB:
        st.selectbox("Transcription model (CPU)", ["tiny", "base", "small"], key="model_size")
    with cC:
        st.toggle("Auto-advance", key="auto_advance")
    with cD:
        if st.button("Reset plan"):
            st.session_state.plan_index = 0
            st.session_state.streak = 0
            st.session_state.result = None
            st.session_state.last_audio_bytes = None
            st.session_state.duration_sec = None
            st.rerun()

    # Targets controls (kept simple; you can tighten as you improve)
    st.subheader("Progress Targets")
    t1, t2, t3 = st.columns(3)
    with t1:
        st.session_state.targets["fillers_per_min"] = st.slider("Fillers/min ≤", 0.0, 8.0, float(st.session_state.targets["fillers_per_min"]), 0.1)
    with t2:
        st.session_state.targets["clarity_score"] = st.slider("Clarity ≥", 0.0, 1.0, float(st.session_state.targets["clarity_score"]), 0.01)
    with t3:
        st.session_state.targets["structure_score"] = st.slider("Structure ≥", 0.0, 1.0, float(st.session_state.targets["structure_score"]), 0.01)

    # Current prompt
    item = get_current_item()
    plan = TRACKS[st.session_state.track_name]
    st.markdown("---")
    st.subheader(f"Prompt {st.session_state.plan_index + 1} of {len(plan)}")
    st.caption(f"Level {item['level']} • Focus: {item['skill']} • Need {REQUIRED_STREAK} saves in a row meeting targets to advance")
    st.write(item["prompt"])

    # Recording
    st.markdown("### Record")
    st.write("Record 60–180 seconds. Keep sentences clean. Use short pauses instead of fillers.")
    audio = audiorecorder("Start recording", "Stop recording")

    if len(audio) > 0:
        wav_io = io.BytesIO()
        audio.export(wav_io, format="wav")
        wav_bytes = wav_io.getvalue()

        st.session_state.last_audio_bytes = wav_bytes
        st.session_state.duration_sec = float(len(audio) / 1000.0)

        st.audio(wav_bytes, format="audio/wav")
        st.write(f"Duration: **{st.session_state.duration_sec:.1f}s**")

    # Transcribe + Evaluate
    transcribe_disabled = st.session_state.last_audio_bytes is None
    if st.button("Transcribe + Evaluate", type="primary", disabled=transcribe_disabled):
        audio_path = new_audio_path()
        save_audio_bytes(st.session_state.last_audio_bytes, audio_path)

        with st.status("Transcribing locally with Whisper (CPU)…", expanded=False):
            transcript, _t_sec = transcribe_audio(audio_path, model_size=st.session_state.model_size)

        if not transcript.strip():
            st.error("Transcription was empty. Try a quieter room or speak closer to the mic.")
        else:
            metrics = evaluate_transcript(transcript, st.session_state.duration_sec or 1.0)

            payload = {
                "transcript": transcript,
                "prompt": item["prompt"],
                "duration_sec": metrics.duration_sec,
                "wpm": metrics.wpm,
                "fillers_per_min": metrics.fillers_per_min,
                "avg_sentence_len": metrics.avg_sentence_len,
                "repetition_rate": metrics.repetition_rate,
                "clarity_score": metrics.clarity_score,
                "structure_score": metrics.structure_score,
            }

            with st.status("Generating coaching…", expanded=False):
                feedback = get_ai_feedback(payload)

            # Persist result across reruns
            st.session_state.result = {
                "track": st.session_state.track_name,
                "prompt_id": item["id"],
                "prompt_level": item["level"],
                "prompt_skill": item["skill"],
                "prompt": item["prompt"],
                "audio_path": audio_path,
                "transcript": transcript,
                "duration_sec": metrics.duration_sec,
                "wpm": metrics.wpm,
                "fillers_per_min": metrics.fillers_per_min,
                "avg_sentence_len": metrics.avg_sentence_len,
                "repetition_rate": metrics.repetition_rate,
                "clarity_score": metrics.clarity_score,
                "structure_score": metrics.structure_score,
                "coach_feedback": feedback,
            }

    # Display result + Save cycle
    if st.session_state.result:
        r = st.session_state.result

        st.markdown("---")
        st.subheader("Transcript")
        st.write(r["transcript"])

        st.subheader("Metrics")
        m1, m2, m3 = st.columns(3)
        m1.metric("WPM", f"{r['wpm']:.0f}")
        m2.metric("Fillers/min", f"{r['fillers_per_min']:.1f}")
        m3.metric("Avg sentence length", f"{r['avg_sentence_len']:.1f} words")

        m4, m5, m6 = st.columns(3)
        m4.metric("Clarity score", f"{r['clarity_score']:.2f}")
        m5.metric("Structure score", f"{r['structure_score']:.2f}")
        m6.metric("Repetition rate", f"{r['repetition_rate']:.3f}")

        # Target check
        hit = meets_targets(r, st.session_state.targets)
        if hit:
            st.success("This attempt meets your targets. Save it to grow your streak.")
        else:
            st.info("This attempt does not meet targets yet. Save it if you want to track it, or discard and try again.")

        st.subheader("Coaching")
        st.write(r["coach_feedback"])

        st.markdown("---")
        phrase = st.text_input("Save a phrase/word you liked (optional)", key="phrase_input")
        notes = st.text_input("Notes (optional)", key="notes_input")

        csave, cnext, cdiscard = st.columns([1.1, 1, 1])
        with csave:
            if st.button("Save session"):
                # Save to DB
                row = {
                    "created_at": now_iso(),
                    "prompt": r["prompt"],  # keep DB schema simple; prompt contains the text
                    "audio_path": r["audio_path"],
                    "transcript": r["transcript"],
                    "duration_sec": float(r["duration_sec"]),
                    "wpm": float(r["wpm"]),
                    "fillers_per_min": float(r["fillers_per_min"]),
                    "avg_sentence_len": float(r["avg_sentence_len"]),
                    "repetition_rate": float(r["repetition_rate"]),
                    "clarity_score": float(r["clarity_score"]),
                    "structure_score": float(r["structure_score"]),
                    "coach_feedback": r["coach_feedback"],
                }
                sid = insert_session(row)
                if phrase.strip():
                    insert_phrase(phrase, notes)

                # Update streak + plan advancement
                if meets_targets(r, st.session_state.targets):
                    st.session_state.streak += 1
                else:
                    st.session_state.streak = 0

                advanced = False
                if st.session_state.auto_advance and st.session_state.streak >= REQUIRED_STREAK:
                    if st.session_state.plan_index < len(plan) - 1:
                        st.session_state.plan_index += 1
                        st.session_state.streak = 0
                        advanced = True

                st.success(f"Saved session #{sid}" + (" • Advanced to next prompt!" if advanced else ""))

                # Clear current result to avoid accidental double-save
                st.session_state.result = None
                st.session_state.last_audio_bytes = None
                st.session_state.duration_sec = None
                st.rerun()

        with cnext:
            if st.button("Next prompt (skip)"):
                if st.session_state.plan_index < len(plan) - 1:
                    st.session_state.plan_index += 1
                    st.session_state.streak = 0
                st.session_state.result = None
                st.session_state.last_audio_bytes = None
                st.session_state.duration_sec = None
                st.rerun()

        with cdiscard:
            if st.button("Discard attempt"):
                st.session_state.result = None
                st.session_state.last_audio_bytes = None
                st.session_state.duration_sec = None
                st.rerun()

    st.markdown("---")
    st.subheader("Targets (simple guidance)")
    st.write("- Fillers/min: aim < 4 early, then < 2.5, then < 2.")
    st.write("- WPM: aim 130–170.")
    st.write("- Use structure: Point → Reason → Example → Close.")
    st.write("- When you blank out: pause, restate your point, give one example.")


# ----------------------------
# History page
# ----------------------------
elif page == "History":
    st.title("History")

    rows = list_sessions(limit=100)
    if not rows:
        st.info("No sessions yet. Save a session from Practice to see it here.")
    else:
        df = pd.DataFrame(
            rows,
            columns=["id", "created_at", "prompt", "duration_sec", "wpm", "fillers_per_min", "clarity_score", "structure_score"],
        )
        st.dataframe(df, use_container_width=True)

        sid = st.number_input("Open session ID", min_value=1, step=1, value=int(df.iloc[0]["id"]))
        s = get_session(int(sid))
        if s:
            st.subheader(f"Session #{s['id']} — {s['created_at']}")
            st.write(f"**Prompt:** {s['prompt']}")

            if os.path.exists(s["audio_path"]):
                with open(s["audio_path"], "rb") as f:
                    st.audio(f.read(), format="audio/wav")

            st.write("**Transcript:**")
            st.write(s["transcript"])

            st.write("**Coaching:**")
            st.write(s["coach_feedback"])
        else:
            st.warning("Session not found.")


# ----------------------------
# Dashboard page
# ----------------------------
elif page == "Dashboard":
    st.title("Dashboard")

    rows = list_sessions(limit=300)
    if not rows:
        st.info("Dashboard is empty until you save sessions from Practice.")
    else:
        df = pd.DataFrame(
            rows,
            columns=["id", "created_at", "prompt", "duration_sec", "wpm", "fillers_per_min", "clarity_score", "structure_score"],
        ).sort_values("id")

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Sessions", str(len(df)))
        c2.metric("Latest WPM", f"{df.iloc[-1]['wpm']:.0f}")
        c3.metric("Latest fillers/min", f"{df.iloc[-1]['fillers_per_min']:.1f}")
        c4.metric("Latest clarity", f"{df.iloc[-1]['clarity_score']:.2f}")

        st.markdown("---")
        plot_trend(df, "fillers_per_min", "Fillers per minute (lower is better)")
        plot_trend(df, "wpm", "Words per minute (aim ~130–170)")
        plot_trend(df, "clarity_score", "Clarity score (0–1)")
        plot_trend(df, "structure_score", "Structure score (0–1)")


# ----------------------------
# Phrase Bank page
# ----------------------------
elif page == "Phrase Bank":
    st.title("Phrase Bank")

    st.subheader("Due for review")
    due = phrases_due()
    if not due:
        st.write("Nothing due right now.")
    else:
        for (pid, phrase, notes, _last_rev, interval_days) in due:
            st.markdown(f"**{phrase}**")
            if notes:
                st.caption(notes)

            st.write("Write a sentence using it (in your own context):")
            _ = st.text_input(f"Your sentence (phrase #{pid})", key=f"sent_{pid}")

            colA, colB, colC = st.columns(3)
            if colA.button("Easy (x2 interval)", key=f"easy_{pid}"):
                mark_phrase_reviewed(pid, min(60, int(interval_days) * 2))
                st.rerun()
            if colB.button("OK (+1 interval)", key=f"ok_{pid}"):
                mark_phrase_reviewed(pid, min(60, int(interval_days) + 1))
                st.rerun()
            if colC.button("Hard (reset to 1)", key=f"hard_{pid}"):
                mark_phrase_reviewed(pid, 1)
                st.rerun()

            st.markdown("---")

    st.subheader("All phrases")
    rows = list_phrases(limit=200)
    if rows:
        df = pd.DataFrame(rows, columns=["id", "created_at", "phrase", "notes", "last_reviewed_at", "review_interval_days"])
        st.dataframe(df, use_container_width=True)
    else:
        st.info("No phrases saved yet. Save one from a Practice session.")