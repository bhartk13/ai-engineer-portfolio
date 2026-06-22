import json
import re


def _normalize_sql(sql: str) -> str:
    """Return a single SELECT statement without trailing semicolon."""
    sql = sql.strip().strip("`")
    # Drop trailing prose after the first complete statement
    sql = re.split(r";\s*(?:```|$|\n\n)", sql, maxsplit=1)[0].strip()
    if sql.endswith(";"):
        sql = sql[:-1].strip()
    return sql


def _looks_like_sql(sql: str) -> bool:
    upper = sql.upper()
    return upper.startswith("SELECT") and "FROM" in upper


def extract_sql_from_llm_response(content: str) -> str:
    """Extract executable SQL from JSON, markdown, or free-form LLM output."""
    text = (content or "").strip()
    if not text:
        raise ValueError("Empty LLM response")

    # 1. JSON: {"sql": "SELECT ..."}
    json_match = re.search(r"\{[\s\S]*\}", text)
    if json_match:
        try:
            data = json.loads(json_match.group())
            sql = data.get("sql")
            if isinstance(sql, str) and sql.strip():
                normalized = _normalize_sql(sql)
                if _looks_like_sql(normalized):
                    return normalized
        except json.JSONDecodeError:
            pass

    # 2. Markdown code fence: ```sql ... ``` or ``` ... ```
    for pattern in (r"```sql\s*(.*?)```", r"```\s*(SELECT[\s\S]*?)```"):
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            candidate = _normalize_sql(match.group(1))
            if _looks_like_sql(candidate):
                return candidate

    # 3. Raw SELECT — skip false positives like "SELECT query:"
    for match in re.finditer(r"\bSELECT\b", text, re.IGNORECASE):
        fragment = text[match.start() :]
        fragment = re.split(r"```|\n\n(?:This |The |Note:|Explanation|Here)", fragment, maxsplit=1)[0]
        candidate = _normalize_sql(fragment)
        if _looks_like_sql(candidate):
            return candidate

    raise ValueError(f"Could not parse SQL from LLM response: {text[:200]}")
