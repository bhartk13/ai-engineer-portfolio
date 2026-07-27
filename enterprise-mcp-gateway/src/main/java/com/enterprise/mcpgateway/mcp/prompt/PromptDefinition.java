package com.enterprise.mcpgateway.mcp.prompt;

import java.util.List;

public record PromptDefinition(String name, String description, List<PromptArgument> arguments) {
    public record PromptArgument(String name, String description, boolean required) {}
}
