"""
graph_rag.py
------------
Fuses the vector store (semantic search over case notes) with the graph
store (structural traversal over entities/relationships). This is the
"GraphRAG" primitive called out in the job req: retrieval that is aware of
both textual similarity AND graph structure, so the agent can answer
questions like "why is Shelby Holdings suspicious?" by pulling both the
analyst notes about it and its two-hop transaction neighborhood.
"""
from __future__ import annotations
from typing import Any
from .graph_store import GraphStore
from .vector_store import VectorStore


class GraphRAG:
    def __init__(self, graph_store: GraphStore):
        self.graph_store = graph_store
        self.vector_store = VectorStore(graph_store.case_notes, text_key="text")

    def retrieve(self, query: str, hops: int = 1, top_k_notes: int = 3) -> dict[str, Any]:
        note_hits = self.vector_store.search(query, top_k=top_k_notes)

        # Expand graph context around every entity referenced by a matched note
        entity_ids = sorted({hit["entity_id"] for hit in note_hits})
        subgraphs = {eid: self.graph_store.neighbors(eid, hops=hops) for eid in entity_ids}

        return {
            "query": query,
            "matched_notes": note_hits,
            "graph_context": subgraphs,
        }
