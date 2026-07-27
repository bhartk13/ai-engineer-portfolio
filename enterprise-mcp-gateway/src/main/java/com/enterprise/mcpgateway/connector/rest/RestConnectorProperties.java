package com.enterprise.mcpgateway.connector.rest;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.Map;

@ConfigurationProperties(prefix = "mcp.gateway.connectors.rest")
public class RestConnectorProperties {

    /** Named upstream REST APIs this connector is permitted to call, e.g. "internal-billing-api". */
    private Map<String, Endpoint> endpoints = Map.of();

    public Map<String, Endpoint> getEndpoints() { return endpoints; }
    public void setEndpoints(Map<String, Endpoint> endpoints) { this.endpoints = endpoints; }

    public static class Endpoint {
        private String baseUrl;
        private String authHeader;
        private List<String> allowedPaths = List.of();

        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
        public String getAuthHeader() { return authHeader; }
        public void setAuthHeader(String authHeader) { this.authHeader = authHeader; }
        public List<String> getAllowedPaths() { return allowedPaths; }
        public void setAllowedPaths(List<String> allowedPaths) { this.allowedPaths = allowedPaths; }
    }
}
