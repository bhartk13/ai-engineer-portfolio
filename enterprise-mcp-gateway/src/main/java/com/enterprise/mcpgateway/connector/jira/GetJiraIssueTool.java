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

@Component
@EnableConfigurationProperties(JiraConnectorProperties.class)
public class GetJiraIssueTool implements McpTool {

    private static final ToolDefinition DEFINITION = new ToolDefinition(
            "jira.get_issue",
            "Fetch a single Jira issue by key, including status, assignee, and comments.",
            SchemaBuilder.object().stringProp("issueKey", "Jira issue key, e.g. 'ENG-1234'", true).build(),
            "JIRA_READ"
    );

    private final WebClient.Builder webClientBuilder;
    private final JiraConnectorProperties properties;

    public GetJiraIssueTool(WebClient.Builder webClientBuilder, JiraConnectorProperties properties) {
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
        if (!arguments.hasNonNull("issueKey")) {
            return Mono.just(ToolResult.error("'issueKey' argument is required"));
        }
        WebClient client = EnterpriseConnectorSupport.basicAuthClient(
                webClientBuilder, properties.getBaseUrl(), properties.getUsername(), properties.getApiToken());

        return client.get()
                .uri("/rest/api/3/issue/{key}", arguments.get("issueKey").asText())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(ToolResult::json)
                .onErrorResume(ex -> Mono.just(ToolResult.error(
                        new ConnectorException("jira", "Fetch failed: " + ex.getMessage(), ex).getMessage())));
    }
}
