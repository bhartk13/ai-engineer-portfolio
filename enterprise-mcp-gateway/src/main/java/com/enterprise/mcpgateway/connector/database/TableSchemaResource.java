package com.enterprise.mcpgateway.connector.database;

import com.enterprise.mcpgateway.mcp.resource.McpResource;
import com.enterprise.mcpgateway.mcp.resource.ResourceContent;
import com.enterprise.mcpgateway.mcp.resource.ResourceDefinition;
import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Exposes an allow-listed table's column schema as an MCP resource, addressable
 * as {@code postgres://schema/{tableName}}, so agents can inspect structure
 * before calling {@link QueryTableTool}.
 */
@Component
public class TableSchemaResource implements McpResource {

    private static final String URI_PREFIX = "postgres://schema/";

    private final JdbcTemplate jdbcTemplate;
    private final DatabaseConnectorProperties properties;

    public TableSchemaResource(JdbcTemplate jdbcTemplate, DatabaseConnectorProperties properties) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
    }

    @Override
    public ResourceDefinition definition() {
        return new ResourceDefinition(URI_PREFIX + "{tableName}", "PostgreSQL table schema",
                "Column names and types for an allow-listed table", "application/json");
    }

    @Override
    public boolean supports(String uri) {
        return uri != null && uri.startsWith(URI_PREFIX);
    }

    @Override
    public Mono<ResourceContent> read(String uri, ToolExecutionContext context) {
        String table = uri.substring(URI_PREFIX.length());
        if (!properties.getAllowedTables().contains(table)) {
            return Mono.error(new IllegalArgumentException("Table not allow-listed: " + table));
        }
        return Mono.fromCallable(() -> describeTable(table))
                .subscribeOn(Schedulers.boundedElastic())
                .map(json -> new ResourceContent(uri, "application/json", json));
    }

    private String describeTable(String table) {
        List<String> columns = jdbcTemplate.query(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ?",
                (rs, rowNum) -> "{\"column\":\"%s\",\"type\":\"%s\"}".formatted(rs.getString(1), rs.getString(2)),
                table);
        return "[" + columns.stream().collect(Collectors.joining(",")) + "]";
    }
}
