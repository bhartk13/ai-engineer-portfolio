package com.enterprise.mcpgateway.connector.servicenow;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** ServiceNow Table API connection settings. */
@ConfigurationProperties(prefix = "mcp.gateway.connectors.servicenow")
public class ServiceNowConnectorProperties {
    private boolean enabled = false;
    private String instanceUrl; // e.g. https://your-instance.service-now.com
    private String username;
    private String password;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getInstanceUrl() { return instanceUrl; }
    public void setInstanceUrl(String instanceUrl) { this.instanceUrl = instanceUrl; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
