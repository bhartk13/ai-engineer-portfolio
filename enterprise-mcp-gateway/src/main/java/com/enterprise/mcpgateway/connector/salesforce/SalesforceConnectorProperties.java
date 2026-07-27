package com.enterprise.mcpgateway.connector.salesforce;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Salesforce REST API connection settings (OAuth2 client-credentials access token). */
@ConfigurationProperties(prefix = "mcp.gateway.connectors.salesforce")
public class SalesforceConnectorProperties {
    private boolean enabled = false;
    private String instanceUrl; // e.g. https://your-domain.my.salesforce.com
    private String apiVersion = "v61.0";
    private String accessToken; // obtained via OAuth2 client-credentials/JWT-bearer flow upstream

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getInstanceUrl() { return instanceUrl; }
    public void setInstanceUrl(String instanceUrl) { this.instanceUrl = instanceUrl; }
    public String getApiVersion() { return apiVersion; }
    public void setApiVersion(String apiVersion) { this.apiVersion = apiVersion; }
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
}
