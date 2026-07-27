package com.enterprise.mcpgateway.connector.rest;

import com.enterprise.mcpgateway.connector.common.SchemaBuilder;
import com.enterprise.mcpgateway.common.exception.ConnectorException;
import com.enterprise.mcpgateway.mcp.tool.McpTool;
import com.enterprise.mcpgateway.mcp.tool.ToolDefinition;
import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import com.enterprise.mcpgateway.mcp.tool.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * Generic, config-driven connector for internal REST APIs that don't warrant a
 * bespoke connector. Each callable upstream ("endpoint") and its allowed paths
 * are declared in {@code application.yml} by platform engineers — this tool
 * never accepts an arbitrary caller-supplied URL, only a named endpoint + a
 * path that must match the endpoint's allow-list.
 */
@Component
@EnableConfigurationProperties(RestConnectorProperties.class)
public class InvokeRestEndpointTool implements McpTool {

    private static final ToolDefinition DEFINITION = new ToolDefinition(
            "rest.invoke_endpoint",
            "Call a pre-registered internal REST API by name and allow-listed path.",
            SchemaBuilder.object()
                    .stringProp("endpoint", "Registered endpoint name from gateway config", true)
                    .stringProp("path", "Path within the endpoint's allow-list, e.g. '/v1/invoices'", true)
                    .enumProp("method", "HTTP method", false, "GET", "POST")
                    .stringProp("body", "JSON request body (for POST)", false)
                    .build(),
            "REST_INVOKE"
    );

    private final WebClient.Builder webClientBuilder;
    private final RestConnectorProperties properties;

    public InvokeRestEndpointTool(WebClient.Builder webClientBuilder, RestConnectorProperties properties) {
        this.webClientBuilder = webClientBuilder;
        this.properties = properties;
    }

    @Override
    public ToolDefinition definition() {
        return DEFINITION;
    }

    @Override
    public Mono<ToolResult> execute(JsonNode arguments, ToolExecutionContext context) {
        for (String field : new String[]{"endpoint", "path"}) {
            if (!arguments.hasNonNull(field)) {
                return Mono.just(ToolResult.error("'" + field + "' argument is required"));
            }
        }
        String endpointName = arguments.get("endpoint").asText();
        String path = arguments.get("path").asText();
        RestConnectorProperties.Endpoint endpoint = properties.getEndpoints().get(endpointName);
        if (endpoint == null) {
            return Mono.just(ToolResult.error("Unknown REST endpoint: " + endpointName));
        }
        if (endpoint.getAllowedPaths().stream().noneMatch(path::startsWith)) {
            return Mono.just(ToolResult.error("Path '" + path + "' is not allow-listed for endpoint '" + endpointName + "'"));
        }
        HttpMethod method = arguments.hasNonNull("method")
                ? HttpMethod.valueOf(arguments.get("method").asText())
                : HttpMethod.GET;

        WebClient client = webClientBuilder.baseUrl(endpoint.getBaseUrl())
                .defaultHeader("Authorization", endpoint.getAuthHeader() != null ? endpoint.getAuthHeader() : "")
                .build();

        WebClient.RequestBodySpec spec = client.method(method).uri(path);
        WebClient.RequestHeadersSpec<?> finalSpec = spec;
        if (method == HttpMethod.POST && arguments.hasNonNull("body")) {
            finalSpec = spec.bodyValue(arguments.get("body").toString());
        }

        return finalSpec.retrieve()
                .bodyToMono(String.class)
                .map(ToolResult::text)
                .onErrorResume(ex -> Mono.just(ToolResult.error(
                        new ConnectorException(endpointName, "Call failed: " + ex.getMessage(), ex).getMessage())));
    }
}
