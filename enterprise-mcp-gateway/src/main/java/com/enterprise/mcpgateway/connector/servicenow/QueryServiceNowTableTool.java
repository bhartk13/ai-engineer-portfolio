package com.enterprise.mcpgateway.connector.servicenow;

import com.enterprise.mcpgateway.common.exception.ConnectorException;
import com.enterprise.mcpgateway.connector.common.EnterpriseConnectorSupport;
import com.enterprise.mcpgateway.connector.common.SchemaBuilder;
import com.enterprise.mcpgateway.mcp.tool.McpTool;
import com.enterprise.mcpgateway.mcp.tool.ToolDefinition;
import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import com.enterprise.mcpgateway.mcp.tool.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * Queries a ServiceNow table (e.g. {@code incident}, {@code change_request}) via
 * the Table API ({@code GET /api/now/table/{tableName}}), using ServiceNow's
 * encoded-query syntax. Requires {@code mcp.gateway.connectors.servicenow.*} to
 * point at a real instance to go live.
 */
@Component
@EnableConfigurationProperties(ServiceNowConnectorProperties.class)
public class QueryServiceNowTableTool implements McpTool {

    private static final ToolDefinition DEFINITION = new ToolDefinition(
            "servicenow.query_table",
            "Query a ServiceNow table (incident, change_request, problem, etc.) with an encoded query.",
            SchemaBuilder.object()
                    .stringProp("table", "ServiceNow table name, e.g. 'incident'", true)
                    .stringProp("query", "ServiceNow encoded query, e.g. 'active=true^priority=1'", false)
                    .integerProp("limit", "Max records to return (server-capped at 100)", false)
                    .build(),
            "SERVICENOW_READ"
    );

    private final WebClient.Builder webClientBuilder;
    private final ServiceNowConnectorProperties properties;

    public QueryServiceNowTableTool(WebClient.Builder webClientBuilder, ServiceNowConnectorProperties properties) {
        this.webClientBuilder = webClientBuilder;
        this.properties = properties;
    }

    @Override
    public ToolDefinition definition() {
        return DEFINITION;
    }

    @Override
    public Mono<ToolResult> execute(JsonNode arguments, ToolExecutionContext context) {
        if (!properties.isEnabled()) {
            return Mono.just(ToolResult.error("ServiceNow connector is not enabled/configured for this gateway instance"));
        }
        if (!arguments.hasNonNull("table")) {
            return Mono.just(ToolResult.error("'table' argument is required"));
        }
        int limit = arguments.hasNonNull("limit") ? Math.min(arguments.get("limit").asInt(), 100) : 25;
        String query = arguments.hasNonNull("query") ? arguments.get("query").asText() : "";

        WebClient client = EnterpriseConnectorSupport.basicAuthClient(
                webClientBuilder, properties.getInstanceUrl(), properties.getUsername(), properties.getPassword());

        return client.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/now/table/{table}")
                        .queryParam("sysparm_query", query)
                        .queryParam("sysparm_limit", limit)
                        .build(arguments.get("table").asText()))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(ToolResult::json)
                .onErrorResume(ex -> Mono.just(ToolResult.error(
                        new ConnectorException("servicenow", "Query failed: " + ex.getMessage(), ex).getMessage())));
    }
}
