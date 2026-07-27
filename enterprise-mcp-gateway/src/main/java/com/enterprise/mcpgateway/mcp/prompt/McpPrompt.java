package com.enterprise.mcpgateway.mcp.prompt;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * A reusable, parameterized prompt template surfaced to MCP clients via
 * {@code prompts/list} and {@code prompts/get}, e.g. "triage-jira-ticket".
 */
public interface McpPrompt {
    PromptDefinition definition();

    String render(JsonNode arguments);
}
