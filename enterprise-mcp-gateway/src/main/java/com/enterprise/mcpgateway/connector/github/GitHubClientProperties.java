package com.enterprise.mcpgateway.connector.github;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "mcp.gateway.connectors.github")
public class GitHubClientProperties {

    /** Base URL for GitHub REST API; override for GitHub Enterprise Server. */
    private String baseUrl = "https://api.github.com";

    /** Personal access token or GitHub App installation token. */
    private String token;

    private boolean enabled = false;

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}
