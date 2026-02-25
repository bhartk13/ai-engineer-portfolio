import os
import time
from typing import Tuple
from faster_whisper import WhisperModel

_MODEL_CACHE = {}

def transcribe_audio(audio_path: str, model_size: str = "base") -> Tuple[str, float]:
    """CPU-friendly transcription for Windows using faster-whisper.

    model_size: tiny|base|small|medium (base is a good default)
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(audio_path)

    if model_size not in _MODEL_CACHE:
        _MODEL_CACHE[model_size] = WhisperModel(
            model_size,
            device="cpu",
            compute_type="int8",   # fastest on CPU
        )

    model = _MODEL_CACHE[model_size]
    t0 = time.time()

    segments, _info = model.transcribe(audio_path, vad_filter=True)
    text_parts = [seg.text.strip() for seg in segments if seg.text and seg.text.strip()]
    text = " ".join(text_parts).strip()

    t1 = time.time()
    return text, (t1 - t0)
