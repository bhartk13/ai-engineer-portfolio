import re
from dataclasses import dataclass
from typing import List

FILLERS = [
    "um", "uh", "like", "you know", "actually", "basically", "literally", "so"
]

STRUCTURE_MARKERS = [
    "first", "second", "third", "to start", "next", "finally",
    "the main point", "in summary", "to summarize", "because", "for example"
]

@dataclass
class Metrics:
    word_count: int
    duration_sec: float
    wpm: float
    fillers_count: int
    fillers_per_min: float
    avg_sentence_len: float
    repetition_rate: float
    clarity_score: float
    structure_score: float

_word_re = re.compile(r"\b[\w']+\b", re.UNICODE)

def _sentences(text: str) -> List[str]:
    parts = re.split(r"[.!?]+", text)
    return [p.strip() for p in parts if p.strip()]

def _count_fillers(text_lower: str) -> int:
    total = 0
    for f in FILLERS:
        total += len(re.findall(rf"\b{re.escape(f)}\b", text_lower))
    return total

def _repetition_rate(words: List[str]) -> float:
    if len(words) < 10:
        return 0.0
    repeats = 0.0
    for i in range(1, len(words)):
        if words[i] == words[i - 1]:
            repeats += 1.0
    for i in range(2, len(words)):
        if words[i] == words[i - 2]:
            repeats += 0.5
    return float(repeats) / float(len(words))

def _structure_score(text_lower: str) -> float:
    """
    Improved structure scoring (0-1) using multiple weak signals:
    - explicit markers ("first", "because", "in summary")
    - enumeration ("1", "2", "three", "next")
    - contrast ("however", "but", "on the other hand")
    - wrap-up / takeaway ("so", "therefore", "overall", "the takeaway is")
    """
    markers = [
        "first", "second", "third", "next", "then", "finally",
        "because", "so that", "therefore", "as a result",
        "for example", "for instance",
        "in summary", "to summarize", "overall", "the takeaway",
        "however", "but", "on the other hand",
        "my point is", "the main point",
    ]

    hits = 0
    for m in markers:
        if m in text_lower:
            hits += 1

    # extra signal: presence of at least 3 sentences (often indicates structure)
    sentence_count = len(_sentences(text_lower))
    if sentence_count >= 3:
        hits += 1

    # cap
    return min(1.0, hits / 4.0)

def _clarity_score(avg_sentence_len: float, fillers_per_min: float, repetition_rate: float) -> float:
    score = 1.0

    if avg_sentence_len > 28:
        score -= min(0.35, (avg_sentence_len - 28) * 0.01)
    elif avg_sentence_len < 7:
        score -= min(0.15, (7 - avg_sentence_len) * 0.02)

    if fillers_per_min > 6:
        score -= 0.30
    elif fillers_per_min > 4:
        score -= 0.18
    elif fillers_per_min > 2:
        score -= 0.08

    score -= min(0.25, repetition_rate * 2.0)
    return max(0.0, min(1.0, score))

def evaluate_transcript(transcript: str, duration_sec: float) -> Metrics:
    text = transcript.strip()
    lower = text.lower()

    words = _word_re.findall(text)
    wc = len(words)
    minutes = max(1e-6, duration_sec / 60.0)
    wpm = wc / minutes

    fillers = _count_fillers(lower)
    fillers_per_min = fillers / minutes

    sents = _sentences(text)
    if sents:
        sent_lens = [len(_word_re.findall(s)) for s in sents]
        avg_sent_len = sum(sent_lens) / len(sent_lens)
    else:
        avg_sent_len = float(wc) if wc else 0.0

    rep_rate = _repetition_rate([w.lower() for w in words])
    structure = _structure_score(lower)
    clarity = _clarity_score(avg_sent_len, fillers_per_min, rep_rate)

    return Metrics(
        word_count=int(wc),
        duration_sec=float(duration_sec),
        wpm=float(wpm),
        fillers_count=int(fillers),
        fillers_per_min=float(fillers_per_min),
        avg_sentence_len=float(avg_sent_len),
        repetition_rate=float(rep_rate),
        clarity_score=float(clarity),
        structure_score=float(structure),
    )
