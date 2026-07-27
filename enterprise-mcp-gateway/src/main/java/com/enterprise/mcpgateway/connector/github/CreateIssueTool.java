package com.enterprise.mcpgateway.connector.github;

import com.enterprise.mcpgateway.connector.common.SchemaBuilder;
import com.enterprise.mcpgateway.mcp.tool.McpTool;
import com.enterprise.mcpgateway.mcp.tool.ToolDefinition;
import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import com.enterprise.mcpgateway.mcp.tool.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * A write-capable tool; note its name is prefixed "create_" so
 * {@link com.enterprise.mcpgateway.cache.ToolResultCache} never caches it.
 */
@Component
public class CreateIssueTool implements McpTool {

    private static final ToolDefinition DEFINITION = new ToolDefinition(
            "github.create_issue",
            "Create a new issue in a GitHub repository.",
            SchemaBuilder.object()
                    .stringProp("owner", "Repository owner (user or org)", true)
                    .stringProp("repo", "Repository name", true)
                    .stringProp("title", "Issue title", true)
                    .stringProp("body", "Issue body (markdown)", false)
                    .build(),
            "GITHUB_WRITE"
    );

    private final GitHubApiClient client;

    public CreateIssueTool(GitHubApiClient client) {
        this.client = client;
    }

    @Override
    public ToolDefinition definition() {
        return DEFINITION;
    }

    @Override
    public Mono<ToolResult> execute(JsonNode arguments, ToolExecutionContext context) {
        for (String field : new String[]{"owner", "repo", "title"}) {
            if (!arguments.hasNonNull(field)) {
                return Mono.just(ToolResult.error("'" + field + "' argument is required"));
            }
        }
        String path = "/repos/%s/%s/issues".formatted(arguments.get("owner").asText(), arguments.get("repo").asText());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("title", arguments.get("title").asText());
        if (arguments.hasNonNull("body")) {
            body.put("body", arguments.get("body").asText());
        }

        return client.post(path, body)
                .map(ToolResult::json)
                .onErrorResume(ex -> Mono.just(ToolResult.error(ex.getMessage())));
    }
}
