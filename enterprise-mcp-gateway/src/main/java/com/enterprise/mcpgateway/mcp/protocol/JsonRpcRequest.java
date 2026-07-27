package com.enterprise.mcpgateway.mcp.protocol;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * JSON-RPC 2.0 request envelope, per the MCP transport specification
 * (https://modelcontextprotocol.io/specification). MCP methods observed here
 * include: initialize, tools/list, tools/call, resources/list, resources/read,
 * prompts/list, prompts/get, ping.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record JsonRpcRequest(
        String jsonrpc,
        Object id,
        String method,
        JsonNode params
) {
    public JsonRpcRequest {
        if (jsonrpc == null) {
            jsonrpc = "2.0";
        }
    }

    public boolean isNotification() {
        return id == null;
    }
}
