package com.enterprise.mcpgateway.connector.sharepoint;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Microsoft Graph API settings used to reach SharePoint sites/drives. */
@ConfigurationProperties(prefix = "mcp.gateway.connectors.sharepoint")
public class SharePointConnectorProperties {
    private boolean enabled = false;
    private String graphBaseUrl = "https://graph.microsoft.com/v1.0";
    private String bearerToken; // Azure AD app token, client-credentials flow, Sites.Read.All scope
    private String siteId; // Graph site id, e.g. contoso.sharepoint.com,<siteGuid>,<webGuid>

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getGraphBaseUrl() { return graphBaseUrl; }
    public void setGraphBaseUrl(String graphBaseUrl) { this.graphBaseUrl = graphBaseUrl; }
    public String getBearerToken() { return bearerToken; }
    public void setBearerToken(String bearerToken) { this.bearerToken = bearerToken; }
    public String getSiteId() { return siteId; }
    public void setSiteId(String siteId) { this.siteId = siteId; }
}
