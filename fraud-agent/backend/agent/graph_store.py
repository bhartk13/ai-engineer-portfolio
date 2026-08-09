"""
graph_store.py
---------------
A lightweight in-memory graph database for the fraud investigation domain.

In a production deployment this would be backed by Neo4j / Amazon Neptune /
TigerGraph, but the interface here is deliberately storage-agnostic: swap
GraphStore's internals for a real driver and every tool in tools.py keeps
working unchanged. That separation of "agent tool contract" from "storage
implementation" is the thing worth highlighting in the interview.
"""
from __future__ import annotations
import json
import networkx as nx
from pathlib import Path
from typing import Any


class GraphStore:
    def __init__(self, data_path: str | Path):
        self.graph = nx.MultiDiGraph()
        self._load(Path(data_path))

    def _load(self, path: Path) -> None:
        data = json.loads(path.read_text())
        for entity in data["entities"]:
            self.graph.add_node(entity["id"], **entity)
        for rel in data["relationships"]:
            self.graph.add_edge(rel["source"], rel["target"], **rel)
        self.case_notes = data.get("case_notes", [])

    def get_entity(self, entity_id: str) -> dict[str, Any] | None:
        if entity_id not in self.graph.nodes:
            return None
        return dict(self.graph.nodes[entity_id])

    def neighbors(self, entity_id: str, hops: int = 1) -> dict[str, Any]:
        """Return the subgraph within `hops` of entity_id (undirected traversal),
        which is the core primitive behind GraphRAG-style retrieval: pull the
        locally relevant context instead of the whole graph."""
        if entity_id not in self.graph.nodes:
            return {"nodes": [], "edges": []}

        undirected = self.graph.to_undirected(as_view=True)
        visited = {entity_id}
        frontier = {entity_id}
        for _ in range(hops):
            next_frontier = set()
            for node in frontier:
                next_frontier |= set(undirected.neighbors(node))
            frontier = next_frontier - visited
            visited |= frontier

        nodes = [dict(self.graph.nodes[n], id=n) for n in visited]
        edges = []
        for u, v, data in self.graph.edges(data=True):
            if u in visited and v in visited:
                edges.append({"source": u, "target": v, **data})
        return {"nodes": nodes, "edges": edges}

    def find_paths(self, source: str, target: str, cutoff: int = 4) -> list[list[str]]:
        undirected = self.graph.to_undirected(as_view=True)
        try:
            return [p for p in nx.all_simple_paths(undirected, source, target, cutoff=cutoff)]
        except (nx.NodeNotFound, nx.NetworkXNoPath):
            return []

    def shared_neighbors(self, entity_ids: list[str]) -> list[str]:
        """Entities connected to *all* given entities — the classic 'these two
        unrelated accounts share a device/IP' fraud ring signal."""
        undirected = self.graph.to_undirected(as_view=True)
        sets = [set(undirected.neighbors(e)) for e in entity_ids if e in undirected]
        if not sets:
            return []
        return sorted(set.intersection(*sets))

    def high_risk_entities(self, threshold: float = 0.5) -> list[dict[str, Any]]:
        return [
            dict(data, id=n)
            for n, data in self.graph.nodes(data=True)
            if data.get("risk_score", 0) >= threshold
        ]

    def notes_for(self, entity_id: str) -> list[str]:
        return [n["text"] for n in self.case_notes if n["entity_id"] == entity_id]
