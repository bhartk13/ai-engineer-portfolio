package com.enterprise.mcpgateway.connector.jira;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Atlassian Jira Cloud REST API v3 connection settings. */
@ConfigurationProperties(prefix = "mcp.gateway.connectors.jira")
public class JiraConnectorProperties {
    private boolean enabled = false;
    private String baseUrl; // e.g. https://your-domain.atlassian.net
    private String username; // Atlassian account email
    private String apiToken; // https://id.atlassian.com/manage-profile/security/api-tokens

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getApiToken() { return apiToken; }
    public void setApiToken(String apiToken) { this.apiToken = apiToken; }
}
