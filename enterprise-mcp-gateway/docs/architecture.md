# Architecture

## Request flow

1. An AI agent (Claude, GPT, Gemini, or any MCP-speaking client) sends a JSON-RPC 2.0
   request to `POST /mcp` with an `Authorization: Bearer <jwt>` header.
2. Spring Security's reactive OAuth2 resource server filter validates the JWT
   signature and expiry against the configured JWKS endpoint (or, in dev, a
   local HMAC secret).
3. `RateLimitingWebFilter` checks a per-principal token bucket (resilience4j);
   requests over the limit get `429 Too Many Requests` before reaching the dispatcher.
4. `McpController` builds a `ToolExecutionContext` (principal, roles, tenant,
   correlation id) from the validated JWT and hands the request to `McpDispatcher`.
5. `McpDispatcher` routes by JSON-RPC `method`:
   - `initialize` / `ping` — handshake, no downstream calls
   - `tools/list`, `resources/list`, `prompts/list` — return registered definitions
   - `tools/call` — the main path:
     a. look up the `McpTool` bean by name in `ToolRegistry`
     b. check `ToolExecutionContext.hasRole(tool.definition().requiredRole())`; deny + audit if not authorized
     c. check `ToolResultCache` for a fresh cached result (skipped for write tools)
     d. on a cache miss, call `tool.execute(arguments, context)`, which is where
        connector-specific logic (HTTP calls to GitHub/Jira/etc., or a bounded
        SQL query) happens
     e. cache the result (if eligible), record an audit entry (async, non-blocking),
        record a Micrometer timer, and return the JSON-RPC response

## Why a hand-rolled MCP layer instead of a library?

`spring-ai-mcp` exists but its artifact coordinates and API shape have moved
across milestone releases. Rather than reference a version that might not
resolve or might have a different API surface by the time you build this,
the protocol layer here is a small, dependency-free implementation of the
MCP JSON-RPC 2.0 spec (`initialize`, `tools/*`, `resources/*`, `prompts/*`).
It's ~300 lines total (`mcp/protocol/`, `mcp/tool/`, `mcp/resource/`,
`mcp/prompt/`) and is a reasonable target to swap for `spring-ai-mcp` later
if you'd rather depend on the upstream library — the `McpTool`/`McpResource`/
`McpPrompt` interfaces are intentionally the natural seam for that.

## Cross-cutting concerns live in the dispatcher, not the tools

Individual `McpTool` implementations should only know about their own
connector's request/response shape. Authorization, caching, auditing, and
metrics are applied once, centrally, in `McpDispatcher` — this is what keeps
adding a new connector cheap: implement `McpTool`, register it as a Spring
bean, and every cross-cutting concern is automatically applied.

## Write-tool cache safety

`ToolResultCache` never caches a result for a tool whose name starts with a
mutating verb (`create_`, `update_`, `delete_`, `post_`, `put_`, `patch_`,
`execute_write`). The tool name is kept in plaintext as a cache-key segment
specifically so this check is enforceable — see the comment in
`ToolResultCache.buildKey`.

## SQL/query safety

Neither the PostgreSQL connector nor the Snowflake connector accept raw,
caller-composed SQL strings without guardrails:
- `postgres.query_table` only accepts a **table name**, checked against an
  admin-configured allow-list; there is no free-text WHERE/JOIN/etc.
- `snowflake.query` accepts a SQL string but rejects anything that isn't a
  `SELECT`/`WITH` statement, as defense-in-depth on top of whatever read-only
  role the configured Snowflake service user is scoped to.
