"""
vector_store.py
----------------
Minimal TF-IDF-based vector index over investigator case notes.

This stands in for a production embeddings + vector DB layer (e.g. Voyage
embeddings + pgvector/Pinecone). Swapping `_embed` for a real embedding model
call is the only change needed to go to production -- the retrieval and
GraphRAG-fusion logic in agent/graph_rag.py stays the same.
"""
from __future__ import annotations
import math
import re
from collections import Counter
from typing import Any


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


class VectorStore:
    def __init__(self, documents: list[dict[str, Any]], text_key: str = "text"):
        """documents: list of dicts, each must contain `text_key` and an `id`/metadata."""
        self.documents = documents
        self.text_key = text_key
        self._doc_tokens = [_tokenize(d[text_key]) for d in documents]
        self._df = Counter()
        for toks in self._doc_tokens:
            self._df.update(set(toks))
        self._n = len(documents)

    def _vector(self, tokens: list[str]) -> Counter:
        tf = Counter(tokens)
        vec = Counter()
        for term, count in tf.items():
            idf = math.log((self._n + 1) / (self._df.get(term, 0) + 1)) + 1
            vec[term] = count * idf
        return vec

    @staticmethod
    def _cosine(a: Counter, b: Counter) -> float:
        common = set(a) & set(b)
        num = sum(a[t] * b[t] for t in common)
        denom_a = math.sqrt(sum(v * v for v in a.values()))
        denom_b = math.sqrt(sum(v * v for v in b.values()))
        if denom_a == 0 or denom_b == 0:
            return 0.0
        return num / (denom_a * denom_b)

    def search(self, query: str, top_k: int = 3) -> list[dict[str, Any]]:
        q_vec = self._vector(_tokenize(query))
        scored = []
        for doc, toks in zip(self.documents, self._doc_tokens):
            score = self._cosine(q_vec, self._vector(toks))
            if score > 0:
                scored.append({**doc, "score": round(score, 4)})
        scored.sort(key=lambda d: d["score"], reverse=True)
        return scored[:top_k]
