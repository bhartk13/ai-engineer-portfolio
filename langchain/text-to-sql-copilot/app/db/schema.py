"""Sample enterprise sales schema — customers, products, orders."""

SCHEMA_DDL = """
CREATE TABLE IF NOT EXISTS customers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    country     VARCHAR(50) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    category    VARCHAR(50) NOT NULL,
    price       NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id           SERIAL PRIMARY KEY,
    customer_id  INTEGER NOT NULL REFERENCES customers(id),
    order_date   DATE NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'completed'
);

CREATE TABLE IF NOT EXISTS order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id),
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(10, 2) NOT NULL
);
"""

SEED_SQL = """
INSERT INTO customers (name, email, country) VALUES
    ('Acme Corp', 'contact@acme.com', 'USA'),
    ('Globex Ltd', 'info@globex.com', 'UK'),
    ('Initech', 'hello@initech.com', 'USA'),
    ('Umbrella Co', 'sales@umbrella.com', 'Japan'),
    ('Stark Industries', 'orders@stark.com', 'USA')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (name, category, price) VALUES
    ('Laptop Pro', 'Electronics', 1299.99),
    ('Wireless Mouse', 'Electronics', 29.99),
    ('Office Chair', 'Furniture', 349.00),
    ('Standing Desk', 'Furniture', 599.00),
    ('Cloud Storage 1TB', 'Software', 99.99);

INSERT INTO orders (customer_id, order_date, status) VALUES
    (1, '2024-01-15', 'completed'),
    (1, '2024-03-22', 'completed'),
    (2, '2024-02-10', 'completed'),
    (3, '2024-04-05', 'completed'),
    (3, '2024-06-18', 'completed'),
    (4, '2024-05-01', 'completed'),
    (5, '2024-07-12', 'completed');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    (1, 1, 2, 1299.99),
    (1, 2, 2, 29.99),
    (2, 3, 5, 349.00),
    (3, 1, 1, 1299.99),
    (3, 5, 3, 99.99),
    (4, 4, 2, 599.00),
    (5, 2, 10, 29.99),
    (5, 5, 1, 99.99),
    (6, 1, 3, 1299.99),
    (7, 3, 4, 349.00);
"""

# Table metadata for schema linking (no LLM cost)
TABLE_CATALOG = {
    "customers": {
        "description": "Customer accounts with name, email, country",
        "columns": ["id", "name", "email", "country", "created_at"],
        "keywords": ["customer", "client", "buyer", "email", "country", "user"],
    },
    "products": {
        "description": "Product catalog with name, category, price",
        "columns": ["id", "name", "category", "price"],
        "keywords": ["product", "item", "catalog", "category", "price"],
    },
    "orders": {
        "description": "Customer orders with date and status",
        "columns": ["id", "customer_id", "order_date", "status"],
        "keywords": ["order", "purchase", "transaction", "date", "status"],
    },
    "order_items": {
        "description": "Line items per order: product, quantity, unit price",
        "columns": ["id", "order_id", "product_id", "quantity", "unit_price"],
        "keywords": ["revenue", "sales", "quantity", "line item", "total", "amount", "sold"],
    },
}

RELATIONSHIPS = """
- orders.customer_id -> customers.id
- order_items.order_id -> orders.id
- order_items.product_id -> products.id
- Revenue = SUM(order_items.quantity * order_items.unit_price)
"""
