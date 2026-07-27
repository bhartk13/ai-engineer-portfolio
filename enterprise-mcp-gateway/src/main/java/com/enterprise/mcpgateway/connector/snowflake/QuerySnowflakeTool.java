package com.enterprise.mcpgateway.connector.snowflake;

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
 * Executes a read-only SQL statement against Snowflake via the SQL API
 * ({@code POST /api/v2/statements}). Enforces a SELECT-only guard here in
 * addition to whatever read-only role the configured Snowflake user is
 * scoped to at the warehouse/database level (defense in depth).
 */
@Component
@EnableConfigurationProperties(SnowflakeConnectorProperties.class)
public class QuerySnowflakeTool implements McpTool {

    private static final ToolDefinition DEFINITION = new ToolDefinition(
            "snowflake.query",
            "Run a read-only SQL SELECT against Snowflake using the configured warehouse/database/schema.",
            SchemaBuilder.object()
                    .stringProp("sql", "SQL SELECT statement", true)
                    .build(),
            "SNOWFLAKE_READ"
    );

    private final WebClient.Builder webClientBuilder;
    private final SnowflakeConnectorProperties properties;

    public QuerySnowflakeTool(WebClient.Builder webClientBuilder, SnowflakeConnectorProperties properties) {
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
            return Mono.just(ToolResult.error("Snowflake connector is not enabled/configured for this gateway instance"));
        }
        if (!arguments.hasNonNull("sql")) {
            return Mono.just(ToolResult.error("'sql' argument is required"));
        }
        String sql = arguments.get("sql").asText().trim();
        if (!sql.regionMatches(true, 0, "SELECT", 0, 6) && !sql.regionMatches(true, 0, "WITH", 0, 4)) {
            return Mono.just(ToolResult.error("Only read-only SELECT/WITH statements are permitted"));
        }

        WebClient client = EnterpriseConnectorSupport.bearerAuthClient(
                webClientBuilder, properties.getAccountUrl(), properties.getBearerToken());

        return client.post()
                .uri("/api/v2/statements")
                .bodyValue(Map.of(
                        "statement", sql,
                        "warehouse", properties.getWarehouse(),
                        "database", properties.getDatabase(),
                        "schema", properties.getSchema(),
                        "timeout", 30
                ))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(ToolResult::json)
                .onErrorResume(ex -> Mono.just(ToolResult.error(
                        new ConnectorException("snowflake", "Query failed: " + ex.getMessage(), ex).getMessage())));
    }
}
