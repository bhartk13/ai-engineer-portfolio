import re

from app.db.schema import RELATIONSHIPS, TABLE_CATALOG


def link_relevant_tables(question: str) -> list[str]:
    """Keyword-based schema linking — zero LLM tokens."""
    q = question.lower()
    scores: dict[str, int] = {}

    for table, meta in TABLE_CATALOG.items():
        score = 0
        for kw in meta["keywords"]:
            if kw in q:
                score += 2
        for col in meta["columns"]:
            if col.replace("_", " ") in q or col in q:
                score += 1
        if score > 0:
            scores[table] = score

    if not scores:
        return list(TABLE_CATALOG.keys())

    ranked = sorted(scores, key=scores.get, reverse=True)
    # Always include order_items when orders mentioned (revenue queries)
    if "orders" in ranked and "order_items" not in ranked:
        ranked.append("order_items")
    if "order_items" in ranked and "orders" not in ranked:
        ranked.append("orders")

    return ranked[:4]


def build_schema_context(tables: list[str]) -> str:
    """Compact DDL snippet for the LLM — minimizes token usage."""
    lines = ["PostgreSQL schema (read-only SELECT queries only):"]
    for table in tables:
        meta = TABLE_CATALOG[table]
        cols = ", ".join(meta["columns"])
        lines.append(f"  {table}({cols})  -- {meta['description']}")
    lines.append(f"Relationships: {RELATIONSHIPS.strip()}")
    return "\n".join(lines)


def format_results_as_answer(question: str, sql: str, rows: list[dict], columns: list[str]) -> str:
    """Template-based answer — avoids a second LLM call for small result sets."""
    if not rows:
        return "The query ran successfully but returned no rows."

    row_count = len(rows)
    preview_limit = 10

    if row_count == 1 and len(columns) == 1:
        val = rows[0][columns[0]]
        return f"Result: **{val}**"

    lines = [f"Found **{row_count}** row(s)."]
    if row_count <= preview_limit:
        for i, row in enumerate(rows, 1):
            parts = [f"{k}={v}" for k, v in row.items()]
            lines.append(f"{i}. {', '.join(parts)}")
    else:
        lines.append(f"Showing first {preview_limit} rows:")
        for i, row in enumerate(rows[:preview_limit], 1):
            parts = [f"{k}={v}" for k, v in row.items()]
            lines.append(f"{i}. {', '.join(parts)}")
    return "\n".join(lines)
