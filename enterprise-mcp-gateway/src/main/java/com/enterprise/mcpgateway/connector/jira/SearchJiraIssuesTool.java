package com.enterprise.mcpgateway.connector.jira;

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

import java.util.Map;

/**
 * Searches Jira issues via JQL through the Jira Cloud REST API v3
 * ({@code POST /rest/api/3/search}). Requires {@code mcp.gateway.connectors.jira.*}
 * to be configured with a real Atlassian Cloud site + API token to reach a live
 * tenant; the tool itself, request shape and error handling are fully implemented.
 */
@Component
@EnableConfigurationProperties(JiraConnectorProperties.class)
public class SearchJiraIssuesTool implements McpTool {

    private static final ToolDefinition DEFINITION = new ToolDefinition(
            "jira.search_issues",
            "Search Jira issues using JQL (Jira Query Language).",
            SchemaBuilder.object()
                    .stringProp("jql", "JQL query, e.g. 'project = ENG AND status = \"In Progress\"'", true)
                    .integerProp("maxResults", "Max issues to return (server-capped at 100)", false)
                    .build(),
            "JIRA_READ"
    );

    private final WebClient.Builder webClientBuilder;
    private final JiraConnectorProperties properties;

    public SearchJiraIssuesTool(WebClient.Builder webClientBuilder, JiraConnectorProperties properties) {
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
            return Mono.just(ToolResult.error("Jira connector is not enabled/configured for this gateway instance"));
        }
        if (!arguments.hasNonNull("jql")) {
            return Mono.just(ToolResult.error("'jql' argument is required"));
        }
        int maxResults = arguments.hasNonNull("maxResults") ? Math.min(arguments.get("maxResults").asInt(), 100) : 25;

        WebClient client = EnterpriseConnectorSupport.basicAuthClient(
                webClientBuilder, properties.getBaseUrl(), properties.getUsername(), properties.getApiToken());

        return client.post()
                .uri("/rest/api/3/search")
                .bodyValue(Map.of("jql", arguments.get("jql").asText(), "maxResults", maxResults))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(ToolResult::json)
                .onErrorResume(ex -> Mono.just(ToolResult.error(
                        new ConnectorException("jira", "Search failed: " + ex.getMessage(), ex).getMessage())));
    }
}
