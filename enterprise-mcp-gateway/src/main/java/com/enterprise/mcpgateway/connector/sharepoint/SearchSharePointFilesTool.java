package com.enterprise.mcpgateway.connector.sharepoint;

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
 * Searches files in a configured SharePoint site's default document library via
 * Microsoft Graph ({@code GET /sites/{site-id}/drive/root/search(q='...')}).
 * Requires an Azure AD app registration with {@code Sites.Read.All} application
 * permission and admin consent to reach a real tenant.
 */
@Component
@EnableConfigurationProperties(SharePointConnectorProperties.class)
public class SearchSharePointFilesTool implements McpTool {

    private static final ToolDefinition DEFINITION = new ToolDefinition(
            "sharepoint.search_files",
            "Search files by keyword in the configured SharePoint site's document library.",
            SchemaBuilder.object().stringProp("query", "Search keywords", true).build(),
            "SHAREPOINT_READ"
    );

    private final WebClient.Builder webClientBuilder;
    private final SharePointConnectorProperties properties;

    public SearchSharePointFilesTool(WebClient.Builder webClientBuilder, SharePointConnectorProperties properties) {
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
            return Mono.just(ToolResult.error("SharePoint connector is not enabled/configured for this gateway instance"));
        }
        if (!arguments.hasNonNull("query")) {
            return Mono.just(ToolResult.error("'query' argument is required"));
        }
        WebClient client = EnterpriseConnectorSupport.bearerAuthClient(
                webClientBuilder, properties.getGraphBaseUrl(), properties.getBearerToken());

        String path = "/sites/%s/drive/root/search(q='%s')".formatted(properties.getSiteId(), arguments.get("query").asText());

        return client.get()
                .uri(path)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(ToolResult::json)
                .onErrorResume(ex -> Mono.just(ToolResult.error(
                        new ConnectorException("sharepoint", "Search failed: " + ex.getMessage(), ex).getMessage())));
    }
}
