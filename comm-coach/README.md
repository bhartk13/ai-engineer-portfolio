# Comm Coach (Local) 🎙️
A local-first communication practice app for **Windows (CPU-only)** that helps you build confidence, stay focused, and recall better words—using short daily speaking reps.

You record a short response, the app transcribes it **locally** with Whisper (CPU-friendly `faster-whisper`), evaluates key metrics (fillers/min, WPM, clarity/structure heuristics), and stores your progress in a local SQLite database. An optional AI coach mode is included (off by default).

---

## Features
- **Record audio in the browser** (Streamlit)
- **Local transcription** with `faster-whisper` (CPU, `int8`)
- Automatic metrics:
  - words/min (WPM)
  - filler words/min
  - average sentence length
  - repetition rate
  - heuristic clarity + structure scores
- **History** with playback + transcript + coaching
- **Dashboard** trends (charts)
- **Phrase Bank** with simple spaced repetition
- Optional **AI coach** (toggle via `.env`)

---

## Requirements (Windows, no GPU)
- Python 3.10+ recommended
- FFmpeg (required)
- Works on CPU-only machines

---

## 1) Install FFmpeg (required)

### Easiest (Winget)
Open **Command Prompt** or **PowerShell**:

```bat
winget install Gyan.FFmpeg
```

Close and reopen your terminal, then verify:

```bat
ffmpeg -version
```

If `ffmpeg` is not found, add FFmpeg to your PATH (see Troubleshooting).

---

## 2) Create virtual environment and install dependencies
From the project root:

```bat
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 3) Run the app
```bat
streamlit run app.py
```

Streamlit will print a local URL (usually `http://localhost:8501`).

---

## How to run and test (quick checklist)

### Smoke test (2 minutes)
1. App launches without errors
2. **Practice** page renders
3. You can record audio (mic permission prompt may appear)
4. Clicking **Transcribe + Evaluate** produces a transcript + metrics
5. Clicking **Save session** adds it to **History** and **Dashboard**

### First real session (5 minutes)
1. Go to **Practice**
2. Select a prompt
3. Record **60–180 seconds**
4. Click **Transcribe + Evaluate**
5. Review:
   - **Fillers/min** (target < 4 early)
   - **WPM** (target 130–170)
   - **Avg sentence length** (target 10–22)
6. Click **Save session**
7. Optionally save one phrase into **Phrase Bank**

### 7-day mini program
- **Days 1–2**: reduce fillers (pause silently instead)
- **Days 3–4**: shorten sentences (one idea per sentence)
- **Days 5–7**: structure (Point → Reason → Example → Close)

---

## Optional: Enable AI coach (off by default)
The local heuristic coach is useful. If you want higher-quality coaching, enable the AI coach.

1) Copy the env template:
```bat
copy .env.example .env
```

2) Edit `.env`:
```env
AI_COACH_ENABLED=1
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

3) Restart the app.

> The app falls back to local coaching if AI is disabled or keys are missing.

---

## Troubleshooting

### `ffmpeg` not found
- Verify:
  ```bat
  where ffmpeg
  ```
- If missing, reinstall via winget or add FFmpeg `bin` to PATH (commonly `C:\Program Files\FFmpeg\bin`).

### Transcription is slow
- In `app.py`, change `model_size="base"` to `model_size="tiny"` for faster CPU transcription.

### Empty transcription
- Reduce background noise, speak closer to the mic, and record at least ~15 seconds.

---

## Project structure
```
comm-coach/
  app.py
  requirements.txt
  .env.example
  .gitignore
  data/               # created at runtime (db + audio)
  src/
    db.py
    transcribe.py
    evaluate.py
    coach_agent.py
    prompts.py
    utils.py
```

---

## Roadmap (production + monetization friendly)
- FastAPI backend + Next.js frontend
- Auth + subscriptions (Stripe)
- Background jobs for transcription/evaluation
- Rubric versioning for stable scoring over time
- Scenario packs (interview, leadership, conflict, sales)

---

## License
MIT (add a `LICENSE` file if you want).
