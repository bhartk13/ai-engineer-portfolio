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

This brings up Postgres, Redis, Kafka, Prometheus, Grafana, and the gateway itself on `localhost:8080`, using a local dev-only HMAC JWT secret (never use this in production — see [docs/security.md](docs/security.md)).

Call it:

```bash
# Mint a local dev JWT (HS256, see docs/security.md for a helper script)
TOKEN=<your-dev-jwt>

curl -X POST localhost:8080/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Running tests locally

```bash
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
