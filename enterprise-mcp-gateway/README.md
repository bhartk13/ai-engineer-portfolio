# Enterprise MCP Gateway

A production-grade Java/Spring Boot implementation of the [Model Context Protocol](https://modelcontextprotocol.io) (MCP) that lets LLMs and AI agents securely interact with enterprise systems — GitHub, Jira, ServiceNow, Salesforce, Snowflake, SharePoint, PostgreSQL, and internal REST APIs — through a single, standardized JSON-RPC 2.0 interface.

```
                +-----------------------+
                |      AI Agent         |
                | Claude / GPT / Gemini |
                +----------+------------+
                           |
                    MCP (JSON-RPC 2.0)
                           |
               +-----------v------------+
               | Enterprise MCP Gateway |
               |  auth · audit · cache  |
               |  rate-limit · metrics  |
               +-----------+------------+
                           |
        --------------------------------------------------------
        |        |        |        |         |          |      |
     GitHub   Jira   ServiceNow  Salesforce  Snowflake  SharePoint  PostgreSQL / REST
```

## Status of this repository

This is a genuinely working reference implementation, not a mockup — but it's honest about what "working" means for a project this size:

| Area | Status |
|---|---|
| MCP protocol core (JSON-RPC 2.0: `initialize`, `tools/list`, `tools/call`, `resources/*`, `prompts/*`) | ✅ Fully implemented |
| GitHub connector (search repos, get PR, create issue) | ✅ Fully implemented, tested against a local mock server |
| PostgreSQL connector (allow-listed table reads + schema resource) | ✅ Fully implemented, tested against a real in-memory H2 database |
| Generic REST connector (config-driven, allow-listed) | ✅ Fully implemented |
| Jira, ServiceNow, Salesforce, Snowflake, SharePoint connectors | ✅ Real request/response shapes against each vendor's actual API — needs your tenant credentials in `application.yml`/env vars to go live |
| Security (OAuth2/JWT resource server, RBAC per tool) | ✅ Implemented |
| Caching (Redis, write-tools excluded), audit logging (Postgres + Kafka, secret redaction), rate limiting (resilience4j) | ✅ Implemented |
| Observability (Micrometer/Prometheus, OpenTelemetry tracing, Grafana dashboard scaffold) | ✅ Implemented |
| Docker / docker-compose (full local stack) | ✅ Implemented |
| Helm chart, Terraform (AWS reference infra) | ✅ Implemented, **not** run through `helm lint`/`terraform validate` locally — see note below |
| Unit & slice test suite | ✅ ~40 tests across the dispatcher, registry, cache, audit, security, and connectors |

**One important caveat:** this repo was built in a sandboxed environment without access to Maven Central, so `mvn test` has not actually been executed here to confirm a green build. The code has been written carefully and reviewed by hand, and the [CI workflow](.github/workflows/ci.yml) will run the full build + test + Docker + Helm-lint + Terraform-validate pipeline the moment you push to GitHub, where it has full internet access. Treat the first CI run on `main` as the real verification step — don't assume it's clean without checking.

## Quick start

```bash
git clone <your-repo-url>
cd enterprise-mcp-gateway
docker compose -f docker/docker-compose.yml up --build
```

This brings up Postgres, Redis, Kafka, Prometheus, Grafana, and the gateway itself on **`localhost:8080`** (there is no service on port 8000). Postgres is exposed on host port **5433** to avoid clashing with a local PostgreSQL on 5432. See [Testing the API](#testing-the-api) below for a full walkthrough.

## Testing the API

The gateway is a **backend API**, not a web UI — browsing `http://localhost:8080/` returns `401 Unauthorized`. All MCP traffic goes through a single endpoint: `POST http://localhost:8080/mcp`.

### Local stack URLs

| Service | URL |
|---|---|
| MCP Gateway (API) | http://localhost:8080 |
| Health (no auth) | http://localhost:8080/actuator/health/liveness |
| OpenAPI spec (no auth) | http://localhost:8080/v3/api-docs |
| Prometheus metrics (no auth) | http://localhost:8080/actuator/prometheus |
| Grafana | http://localhost:3000 (`admin` / `admin`) |
| Prometheus UI | http://localhost:9090 |

### Step 1 — Mint a dev JWT

MCP requests require a bearer token. Docker-compose sets `MCP_LOCAL_HMAC_SECRET` to `local-dev-secret-change-me-please-32-bytes-min` (dev only — see [docs/security.md](docs/security.md)).

**Option A — Python stdlib (no install):**

```bash
export TOKEN=$(python3 - <<'EOF'
import base64, hashlib, hmac, json, time

def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

secret = b"local-dev-secret-change-me-please-32-bytes-min"
header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(',', ':')).encode())
payload = b64url(json.dumps({
    "sub": "local-dev-user",
    "roles": ["ADMIN"],
    "iat": int(time.time()),
    "exp": int(time.time()) + 3600,
}, separators=(',', ':')).encode())
sig = b64url(hmac.new(secret, f"{header}.{payload}".encode(), hashlib.sha256).digest())
print(f"{header}.{payload}.{sig}")
EOF
)
```

**Option B — PyJWT:** `pip3 install PyJWT`, then use the snippet in [docs/security.md](docs/security.md).

Use `"roles": ["ADMIN"]` for easy testing, or specific roles (`DB_READ`, `GITHUB_READ`, etc.) to exercise RBAC.

### Step 2 — Sanity check (no auth)

```bash
curl http://localhost:8080/actuator/health/liveness
# {"status":"UP"}
```

### Step 3 — MCP protocol calls

Helper (optional):

```bash
mcp() {
  curl -s -X POST http://localhost:8080/mcp \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$1" | python3 -m json.tool
}
```

**Handshake and discovery:**

```bash
mcp '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
mcp '{"jsonrpc":"2.0","id":2,"method":"ping"}'
mcp '{"jsonrpc":"2.0","id":3,"method":"tools/list"}'
mcp '{"jsonrpc":"2.0","id":4,"method":"resources/list"}'
mcp '{"jsonrpc":"2.0","id":5,"method":"prompts/list"}'
```

Or without the helper:

```bash
curl -s -X POST http://localhost:8080/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | python3 -m json.tool
```

### Step 4 — Tools that work out of the box

Flyway creates demo tables `employees` and `departments` on startup. The Postgres connector works immediately with docker-compose (requires `DB_READ` or `ADMIN` role):

```bash
mcp '{
  "jsonrpc":"2.0","id":10,"method":"tools/call",
  "params":{
    "name":"postgres.query_table",
    "arguments":{"table":"employees","limit":10}
  }
}'

mcp '{
  "jsonrpc":"2.0","id":11,"method":"tools/call",
  "params":{
    "name":"postgres.query_table",
    "arguments":{"table":"departments","limit":10}
  }
}'
```

**Prompts:**

```bash
mcp '{
  "jsonrpc":"2.0","id":20,"method":"prompts/get",
  "params":{
    "name":"triage-ticket",
    "arguments":{"ticketId":"ENG-1234"}
  }
}'
```

**Resources (schema metadata):**

```bash
mcp '{
  "jsonrpc":"2.0","id":21,"method":"resources/read",
  "params":{"uri":"postgres://schema/employees"}
}'
```

### Step 5 — Tools that need external credentials

These appear in `tools/list` but require connector env vars in `docker/docker-compose.yml` (or `application.yml`) before they can call live APIs:

| Tool | Required role | Key env vars |
|---|---|---|
| `github.search_repositories` | `GITHUB_READ` | `GITHUB_CONNECTOR_ENABLED=true`, `GITHUB_TOKEN` |
| `github.get_pull_request` | `GITHUB_READ` | same |
| `github.create_issue` | `GITHUB_WRITE` | same |
| `jira.search_issues` | `JIRA_READ` | `JIRA_CONNECTOR_ENABLED=true`, `JIRA_BASE_URL`, `JIRA_USERNAME`, `JIRA_API_TOKEN` |
| `jira.get_issue` | `JIRA_READ` | same |
| `servicenow.query_table` | `SERVICENOW_READ` | `SERVICENOW_*` |
| `salesforce.query_soql` | `SALESFORCE_READ` | `SALESFORCE_*` |
| `snowflake.query` | `SNOWFLAKE_READ` | `SNOWFLAKE_*` |
| `sharepoint.search_files` | `SHAREPOINT_READ` | `SHAREPOINT_*` |
| `rest.invoke_endpoint` | `REST_INVOKE` | REST endpoints in `application.yml` |

Example GitHub search (after enabling the connector):

```bash
mcp '{
  "jsonrpc":"2.0","id":30,"method":"tools/call",
  "params":{
    "name":"github.search_repositories",
    "arguments":{"query":"org:spring-projects","perPage":5}
  }
}'
```

See [docs/api.md](docs/api.md) for the full MCP API reference.

### Step 6 — Error and security checks

```bash
# No token → 401
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Unknown method → JSON-RPC -32601
mcp '{"jsonrpc":"2.0","id":99,"method":"does/not/exist"}'

# Missing tool name → -32602
mcp '{"jsonrpc":"2.0","id":100,"method":"tools/call","params":{}}'
```

Mint a token with `"roles": []` and call `postgres.query_table` to verify RBAC denial (`-32003`). Send 100+ requests within 60 seconds to hit the rate limit (`-32004`).

### Suggested test order

1. `GET /actuator/health/liveness` — confirm the gateway is up
2. `POST /mcp` → `initialize` — MCP handshake
3. `tools/list` — see all registered tools
4. `postgres.query_table` on `employees` — first real tool call
5. `resources/read` for `postgres://schema/employees`
6. `prompts/get` for `triage-ticket`
7. Enable one external connector (GitHub is the easiest) and test `tools/call`

## Running tests locally

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)   # Java 21 required
mvn test
```

Requires network access to Maven Central (or an internal mirror configured in `~/.m2/settings.xml`). Tests use a mix of pure unit tests (Mockito), an in-memory H2 database for the PostgreSQL connector, and an in-process MockWebServer for the GitHub connector — no external services required.

## Repository structure

```
enterprise-mcp-gateway/
├── docs/                      architecture, security, deployment, API docs
├── src/main/java/.../
│   ├── mcp/                   protocol core: JSON-RPC types, dispatcher, tool/resource/prompt registries
│   ├── connector/              one package per enterprise system
│   ├── security/                OAuth2/JWT resource server, RBAC, rate limiting
│   ├── cache/                   Redis-backed tool-result cache
│   ├── audit/                   audit log entity/repo/service (Postgres + Kafka)
│   ├── metrics/                 Micrometer counters
│   └── config/                  Spring configuration (JWT decoder, WebClient, Redis, Kafka, OpenAPI)
├── src/test/java/...            unit & slice tests mirroring the above packages
├── docker/                      Dockerfile, docker-compose.yml, Prometheus config
├── helm/enterprise-mcp-gateway/ Helm chart (Deployment, Service, HPA, PDB, Ingress)
├── terraform/                   reference AWS infra (VPC, RDS, ElastiCache) + optional Helm release
└── .github/workflows/ci.yml     build, test, Docker build, helm lint, terraform validate
```

## Adding a new tool

1. Implement `McpTool` (see `connector/github/SearchRepositoriesTool.java` for a complete example).
2. Declare its `ToolDefinition` — name, description, JSON-Schema input, required RBAC role — using `SchemaBuilder`.
3. Register it as a `@Component`; `ToolRegistry` auto-discovers all `McpTool` beans at startup.
4. Write a test. If the tool calls an external HTTP API, prefer an in-process `MockWebServer` over mocking `WebClient` directly, so the real request/response wiring is exercised (see `SearchRepositoriesToolTest`).

## Security model

Every `/mcp/**` request must carry a valid OAuth2/JWT bearer token. Roles are extracted from the token's `roles` claim (or Keycloak-style `realm_access.roles`) and checked per-tool against `ToolDefinition.requiredRole()` before the tool executes — see [docs/security.md](docs/security.md) for the full model, including the local-dev HMAC fallback and how to point at a real IdP (Okta, Azure AD, Auth0, Keycloak).

## Deploying

- **Docker**: `docker build -f docker/Dockerfile -t enterprise-mcp-gateway .`
- **Kubernetes**: `helm install gateway helm/enterprise-mcp-gateway -f your-values.yaml`
- **AWS infra**: `cd terraform && terraform init && terraform plan`

See [docs/deployment.md](docs/deployment.md) for details, including how to wire the Helm chart's image tag to your CI-published image.

## Pushing this to GitHub

```bash
cd enterprise-mcp-gateway
git init
git add .
git commit -m "Initial commit: Enterprise MCP Gateway"
git branch -M main
git remote add origin https://github.com/<your-org>/enterprise-mcp-gateway.git
git push -u origin main
```

CI will run automatically on push via `.github/workflows/ci.yml`.

## License

Add your organization's license here before publishing (e.g. Apache-2.0, or a proprietary internal license) — none is included by default.
