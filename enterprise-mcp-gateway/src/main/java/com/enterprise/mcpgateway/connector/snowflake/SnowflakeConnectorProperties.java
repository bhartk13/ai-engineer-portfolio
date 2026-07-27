package com.enterprise.mcpgateway.connector.snowflake;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Snowflake SQL REST API connection settings (key-pair or OAuth bearer auth). */
@ConfigurationProperties(prefix = "mcp.gateway.connectors.snowflake")
public class SnowflakeConnectorProperties {
    private boolean enabled = false;
    private String accountUrl; // e.g. https://<account>.snowflakecomputing.com
    private String bearerToken; // JWT signed with the account key-pair, or OAuth token
    private String warehouse;
    private String database;
    private String schema;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getAccountUrl() { return accountUrl; }
    public void setAccountUrl(String accountUrl) { this.accountUrl = accountUrl; }
    public String getBearerToken() { return bearerToken; }
    public void setBearerToken(String bearerToken) { this.bearerToken = bearerToken; }
    public String getWarehouse() { return warehouse; }
    public void setWarehouse(String warehouse) { this.warehouse = warehouse; }
    public String getDatabase() { return database; }
    public void setDatabase(String database) { this.database = database; }
    public String getSchema() { return schema; }
    public void setSchema(String schema) { this.schema = schema; }
}
