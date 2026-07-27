package com.enterprise.mcpgateway.connector.common;

import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Shared helper for building an auth-configured {@link WebClient} for the
 * simpler enterprise connectors (Jira, ServiceNow, Salesforce, Snowflake SQL API,
 * SharePoint/Graph). Centralizes basic-auth and bearer-token wiring so each
 * connector class stays focused on its tool logic and API shape.
 */
public final class EnterpriseConnectorSupport {

    private EnterpriseConnectorSupport() {
    }

    public static WebClient basicAuthClient(WebClient.Builder builder, String baseUrl, String username, String apiTokenOrPassword) {
        return builder.baseUrl(baseUrl)
                .defaultHeaders(headers -> headers.setBasicAuth(username, apiTokenOrPassword))
                .defaultHeader(HttpHeaders.ACCEPT, "application/json")
                .build();
    }

    public static WebClient bearerAuthClient(WebClient.Builder builder, String baseUrl, String bearerToken) {
        return builder.baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + (bearerToken != null ? bearerToken : ""))
                .defaultHeader(HttpHeaders.ACCEPT, "application/json")
                .build();
    }
}
