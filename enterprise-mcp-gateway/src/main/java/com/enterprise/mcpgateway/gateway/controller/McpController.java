package com.enterprise.mcpgateway.gateway.controller;

import com.enterprise.mcpgateway.mcp.protocol.JsonRpcRequest;
import com.enterprise.mcpgateway.mcp.protocol.JsonRpcResponse;
import com.enterprise.mcpgateway.mcp.protocol.McpDispatcher;
import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import com.enterprise.mcpgateway.security.JwtRoleConverter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * MCP transport endpoint (Streamable HTTP, per the 2025-06-18 MCP spec):
 * a single POST endpoint accepting JSON-RPC 2.0 requests. Every /mcp/** route
 * is authenticated by {@link com.enterprise.mcpgateway.security.SecurityConfig}
 * and rate-limited by {@link com.enterprise.mcpgateway.security.RateLimitingWebFilter}
 * before reaching this controller.
 */
@RestController
public class McpController {

    private final McpDispatcher dispatcher;

    public McpController(McpDispatcher dispatcher, MeterRegistry meterRegistry) {
        this.dispatcher = dispatcher;
    }

    @PostMapping(value = "/mcp", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<JsonRpcResponse> handle(@RequestBody JsonRpcRequest request,
                                         @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId,
                                         Mono<org.springframework.security.core.Authentication> authMono) {
        return authMono
                .map(auth -> toContext(auth, tenantId))
                .flatMap(context -> dispatcher.dispatch(request, context));
    }

    private ToolExecutionContext toContext(org.springframework.security.core.Authentication auth, String tenantId) {
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            Jwt jwt = jwtAuth.getToken();
            return new ToolExecutionContext(
                    jwt.getSubject(),
                    JwtRoleConverter.extractRoleNames(jwt),
                    UUID.randomUUID().toString(),
                    tenantId != null ? tenantId : jwt.getClaimAsString("tenant_id"));
        }
        return new ToolExecutionContext(auth.getName(), java.util.Set.of(), UUID.randomUUID().toString(), tenantId);
    }
}
