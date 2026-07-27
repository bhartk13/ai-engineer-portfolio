package com.enterprise.mcpgateway.connector.salesforce;

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
 * Executes a read-only SOQL query against Salesforce's REST Query resource
 * ({@code GET /services/data/{version}/query}). OAuth2 access-token acquisition
 * (client-credentials or JWT-bearer flow) happens upstream of this connector,
 * typically refreshed by a scheduled job that updates
 * {@code mcp.gateway.connectors.salesforce.access-token} / a secrets-manager-backed value.
 */
@Component
@EnableConfigurationProperties(SalesforceConnectorProperties.class)
public class QuerySalesforceSoqlTool implements McpTool {

    private static final ToolDefinition DEFINITION = new ToolDefinition(
            "salesforce.query_soql",
            "Run a read-only SOQL query against Salesforce (SELECT statements only).",
            SchemaBuilder.object()
                    .stringProp("soql", "SOQL query, e.g. 'SELECT Id, Name FROM Account LIMIT 10'", true)
                    .build(),
            "SALESFORCE_READ"
    );

    private final WebClient.Builder webClientBuilder;
    private final SalesforceConnectorProperties properties;

    public QuerySalesforceSoqlTool(WebClient.Builder webClientBuilder, SalesforceConnectorProperties properties) {
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
            return Mono.just(ToolResult.error("Salesforce connector is not enabled/configured for this gateway instance"));
        }
        if (!arguments.hasNonNull("soql")) {
            return Mono.just(ToolResult.error("'soql' argument is required"));
        }
        String soql = arguments.get("soql").asText().trim();
        if (!soql.regionMatches(true, 0, "SELECT", 0, 6)) {
            return Mono.just(ToolResult.error("Only read-only SELECT SOQL statements are permitted"));
        }

        WebClient client = EnterpriseConnectorSupport.bearerAuthClient(
                webClientBuilder, properties.getInstanceUrl(), properties.getAccessToken());

        return client.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/services/data/{version}/query")
                        .queryParam("q", soql)
                        .build(properties.getApiVersion()))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(ToolResult::json)
                .onErrorResume(ex -> Mono.just(ToolResult.error(
                        new ConnectorException("salesforce", "Query failed: " + ex.getMessage(), ex).getMessage())));
    }
}
