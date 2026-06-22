import pytest

from app.services.sql_parser import extract_sql_from_llm_response


MARKDOWN_RESPONSE = """SELECT query:

```sql
SELECT
    c.country,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0.0) AS revenue
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
GROUP BY c.country
LIMIT 100;
```

This query will return a JSON array where each element contains the country name.
"""


def test_extract_from_markdown_fence():
    sql = extract_sql_from_llm_response(MARKDOWN_RESPONSE)
    assert sql.upper().startswith("SELECT")
    assert "FROM CUSTOMERS" in sql.upper()
    assert "GROUP BY" in sql.upper()
    assert ";" not in sql
    assert "This query" not in sql


def test_extract_from_json():
    content = '{"sql": "SELECT COUNT(*) FROM customers LIMIT 100"}'
    assert extract_sql_from_llm_response(content) == "SELECT COUNT(*) FROM customers LIMIT 100"


def test_skips_select_query_false_positive():
    content = """SELECT query:

```sql
SELECT country FROM customers LIMIT 10;
```"""
    sql = extract_sql_from_llm_response(content)
    assert sql.upper().startswith("SELECT COUNTRY")


def test_raises_on_garbage():
    with pytest.raises(ValueError, match="Could not parse"):
        extract_sql_from_llm_response("Here is my answer: try again later.")
