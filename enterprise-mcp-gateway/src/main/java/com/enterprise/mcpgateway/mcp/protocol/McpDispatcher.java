package com.enterprise.mcpgateway.mcp.protocol;

import com.enterprise.mcpgateway.audit.AuditService;
import com.enterprise.mcpgateway.cache.ToolResultCache;
import com.enterprise.mcpgateway.common.exception.ToolAuthorizationException;
import com.enterprise.mcpgateway.mcp.prompt.PromptRegistry;
import com.enterprise.mcpgateway.mcp.resource.ResourceRegistry;
import com.enterprise.mcpgateway.mcp.tool.McpTool;
import com.enterprise.mcpgateway.mcp.tool.ToolDefinition;
import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import com.enterprise.mcpgateway.mcp.tool.ToolRegistry;
import com.enterprise.mcpgateway.mcp.tool.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;

/**
 * Routes incoming JSON-RPC 2.0 requests to the appropriate MCP handler
 * (initialize, tools/list, tools/call, resources/list, resources/read,
 * prompts/list, prompts/get, ping) and applies cross-cutting concerns:
 * RBAC authorization, audit logging, result caching and metrics.
 */
@Component
public class McpDispatcher {

    private static final Logger log = LoggerFactory.getLogger(McpDispatcher.class);
    private static final String PROTOCOL_VERSION = "2025-06-18";

    private final ToolRegistry toolRegistry;
    private final ResourceRegistry resourceRegistry;
    private final PromptRegistry promptRegistry;
    private final AuditService auditService;
    private final ToolResultCache toolResultCache;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    public McpDispatcher(ToolRegistry toolRegistry,
                          ResourceRegistry resourceRegistry,
                          PromptRegistry promptRegistry,
                          AuditService auditService,
                          ToolResultCache toolResultCache,
                          ObjectMapper objectMapper,
                          MeterRegistry meterRegistry) {
        this.toolRegistry = toolRegistry;
        this.resourceRegistry = resourceRegistry;
        this.promptRegistry = promptRegistry;
        this.auditService = auditService;
        this.toolResultCache = toolResultCache;
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
    }

    public Mono<JsonRpcResponse> dispatch(JsonRpcRequest request, ToolExecutionContext context) {
        Instant start = Instant.now();
        return doDispatch(request, context)
                .doOnNext(resp -> recordMetric(request.method(), start, resp.error() == null))
                .onErrorResume(ex -> {
                    recordMetric(request.method(), start, false);
                    return Mono.just(toErrorResponse(request.id(), ex));
                });
    }

    private Mono<JsonRpcResponse> doDispatch(JsonRpcRequest request, ToolExecutionContext context) {
        return switch (request.method()) {
            case "initialize" -> handleInitialize(request);
            case "ping" -> Mono.just(JsonRpcResponse.success(request.id(), objectMapper.createObjectNode()));
            case "tools/list" -> Mono.just(JsonRpcResponse.success(request.id(), toolRegistry.listDefinitions()));
            case "tools/call" -> handleToolCall(request, context);
            case "resources/list" -> Mono.just(JsonRpcResponse.success(request.id(), resourceRegistry.listDefinitions()));
            case "resources/read" -> handleResourceRead(request, context);
            case "prompts/list" -> Mono.just(JsonRpcResponse.success(request.id(), promptRegistry.listDefinitions()));
            case "prompts/get" -> handlePromptGet(request);
            default -> Mono.just(JsonRpcResponse.failure(request.id(),
                    JsonRpcResponse.JsonRpcError.of(JsonRpcResponse.JsonRpcError.METHOD_NOT_FOUND,
                            "Unknown MCP method: " + request.method())));
        };
    }

    private Mono<JsonRpcResponse> handleInitialize(JsonRpcRequest request) {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("protocolVersion", PROTOCOL_VERSION);
        ObjectNode capabilities = result.putObject("capabilities");
        capabilities.putObject("tools").put("listChanged", true);
        capabilities.putObject("resources").put("listChanged", true);
        capabilities.putObject("prompts").put("listChanged", true);
        ObjectNode serverInfo = result.putObject("serverInfo");
        serverInfo.put("name", "enterprise-mcp-gateway");
        serverInfo.put("version", "1.0.0");
        return Mono.just(JsonRpcResponse.success(request.id(), result));
    }

    private Mono<JsonRpcResponse> handleToolCall(JsonRpcRequest request, ToolExecutionContext context) {
        JsonNode params = request.params();
        if (params == null || !params.hasNonNull("name")) {
            return Mono.just(JsonRpcResponse.failure(request.id(),
                    JsonRpcResponse.JsonRpcError.of(JsonRpcResponse.JsonRpcError.INVALID_PARAMS,
                            "'name' is required in tools/call params")));
        }
        String toolName = params.get("name").asText();
        JsonNode arguments = params.has("arguments") ? params.get("arguments") : objectMapper.createObjectNode();

        McpTool tool = toolRegistry.get(toolName);
        ToolDefinition definition = tool.definition();

        if (!context.hasRole(definition.requiredRole())) {
            auditService.recordDenied(context, toolName, "insufficient_role");
            return Mono.error(new ToolAuthorizationException(toolName, definition.requiredRole()));
        }

        String cacheKey = toolResultCache.buildKey(toolName, arguments, context.tenantId());
        return toolResultCache.get(cacheKey)
                .switchIfEmpty(
                        tool.execute(arguments, context)
                                .flatMap(result -> toolResultCache.put(cacheKey, result).thenReturn(result))
                )
                .doOnNext(result -> auditService.recordInvocation(context, toolName, arguments, result))
                .map(result -> JsonRpcResponse.success(request.id(), result));
    }

    private Mono<JsonRpcResponse> handleResourceRead(JsonRpcRequest request, ToolExecutionContext context) {
        JsonNode params = request.params();
        if (params == null || !params.hasNonNull("uri")) {
            return Mono.just(JsonRpcResponse.failure(request.id(),
                    JsonRpcResponse.JsonRpcError.of(JsonRpcResponse.JsonRpcError.INVALID_PARAMS, "'uri' is required")));
        }
        return resourceRegistry.read(params.get("uri").asText(), context)
                .map(content -> JsonRpcResponse.success(request.id(), content));
    }

    private Mono<JsonRpcResponse> handlePromptGet(JsonRpcRequest request) {
        JsonNode params = request.params();
        if (params == null || !params.hasNonNull("name")) {
            return Mono.just(JsonRpcResponse.failure(request.id(),
                    JsonRpcResponse.JsonRpcError.of(JsonRpcResponse.JsonRpcError.INVALID_PARAMS, "'name' is required")));
        }
        return Mono.just(JsonRpcResponse.success(request.id(), promptRegistry.render(params.get("name").asText(), params)));
    }

    private JsonRpcResponse toErrorResponse(Object id, Throwable ex) {
        log.warn("MCP dispatch error: {}", ex.getMessage());
        if (ex instanceof com.enterprise.mcpgateway.common.exception.ToolNotFoundException) {
            return JsonRpcResponse.failure(id, JsonRpcResponse.JsonRpcError.of(
                    JsonRpcResponse.JsonRpcError.TOOL_NOT_FOUND, ex.getMessage()));
        }
        if (ex instanceof ToolAuthorizationException) {
            return JsonRpcResponse.failure(id, JsonRpcResponse.JsonRpcError.of(
                    JsonRpcResponse.JsonRpcError.UNAUTHORIZED, ex.getMessage()));
        }
        if (ex instanceof com.enterprise.mcpgateway.common.exception.RateLimitExceededException) {
            return JsonRpcResponse.failure(id, JsonRpcResponse.JsonRpcError.of(
                    JsonRpcResponse.JsonRpcError.RATE_LIMITED, ex.getMessage()));
        }
        if (ex instanceof com.enterprise.mcpgateway.common.exception.ConnectorException) {
            return JsonRpcResponse.failure(id, JsonRpcResponse.JsonRpcError.of(
                    JsonRpcResponse.JsonRpcError.TOOL_EXECUTION_ERROR, ex.getMessage()));
        }
        return JsonRpcResponse.failure(id, JsonRpcResponse.JsonRpcError.of(
                JsonRpcResponse.JsonRpcError.INTERNAL_ERROR, "Internal error"));
    }

    private void recordMetric(String method, Instant start, boolean success) {
        Timer.builder("mcp.dispatch")
                .tag("method", method)
                .tag("outcome", success ? "success" : "error")
                .register(meterRegistry)
                .record(Duration.between(start, Instant.now()));
    }
}
