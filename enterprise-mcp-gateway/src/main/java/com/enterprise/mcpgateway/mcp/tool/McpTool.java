package com.enterprise.mcpgateway.mcp.tool;

import com.fasterxml.jackson.databind.JsonNode;
import reactor.core.publisher.Mono;

/**
 * Contract implemented by every connector-exposed tool.
 *
 * <p>Implementations are stateless, thread-safe Spring beans auto-discovered
 * and registered by {@link ToolRegistry}. Each tool is responsible for:
 * <ul>
 *   <li>declaring its {@link ToolDefinition} (name, JSON-schema, required RBAC role)</li>
 *   <li>validating its own arguments beyond generic schema validation</li>
 *   <li>calling out to the underlying enterprise system and mapping errors to {@link ToolResult}</li>
 * </ul>
 * Cross-cutting concerns (auth, audit, caching, rate limiting, tracing) are applied by the
 * gateway dispatcher, not by individual tools.</p>
 */
public interface McpTool {

    ToolDefinition definition();

    Mono<ToolResult> execute(JsonNode arguments, ToolExecutionContext context);
}
