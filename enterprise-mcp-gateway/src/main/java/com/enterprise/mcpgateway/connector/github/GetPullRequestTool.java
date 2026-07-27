package com.enterprise.mcpgateway.connector.github;

import com.enterprise.mcpgateway.connector.common.SchemaBuilder;
import com.enterprise.mcpgateway.mcp.tool.McpTool;
import com.enterprise.mcpgateway.mcp.tool.ToolDefinition;
import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import com.enterprise.mcpgateway.mcp.tool.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
public class GetPullRequestTool implements McpTool {

    private static final ToolDefinition DEFINITION = new ToolDefinition(
            "github.get_pull_request",
            "Fetch details (status, reviews, diff stats) for a single pull request.",
            SchemaBuilder.object()
                    .stringProp("owner", "Repository owner (user or org)", true)
                    .stringProp("repo", "Repository name", true)
                    .integerProp("number", "Pull request number", true)
                    .build(),
            "GITHUB_READ"
    );

    private final GitHubApiClient client;

    public GetPullRequestTool(GitHubApiClient client) {
        this.client = client;
    }

    @Override
    public ToolDefinition definition() {
        return DEFINITION;
    }

    @Override
    public Mono<ToolResult> execute(JsonNode arguments, ToolExecutionContext context) {
        for (String field : new String[]{"owner", "repo", "number"}) {
            if (!arguments.hasNonNull(field)) {
                return Mono.just(ToolResult.error("'" + field + "' argument is required"));
            }
        }
        String path = "/repos/%s/%s/pulls/%d".formatted(
                arguments.get("owner").asText(), arguments.get("repo").asText(), arguments.get("number").asInt());

        return client.get(path)
                .map(ToolResult::json)
                .onErrorResume(ex -> Mono.just(ToolResult.error(ex.getMessage())));
    }
}
