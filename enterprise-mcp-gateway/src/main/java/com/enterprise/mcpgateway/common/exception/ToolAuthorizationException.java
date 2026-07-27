package com.enterprise.mcpgateway.common.exception;

public class ToolAuthorizationException extends RuntimeException {
    public ToolAuthorizationException(String toolName, String requiredRole) {
        super("Caller lacks required role '" + requiredRole + "' for tool: " + toolName);
    }
}
