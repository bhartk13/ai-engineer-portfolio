from pathlib import Path
from backend.agent.graph_store import GraphStore
from backend.agent.graph_rag import GraphRAG

DATA = Path(__file__).resolve().parents[1] / "data" / "sample_data.json"


def test_load_graph():
    gs = GraphStore(DATA)
    assert gs.get_entity("acct_1002")["name"] == "Shelby Holdings LLC"


def test_neighbors_expand():
    gs = GraphStore(DATA)
    sub = gs.neighbors("acct_1002", hops=1)
    ids = {n["id"] for n in sub["nodes"]}
    assert "acct_1001" in ids
    assert "device_88" in ids


def test_shared_neighbors_detects_ring():
    gs = GraphStore(DATA)
    shared = gs.shared_neighbors(["acct_1002", "acct_1004"])
    assert "device_88" in shared
    assert "ip_204" in shared


def test_find_paths():
    gs = GraphStore(DATA)
    paths = gs.find_paths("acct_1003", "acct_1004")
    assert any("acct_1002" in p for p in paths)


def test_graph_rag_retrieval_links_notes_to_subgraph():
    gs = GraphStore(DATA)
    rag = GraphRAG(gs)
    result = rag.retrieve("structuring deposits shared device", hops=1)
    assert result["matched_notes"], "expected at least one matched note"
    matched_entities = {n["entity_id"] for n in result["matched_notes"]}
    assert matched_entities & set(result["graph_context"].keys())
