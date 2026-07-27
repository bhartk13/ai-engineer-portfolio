package com.enterprise.mcpgateway.connector.database;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "mcp.gateway.connectors.database")
public class DatabaseConnectorProperties {

    private boolean enabled = false;

    /** Allow-listed table names the query_table tool is permitted to read from. */
    private List<String> allowedTables = List.of();

    /** Hard cap on rows returned by any single query, regardless of caller-supplied limit. */
    private int maxRows = 500;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public List<String> getAllowedTables() { return allowedTables; }
    public void setAllowedTables(List<String> allowedTables) { this.allowedTables = allowedTables; }
    public int getMaxRows() { return maxRows; }
    public void setMaxRows(int maxRows) { this.maxRows = maxRows; }
}
