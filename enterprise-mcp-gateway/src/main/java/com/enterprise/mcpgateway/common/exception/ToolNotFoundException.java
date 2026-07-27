package com.enterprise.mcpgateway.common.exception;

public class ToolNotFoundException extends RuntimeException {
    private final String toolName;

    public ToolNotFoundException(String toolName) {
        super("No MCP tool registered with name: " + toolName);
        this.toolName = toolName;
    }

    public String getToolName() {
        return toolName;
    }
}
