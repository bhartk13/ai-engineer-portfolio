-- Initial schema for the Enterprise MCP Gateway.
-- Applied automatically at startup by Flyway (spring.flyway.enabled=true).

CREATE TABLE IF NOT EXISTS audit_log (
    id              VARCHAR(64) PRIMARY KEY,
    principal       VARCHAR(255) NOT NULL,
    tenant_id       VARCHAR(255),
    tool_name       VARCHAR(255) NOT NULL,
    correlation_id  VARCHAR(64),
    outcome         VARCHAR(20) NOT NULL,
    arguments_json  TEXT,
    result_summary  TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_principal ON audit_log (principal);
CREATE INDEX IF NOT EXISTS idx_audit_tool_name ON audit_log (tool_name);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log (created_at);

-- Example demo tables for the postgres.query_table MCP tool (safe to drop in real deployments).
CREATE TABLE IF NOT EXISTS departments (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
    id            SERIAL PRIMARY KEY,
    full_name     VARCHAR(200) NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    title         VARCHAR(150),
    hired_at      DATE
);
