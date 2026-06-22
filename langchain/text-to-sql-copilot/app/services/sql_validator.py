import re

import sqlparse
from sqlparse.sql import Statement
from sqlparse.tokens import DML, Keyword

FORBIDDEN_KEYWORDS = {
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "CREATE",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
    "COPY",
    "EXECUTE",
    "CALL",
}

ALLOWED_TABLES = {"customers", "products", "orders", "order_items"}


class SQLValidationError(Exception):
    pass


def _strip_comments(sql: str) -> str:
    return sqlparse.format(sql, strip_comments=True).strip()


def _extract_tables(sql: str) -> set[str]:
    """Simple table name extraction from FROM/JOIN clauses."""
    pattern = r"(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)"
    return {m.lower() for m in re.findall(pattern, sql, re.IGNORECASE)}


def validate_sql(sql: str, allowed_tables: set[str] | None = None) -> str:
    """
    Validate and normalize SQL for safe read-only execution.
    Returns cleaned SQL or raises SQLValidationError.
    """
    if not sql or not sql.strip():
        raise SQLValidationError("Empty SQL query.")

    cleaned = _strip_comments(sql)

    # Reject multiple statements
    statements: list[Statement] = sqlparse.parse(cleaned)
    if len(statements) != 1:
        raise SQLValidationError("Only a single SQL statement is allowed.")

    stmt = statements[0]
    stmt_type = stmt.get_type()
    if stmt_type and stmt_type.upper() != "SELECT":
        raise SQLValidationError(f"Only SELECT queries are allowed, got {stmt_type}.")

    upper = cleaned.upper()
    for kw in FORBIDDEN_KEYWORDS:
        if re.search(rf"\b{kw}\b", upper):
            raise SQLValidationError(f"Forbidden keyword: {kw}")

    if ";" in cleaned.rstrip(";"):
        raise SQLValidationError("Multiple statements detected.")

    tables = _extract_tables(cleaned)
    permitted = allowed_tables or ALLOWED_TABLES
    unknown = tables - permitted
    if unknown:
        raise SQLValidationError(f"Access to table(s) not allowed: {', '.join(sorted(unknown))}")

    # Ensure LIMIT exists (caller may append; warn if missing)
    if "LIMIT" not in upper:
        cleaned = cleaned.rstrip(";") + " LIMIT 100"

    return cleaned
