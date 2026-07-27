package com.enterprise.mcpgateway.mcp;

import com.enterprise.mcpgateway.audit.AuditService;
import com.enterprise.mcpgateway.cache.ToolResultCache;
import com.enterprise.mcpgateway.mcp.prompt.PromptRegistry;
import com.enterprise.mcpgateway.mcp.protocol.JsonRpcRequest;
import com.enterprise.mcpgateway.mcp.protocol.JsonRpcResponse;
import com.enterprise.mcpgateway.mcp.protocol.McpDispatcher;
import com.enterprise.mcpgateway.mcp.resource.ResourceRegistry;
import com.enterprise.mcpgateway.mcp.tool.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class McpDispatcherTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private ToolRegistry toolRegistry;
    private AuditService auditService;
    private ToolResultCache toolResultCache;
    private McpDispatcher dispatcher;

    private static final ToolExecutionContext CONTEXT =
            new ToolExecutionContext("alice", Set.of("GITHUB_READ"), "corr-1", "tenant-1");

    @BeforeEach
    void setUp() {
        McpTool readTool = new McpTool() {
            @Override
            public ToolDefinition definition() {
                return new ToolDefinition("github.search_repositories", "desc", objectMapper.createObjectNode(), "GITHUB_READ");
            }

            @Override
            public Mono<ToolResult> execute(JsonNode arguments, ToolExecutionContext context) {
                return Mono.just(ToolResult.text("search results"));
            }
        };
        McpTool adminOnlyTool = new McpTool() {
            @Override
            public ToolDefinition definition() {
                return new ToolDefinition("admin.dangerous_op", "desc", objectMapper.createObjectNode(), "SUPER_ADMIN");
            }

            @Override
            public Mono<ToolResult> execute(JsonNode arguments, ToolExecutionContext context) {
                return Mono.just(ToolResult.text("should not run"));
            }
        };

        toolRegistry = new ToolRegistry(List.of(readTool, adminOnlyTool));
        auditService = mock(AuditService.class);
        toolResultCache = mock(ToolResultCache.class);
        when(toolResultCache.buildKey(anyString(), any(), anyString())).thenReturn("cache-key");
        when(toolResultCache.get(anyString())).thenReturn(Mono.empty());
        when(toolResultCache.put(anyString(), any())).thenReturn(Mono.just(true));

        ResourceRegistry resourceRegistry = new ResourceRegistry(List.of());
        PromptRegistry promptRegistry = new PromptRegistry(List.of());

        dispatcher = new McpDispatcher(toolRegistry, resourceRegistry, promptRegistry, auditService,
                toolResultCache, objectMapper, new SimpleMeterRegistry());
    }

    @Test
    void toolsListReturnsAllRegisteredDefinitions() {
        JsonRpcRequest request = new JsonRpcRequest("2.0", 1, "tools/list", null);

        StepVerifier.create(dispatcher.dispatch(request, CONTEXT))
                .assertNext(resp -> {
                    assertThat(resp.error()).isNull();
                    assertThat(resp.result()).isNotNull();
                })
                .verifyComplete();
    }

    @Test
    void toolsCallExecutesAuthorizedTool() {
        ObjectNode params = objectMapper.createObjectNode();
        params.put("name", "github.search_repositories");
        params.set("arguments", objectMapper.createObjectNode());
        JsonRpcRequest request = new JsonRpcRequest("2.0", 2, "tools/call", params);

        StepVerifier.create(dispatcher.dispatch(request, CONTEXT))
                .assertNext(resp -> assertThat(resp.error()).isNull())
                .verifyComplete();

        verify(auditService, timeout(1000)).recordInvocation(eq(CONTEXT), eq("github.search_repositories"), any(), any());
    }

    @Test
    void toolsCallDeniesInsufficientRole() {
        ObjectNode params = objectMapper.createObjectNode();
        params.put("name", "admin.dangerous_op");
        params.set("arguments", objectMapper.createObjectNode());
        JsonRpcRequest request = new JsonRpcRequest("2.0", 3, "tools/call", params);

        StepVerifier.create(dispatcher.dispatch(request, CONTEXT))
                .assertNext(resp -> {
                    assertThat(resp.error()).isNotNull();
                    assertThat(resp.error().code()).isEqualTo(JsonRpcResponse.JsonRpcError.UNAUTHORIZED);
                })
                .verifyComplete();

        verify(auditService, timeout(1000)).recordDenied(eq(CONTEXT), eq("admin.dangerous_op"), anyString());
    }

    @Test
    void toolsCallReturnsToolNotFoundError() {
        ObjectNode params = objectMapper.createObjectNode();
        params.put("name", "does.not.exist");
        JsonRpcRequest request = new JsonRpcRequest("2.0", 4, "tools/call", params);

        StepVerifier.create(dispatcher.dispatch(request, CONTEXT))
                .assertNext(resp -> {
                    assertThat(resp.error()).isNotNull();
                    assertThat(resp.error().code()).isEqualTo(JsonRpcResponse.JsonRpcError.TOOL_NOT_FOUND);
                })
                .verifyComplete();
    }

    @Test
    void unknownMethodReturnsMethodNotFound() {
        JsonRpcRequest request = new JsonRpcRequest("2.0", 5, "not/a/real/method", null);

        StepVerifier.create(dispatcher.dispatch(request, CONTEXT))
                .assertNext(resp -> {
                    assertThat(resp.error()).isNotNull();
                    assertThat(resp.error().code()).isEqualTo(JsonRpcResponse.JsonRpcError.METHOD_NOT_FOUND);
                })
                .verifyComplete();
    }

    @Test
    void initializeReturnsProtocolAndServerInfo() {
        JsonRpcRequest request = new JsonRpcRequest("2.0", 6, "initialize", null);

        StepVerifier.create(dispatcher.dispatch(request, CONTEXT))
                .assertNext(resp -> {
                    assertThat(resp.error()).isNull();
                    JsonNode result = objectMapper.valueToTree(resp.result());
                    assertThat(result.get("serverInfo").get("name").asText()).isEqualTo("enterprise-mcp-gateway");
                })
                .verifyComplete();
    }
}
