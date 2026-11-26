"""Product Inventory: data layer and business rules.

Hierarchy:  product  ->  offering  ->  sku
  product   something you sell             e.g. "Cloud Storage"
  offering  a way it is packaged           e.g. "Business Plan"
  sku       a concrete, stock-kept unit    e.g. "CS-BIZ-1TB-ANNUAL", price, quantity

Everything that reads or writes the database goes through this file. The
REST API (main.py) and the AI agents (agents.py) both call these functions,
so the same validation applies no matter who is asking.
"""
import os
import sqlite3
from contextlib import contextmanager

SCHEMA = """
CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS offerings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    UNIQUE (product_id, name)
);
CREATE TABLE IF NOT EXISTS skus (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    offering_id INTEGER NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
    sku_code    TEXT NOT NULL UNIQUE,
    price       REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
    quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0)
);
"""

# One entry per level: its parent link, the fields a caller may set, which
# of those are required when creating, and the field that identifies a record
# (unique, ignoring case and surrounding spaces) plus the column it is unique
# within: None means unique across the whole table.
ENTITIES = {
    "products": {
        "parent": None,
        "fields": {"name": str, "description": str},
        "required": ["name"],
        "unique": ("name", None),
        "capitalize": ["name"],
    },
    "offerings": {
        "parent": ("products", "product_id"),
        "fields": {"name": str, "description": str},
        "required": ["name"],
        "unique": ("name", "product_id"),
        "capitalize": ["name"],
    },
    "skus": {
        "parent": ("offerings", "offering_id"),
        "fields": {"sku_code": str, "price": (int, float), "quantity": int},
        "required": ["sku_code"],
        "unique": ("sku_code", None),
    },
}


class NotFound(Exception):
    pass


class Conflict(Exception):
    pass


class Invalid(Exception):
    pass


@contextmanager
def connect():
    conn = sqlite3.connect(os.getenv("INVENTORY_DB", "inventory.db"))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")  # needed for ON DELETE CASCADE
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with connect() as conn:
        conn.executescript(SCHEMA)


def _spec(entity):
    if entity not in ENTITIES:
        raise Invalid(f"unknown entity '{entity}'; use one of {list(ENTITIES)}")
    return ENTITIES[entity]


def _clean(entity, data, creating):
    spec = _spec(entity)
    if not isinstance(data, dict):
        raise Invalid("data must be an object of field: value pairs")
    unknown = set(data) - set(spec["fields"])
    if unknown:
        raise Invalid(f"unknown fields {sorted(unknown)}; allowed: {sorted(spec['fields'])}")
    if creating:
        missing = [f for f in spec["required"] if f not in data]
        if missing:
            raise Invalid(f"missing required fields {missing}")
    elif not data:
        raise Invalid("no fields to update")
    cleaned = {}
    for field, value in data.items():
        expected = spec["fields"][field]
        if isinstance(value, bool) or not isinstance(value, expected):
            raise Invalid(f"'{field}' has the wrong type")
        if isinstance(value, str):
            value = value.strip()
            if field in spec["required"] and not value:
                raise Invalid(f"'{field}' must not be empty")
            if field in spec.get("capitalize", ()):
                value = _capitalize_words(value)
        elif value < 0:
            raise Invalid(f"'{field}' must not be negative")
        cleaned[field] = value
    return cleaned


def _capitalize_words(text):
    """'cloud  storage' -> 'Cloud Storage'. Only the first letter of each word
    is changed; the rest of the word is kept as typed ('PRO max' -> 'PRO Max')."""
    return " ".join(w[:1].upper() + w[1:] for w in text.split())


def _label(entity):
    """'a product', 'an offering', 'a sku': for error messages."""
    return {"products": "a product", "offerings": "an offering", "skus": "a sku"}[entity]


def _check_unique(conn, entity, row, exclude_id=None):
    """Reject a record whose identifying field matches an existing one,
    ignoring case and surrounding spaces. Offerings are compared within
    their product; products and skus across the whole table."""
    field, scope = _spec(entity)["unique"]
    if field not in row:
        return
    sql = f"SELECT id, {field} FROM {entity} WHERE lower(trim({field})) = lower(trim(?))"
    params = [row[field]]
    if scope:
        sql += f" AND {scope} = ?"
        params.append(row[scope])
    if exclude_id is not None:
        sql += " AND id != ?"
        params.append(exclude_id)
    hit = conn.execute(sql, params).fetchone()
    if hit:
        where = " in this product" if scope else ""
        raise Conflict(f"{_label(entity)} with {field} '{hit[field]}' already exists{where} (id {hit['id']})")


def _run(conn, sql, params):
    try:
        return conn.execute(sql, params)
    except sqlite3.IntegrityError as exc:
        raise Conflict(f"already exists or breaks a rule: {exc}") from None


# ---------- CRUD ----------

def _insert(conn, entity, data, parent_id=None):
    """Validate and insert one record on an open connection; returns its id.
    Shared by create() and create_tree() so both apply the same rules."""
    spec = _spec(entity)
    row = dict(_clean(entity, data, creating=True))
    if spec["parent"]:
        parent_table, parent_column = spec["parent"]
        if parent_id is None:
            raise Invalid(f"{entity} need a parent_id (an id from {parent_table})")
        if not conn.execute(f"SELECT 1 FROM {parent_table} WHERE id = ?", (parent_id,)).fetchone():
            raise NotFound(f"no {parent_table} record with id {parent_id}")
        row[parent_column] = parent_id
    _check_unique(conn, entity, row)
    columns = ", ".join(row)
    marks = ", ".join("?" for _ in row)
    cursor = _run(conn, f"INSERT INTO {entity} ({columns}) VALUES ({marks})", list(row.values()))
    return cursor.lastrowid


def create(entity, data, parent_id=None):
    with connect() as conn:
        new_id = _insert(conn, entity, data, parent_id)
    return get(entity, new_id)


def create_tree(data):
    """Create a product with its offerings and their SKUs in one transaction.

    data = {"name": ..., "description": ...,
            "offerings": [{"name": ..., "description": ...,
                           "skus": [{"sku_code": ..., "price": ..., "quantity": ...}]}]}

    All-or-nothing: if any record is invalid or duplicates an existing one
    (or another record in the same request), nothing is saved and the error
    names the record that failed. Returns the new product as tree() does."""
    with connect() as conn:
        product_id = _insert_tree(conn, data)
    return tree(product_id)


def create_trees(items):
    """create_tree for a list of products, all in one transaction: if any
    product fails, none of them are saved. Errors are prefixed with the
    index of the failing product, e.g. '[1].offerings[0]: ...'."""
    if not isinstance(items, list):
        raise Invalid("data must be a list of products")
    with connect() as conn:
        ids = []
        for i, item in enumerate(items):
            try:
                ids.append(_insert_tree(conn, item))
            except (Invalid, Conflict, NotFound) as exc:
                raise type(exc)(f"[{i}]: {exc}") from None
    return [tree(i) for i in ids]


def _insert_tree(conn, data):
    """Insert one product tree on an open connection; returns the product id."""
    if not isinstance(data, dict):
        raise Invalid("data must be an object describing a product")
    product = dict(data)
    offerings = product.pop("offerings", [])
    if not isinstance(offerings, list):
        raise Invalid("'offerings' must be a list")
    product_id = _insert(conn, "products", product)
    for i, offering in enumerate(offerings):
        if not isinstance(offering, dict):
            raise Invalid(f"offerings[{i}] must be an object")
        offering = dict(offering)
        skus = offering.pop("skus", [])
        if not isinstance(skus, list):
            raise Invalid(f"offerings[{i}].skus must be a list")
        try:
            offering_id = _insert(conn, "offerings", offering, product_id)
        except (Invalid, Conflict, NotFound) as exc:
            raise type(exc)(f"offerings[{i}]: {exc}") from None
        for j, sku in enumerate(skus):
            if not isinstance(sku, dict):
                raise Invalid(f"offerings[{i}].skus[{j}] must be an object")
            try:
                _insert(conn, "skus", sku, offering_id)
            except (Invalid, Conflict, NotFound) as exc:
                raise type(exc)(f"offerings[{i}].skus[{j}]: {exc}") from None
    return product_id


def get(entity, record_id):
    _spec(entity)
    with connect() as conn:
        row = conn.execute(f"SELECT * FROM {entity} WHERE id = ?", (record_id,)).fetchone()
    if row is None:
        raise NotFound(f"no {entity} record with id {record_id}")
    return dict(row)


def list_all(entity, parent_id=None):
    spec = _spec(entity)
    sql, params = f"SELECT * FROM {entity}", []
    if parent_id is not None and spec["parent"]:
        sql += f" WHERE {spec['parent'][1]} = ?"
        params.append(parent_id)
    with connect() as conn:
        return [dict(r) for r in conn.execute(sql + " ORDER BY id", params)]


def update(entity, record_id, data):
    changes = _clean(entity, data, creating=False)
    current = get(entity, record_id)  # raises NotFound
    assignments = ", ".join(f"{field} = ?" for field in changes)
    with connect() as conn:
        _check_unique(conn, entity, {**current, **changes}, exclude_id=record_id)
        _run(conn, f"UPDATE {entity} SET {assignments} WHERE id = ?", [*changes.values(), record_id])
    return get(entity, record_id)


def delete(entity, record_id):
    """Delete a record. Children are removed too (cascade)."""
    get(entity, record_id)  # raises NotFound
    with connect() as conn:
        conn.execute(f"DELETE FROM {entity} WHERE id = ?", (record_id,))


def find(entity, value, parent_id=None):
    """Look a record up by its identifying field (product name, offering
    name, or sku code), ignoring case and surrounding spaces. It must match
    exactly one record: none raises NotFound, several raises Conflict, so a
    caller can never act on the wrong record by name alone. Offerings with
    the same name under different products need parent_id."""
    field, scope = _spec(entity)["unique"]
    if not isinstance(value, str) or not value.strip():
        raise Invalid(f"{field} must be a non-empty string")
    sql = f"SELECT * FROM {entity} WHERE lower(trim({field})) = lower(trim(?))"
    params = [value]
    if scope and parent_id is not None:
        sql += f" AND {scope} = ?"
        params.append(parent_id)
    with connect() as conn:
        rows = [dict(r) for r in conn.execute(sql + " ORDER BY id", params)]
    if not rows:
        raise NotFound(f"no {_label(entity)[2:]} with {field} '{value.strip()}'")
    if len(rows) > 1:
        ids = ", ".join(str(r["id"]) for r in rows)
        raise Conflict(f"{len(rows)} {entity} match {field} '{value.strip()}' (ids {ids}); "
                       f"give a parent_id or use the id directly")
    return rows[0]


# ---------- hierarchy views ----------

def tree(product_id):
    """A product with its offerings, each with its SKUs."""
    product = get("products", product_id)
    product["offerings"] = list_all("offerings", product_id)
    for offering in product["offerings"]:
        offering["skus"] = list_all("skus", offering["id"])
    return product


def low_stock(threshold=10):
    """SKUs at or below the threshold, with their offering and product names."""
    sql = """
        SELECT s.id, s.sku_code, s.quantity, s.price,
               o.name AS offering, p.name AS product
        FROM skus s
        JOIN offerings o ON o.id = s.offering_id
        JOIN products p ON p.id = o.product_id
        WHERE s.quantity <= ?
        ORDER BY s.quantity, s.sku_code
    """
    with connect() as conn:
        return [dict(r) for r in conn.execute(sql, (threshold,))]
