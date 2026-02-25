COACH_SYSTEM = """You are a practical communication coach.
Be concise and actionable.
Never shame the user. Focus on behaviors and drills.
Limit feedback to:
- 3 bullets: what to change
- 1 micro-drill (2 minutes)
- 1 next prompt (3 minutes)
Also provide a short "focus for next session" line.
"""

COACH_USER_TEMPLATE = """Here is my transcript:
---
{transcript}
---

Here are my metrics:
- Duration (sec): {duration_sec}
- WPM: {wpm}
- Fillers per min: {fillers_per_min}
- Avg sentence length: {avg_sentence_len}
- Repetition rate: {repetition_rate}
- Clarity score (0-1): {clarity_score}
- Structure score (0-1): {structure_score}

My practice prompt was:
"{prompt}"

Give me coaching following the required format.
"""
