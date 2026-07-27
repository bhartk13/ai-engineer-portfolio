package com.enterprise.mcpgateway.connector.github;

import com.enterprise.mcpgateway.connector.common.SchemaBuilder;
import com.enterprise.mcpgateway.mcp.tool.McpTool;
import com.enterprise.mcpgateway.mcp.tool.ToolDefinition;
import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import com.enterprise.mcpgateway.mcp.tool.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class SearchRepositoriesTool implements McpTool {

    private static final ToolDefinition DEFINITION = new ToolDefinition(
            "github.search_repositories",
            "Search GitHub repositories by keyword, language, or org, using GitHub's search syntax.",
            SchemaBuilder.object()
                    .stringProp("query", "GitHub search query, e.g. 'org:my-org topic:payments'", true)
                    .integerProp("perPage", "Results per page (max 100)", false)
                    .build(),
            "GITHUB_READ"
    );

    private final GitHubApiClient client;

    public SearchRepositoriesTool(GitHubApiClient client) {
        this.client = client;
    }

    @Override
    public ToolDefinition definition() {
        return DEFINITION;
    }

    @Override
    public Mono<ToolResult> execute(JsonNode arguments, ToolExecutionContext context) {
        if (!arguments.hasNonNull("query") || arguments.get("query").asText().isBlank()) {
            return Mono.just(ToolResult.error("'query' argument is required"));
        }
        String query = URLEncoder.encode(arguments.get("query").asText(), StandardCharsets.UTF_8);
        int perPage = arguments.hasNonNull("perPage") ? Math.min(arguments.get("perPage").asInt(), 100) : 20;

        return client.get("/search/repositories?q=" + query + "&per_page=" + perPage)
                .map(ToolResult::json)
                .onErrorResume(ex -> Mono.just(ToolResult.error(ex.getMessage())));
    }
}
