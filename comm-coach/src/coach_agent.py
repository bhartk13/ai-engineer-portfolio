import os
from typing import Dict, Any
from dotenv import load_dotenv
from src.prompts import COACH_SYSTEM, COACH_USER_TEMPLATE

load_dotenv()

def ai_enabled() -> bool:
    return os.getenv("AI_COACH_ENABLED", "0").strip() == "1"

def get_ai_feedback(payload: Dict[str, Any]) -> str:
    """Optional AI coaching. Falls back to local coaching when disabled."""
    if not ai_enabled():
        return local_feedback(payload)

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
    if not api_key:
        return local_feedback(payload)

    try:
        from openai import OpenAI
    except Exception:
        return local_feedback(payload)

    client = OpenAI(api_key=api_key)
    user_msg = COACH_USER_TEMPLATE.format(**payload)

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": COACH_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.4,
    )
    out = (resp.choices[0].message.content or "").strip()
    if out:
        return "✅ AI Coach Active\n\n" + out
    else:
        return "🧠 Local Coach Fallback\n\n" + local_feedback(payload)

def local_feedback(payload: Dict[str, Any]) -> str:
    wpm = float(payload["wpm"])
    fpm = float(payload["fillers_per_min"])
    avg_sent = float(payload["avg_sentence_len"])
    structure = float(payload["structure_score"])

    changes = []
    if fpm > 4:
        changes.append("Reduce filler words: pause silently instead of using a filler.")
    if wpm > 170:
        changes.append("Slow down ~10–15% and end each sentence clearly.")
    if avg_sent > 26:
        changes.append("Shorten sentences: 1 idea per sentence, then pause.")
    if structure < 0.4:
        changes.append("Use a framework: Point → Reason → Example → Close.")

    if not changes:
        changes = [
            "Keep the pace steady and add a 1-second pause before key points.",
            "Make your first sentence a clear headline of what you’ll say.",
            "End with a one-line summary and a next step/ask.",
        ]

    focus = "Focus for next session: Pauses + one clear structure."
    bullets = "\n".join([f"- {c}" for c in changes[:3]])
    drill = "Micro-drill (2 min): Speak 6 sentences. After each sentence, pause for 1 second. No fillers allowed."
    next_prompt = "Next prompt (3 min): Explain a recent decision you made: what you chose, why, tradeoffs, and what you’ll do next."

    return f"{focus}\n\nWhat to change:\n{bullets}\n\n{drill}\n\n{next_prompt}"
