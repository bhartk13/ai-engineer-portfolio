package com.enterprise.mcpgateway.mcp.protocol;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record JsonRpcResponse(
        String jsonrpc,
        Object id,
        Object result,
        JsonRpcError error
) {
    public static JsonRpcResponse success(Object id, Object result) {
        return new JsonRpcResponse("2.0", id, result, null);
    }

    public static JsonRpcResponse failure(Object id, JsonRpcError error) {
        return new JsonRpcResponse("2.0", id, null, error);
    }

    public record JsonRpcError(int code, String message, Object data) {
        // Standard JSON-RPC error codes
        public static final int PARSE_ERROR = -32700;
        public static final int INVALID_REQUEST = -32600;
        public static final int METHOD_NOT_FOUND = -32601;
        public static final int INVALID_PARAMS = -32602;
        public static final int INTERNAL_ERROR = -32603;
        // MCP-specific range
        public static final int TOOL_NOT_FOUND = -32001;
        public static final int TOOL_EXECUTION_ERROR = -32002;
        public static final int UNAUTHORIZED = -32003;
        public static final int RATE_LIMITED = -32004;

        public static JsonRpcError of(int code, String message) {
            return new JsonRpcError(code, message, null);
        }
    }
}
