package com.enterprise.mcpgateway.connector.database;

import com.enterprise.mcpgateway.connector.common.SchemaBuilder;
import com.enterprise.mcpgateway.common.exception.ConnectorException;
import com.enterprise.mcpgateway.mcp.tool.McpTool;
import com.enterprise.mcpgateway.mcp.tool.ToolDefinition;
import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import com.enterprise.mcpgateway.mcp.tool.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Read-only tool that queries an allow-listed PostgreSQL table by name, with
 * optional column projection and a bounded row limit. Table names are validated
 * against {@link DatabaseConnectorProperties#getAllowedTables()} to prevent
 * arbitrary SQL execution / injection — this tool never accepts a raw SQL string.
 */
@Component
@EnableConfigurationProperties(DatabaseConnectorProperties.class)
public class QueryTableTool implements McpTool {

    private static final ToolDefinition DEFINITION = new ToolDefinition(
            "postgres.query_table",
            "Read rows from an allow-listed PostgreSQL table, with optional column projection and row limit. " +
                    "Does not accept raw SQL; table access is restricted by admin-configured allow-list.",
            SchemaBuilder.object()
                    .stringProp("table", "Allow-listed table name", true)
                    .integerProp("limit", "Max rows to return (server-capped)", false)
                    .build(),
            "DB_READ"
    );

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final DatabaseConnectorProperties properties;

    public QueryTableTool(NamedParameterJdbcTemplate jdbcTemplate, DatabaseConnectorProperties properties) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
    }

    @Override
    public ToolDefinition definition() {
        return DEFINITION;
    }

    @Override
    public Mono<ToolResult> execute(JsonNode arguments, ToolExecutionContext context) {
        if (!arguments.hasNonNull("table")) {
            return Mono.just(ToolResult.error("'table' argument is required"));
        }
        String table = arguments.get("table").asText();
        if (!properties.getAllowedTables().contains(table)) {
            return Mono.just(ToolResult.error("Table '" + table + "' is not in the connector allow-list"));
        }
        int requested = arguments.hasNonNull("limit") ? arguments.get("limit").asInt() : properties.getMaxRows();
        int limit = Math.min(requested, properties.getMaxRows());

        return Mono.fromCallable(() -> runQuery(table, limit))
                .subscribeOn(Schedulers.boundedElastic())
                .map(ToolResult::json)
                .onErrorResume(ex -> Mono.just(ToolResult.error(
                        new ConnectorException("postgres", "Query failed: " + ex.getMessage(), ex).getMessage())));
    }

    private List<Map<String, Object>> runQuery(String table, int limit) {
        // table name is validated against the allow-list above, not user-composed SQL
        String sql = "SELECT * FROM " + table + " LIMIT :limit";
        return jdbcTemplate.query(sql, Map.of("limit", limit),
                (rs, rowNum) -> {
                    var meta = rs.getMetaData();
                    Map<String, Object> row = new java.util.LinkedHashMap<>();
                    for (int i = 1; i <= meta.getColumnCount(); i++) {
                        row.put(meta.getColumnLabel(i), rs.getObject(i));
                    }
                    return row;
                });
    }
}
