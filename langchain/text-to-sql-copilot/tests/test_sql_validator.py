import pytest

from app.services.schema_service import link_relevant_tables
from app.services.sql_validator import SQLValidationError, validate_sql


def test_link_relevant_tables_revenue():
    tables = link_relevant_tables("What is total revenue by country?")
    assert "order_items" in tables
    assert "customers" in tables


def test_validate_select_ok():
    sql = validate_sql("SELECT id, name FROM customers LIMIT 10")
    assert "SELECT" in sql.upper()
    assert "LIMIT" in sql.upper()


def test_validate_blocks_delete():
    with pytest.raises(SQLValidationError):
        validate_sql("DELETE FROM customers")


def test_validate_blocks_multi_statement():
    with pytest.raises(SQLValidationError, match="single"):
        validate_sql("SELECT 1; SELECT 2")


def test_validate_unknown_table():
    with pytest.raises(SQLValidationError, match="not allowed"):
        validate_sql("SELECT * FROM secrets")
