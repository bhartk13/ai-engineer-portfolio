package com.enterprise.mcpgateway.mcp.resource;

import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import reactor.core.publisher.Mono;

/**
 * An MCP resource exposes read-only, addressable enterprise data (e.g. a Jira
 * project's issue list, a Snowflake table schema) via a URI, distinct from
 * {@code McpTool} which represents an invocable action.
 */
public interface McpResource {

    ResourceDefinition definition();

    boolean supports(String uri);

    Mono<ResourceContent> read(String uri, ToolExecutionContext context);
}
