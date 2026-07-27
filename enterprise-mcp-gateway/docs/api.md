# MCP API reference

All requests are JSON-RPC 2.0 (`Content-Type: application/json`) posted to
`POST /mcp` with `Authorization: Bearer <jwt>`. Optional `X-Tenant-Id` header
for multi-tenant deployments.

## initialize

```json
{"jsonrpc":"2.0","id":1,"method":"initialize"}
```

## tools/list

Returns every registered `ToolDefinition` (name, description, JSON-Schema
input, required RBAC role).

```json
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
```

## tools/call

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "github.search_repositories",
    "arguments": { "query": "org:your-org topic:payments", "perPage": 10 }
  }
}
```

### Available tools

| Tool | Description | Required role |
|---|---|---|
| `github.search_repositories` | Search GitHub repos | `GITHUB_READ` |
| `github.get_pull_request` | Fetch a PR's details | `GITHUB_READ` |
| `github.create_issue` | Create a GitHub issue | `GITHUB_WRITE` |
| `jira.search_issues` | JQL search | `JIRA_READ` |
| `jira.get_issue` | Fetch one issue by key | `JIRA_READ` |
| `servicenow.query_table` | Query a ServiceNow table | `SERVICENOW_READ` |
| `salesforce.query_soql` | Read-only SOQL query | `SALESFORCE_READ` |
| `snowflake.query` | Read-only SQL query | `SNOWFLAKE_READ` |
| `sharepoint.search_files` | Search a SharePoint site's files | `SHAREPOINT_READ` |
| `postgres.query_table` | Read an allow-listed table | `DB_READ` |
| `rest.invoke_endpoint` | Call a pre-registered internal REST API | `REST_INVOKE` |

## resources/list, resources/read

```json
{"jsonrpc":"2.0","id":4,"method":"resources/read","params":{"uri":"postgres://schema/employees"}}
```

## prompts/list, prompts/get

```json
{"jsonrpc":"2.0","id":5,"method":"prompts/get","params":{"name":"triage-ticket","arguments":{"ticketId":"ENG-1234"}}}
```

## Errors

Standard JSON-RPC error codes, plus an MCP-gateway-specific range:

| Code | Meaning |
|---|---|
| -32700 | Parse error |
| -32600 | Invalid request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| -32001 | Tool not found |
| -32002 | Tool execution error |
| -32003 | Unauthorized (RBAC denial) |
| -32004 | Rate limited |

Interactive OpenAPI/Swagger UI for the underlying HTTP surface is available
at `/swagger-ui.html` when the app is running.
