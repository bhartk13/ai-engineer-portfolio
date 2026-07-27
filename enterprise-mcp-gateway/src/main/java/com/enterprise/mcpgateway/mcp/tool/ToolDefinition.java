package com.enterprise.mcpgateway.mcp.tool;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Describes a tool as advertised to MCP clients via {@code tools/list}.
 *
 * @param name        unique tool identifier, e.g. "github.search_repositories"
 * @param description human-readable description shown to the LLM
 * @param inputSchema JSON Schema (draft 2020-12) describing the expected arguments
 * @param requiredRole RBAC role required to invoke this tool (null = any authenticated caller)
 */
public record ToolDefinition(
        String name,
        String description,
        JsonNode inputSchema,
        String requiredRole
) {
}
