# Security model

## Authentication

Every route under `/mcp/**` requires a valid OAuth2 bearer JWT. In production,
set:

```
MCP_JWK_SET_URI=https://your-idp.example.com/.well-known/jwks.json
```

and Spring Security validates tokens against your IdP's public keys — this
works with any standards-compliant IdP (Okta, Azure AD, Auth0, Keycloak, etc.).

## Local development / CI

Standing up a real IdP for local dev is impractical, so `JwtDecoderConfig`
falls back to HS256 local-secret validation when `MCP_JWK_SET_URI` is unset:

```
MCP_LOCAL_HMAC_SECRET=some-random-32-plus-byte-string
```

**Never set `MCP_LOCAL_HMAC_SECRET` in a shared or production environment** —
it means anyone who knows the secret can mint valid tokens.

To mint a local dev token for testing (requires `pip install pyjwt` or similar):

```python
import jwt, time
token = jwt.encode(
    {"sub": "local-dev-user", "roles": ["GITHUB_READ", "DB_READ"],
     "iat": int(time.time()), "exp": int(time.time()) + 3600},
    "local-dev-secret-change-me-please-32-bytes-min",
    algorithm="HS256",
)
print(token)
```

## Authorization (RBAC)

Each `ToolDefinition` declares a `requiredRole` (e.g. `GITHUB_READ`,
`GITHUB_WRITE`, `SALESFORCE_READ`). Roles are extracted from the JWT's `roles`
claim (or Keycloak-style `realm_access.roles`) by `JwtRoleConverter` and
checked by `McpDispatcher` before any tool executes. A caller with the `ADMIN`
role bypasses individual role checks (`ToolExecutionContext.hasRole`).

Suggested role scheme:
| Role | Grants |
|---|---|
| `GITHUB_READ` / `GITHUB_WRITE` | read-only vs. mutating GitHub tools |
| `JIRA_READ` | Jira search/get |
| `SERVICENOW_READ` | ServiceNow table queries |
| `SALESFORCE_READ` | SOQL queries |
| `SNOWFLAKE_READ` | Snowflake SQL |
| `SHAREPOINT_READ` | SharePoint file search |
| `DB_READ` | PostgreSQL allow-listed table reads |
| `REST_INVOKE` | generic REST connector |
| `ADMIN` | bypasses all of the above |

## Audit logging

Every tool invocation (success, error, or denial) is recorded asynchronously
to the `audit_log` Postgres table and published to the
`mcp-gateway.audit-events` Kafka topic for downstream SIEM ingestion.
`AuditService` redacts any argument field whose name contains `password`,
`secret`, `token`, or `apikey`/`api_key` before persisting — see
`AuditServiceTest#redactsSensitiveFieldsBeforePersisting`.

## Secrets

No connector credential (GitHub token, Jira API token, Salesforce access
token, etc.) should ever be committed to source control. In the Helm chart,
they're expected to arrive via `envFromSecretRefs` pointing at a Kubernetes
`Secret` (populate that Secret via your platform's usual mechanism — External
Secrets Operator, Sealed Secrets, or CI injecting from a vault at deploy time).
