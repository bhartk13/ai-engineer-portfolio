package com.enterprise.mcpgateway.mcp;

import com.enterprise.mcpgateway.common.exception.ToolNotFoundException;
import com.enterprise.mcpgateway.mcp.tool.McpTool;
import com.enterprise.mcpgateway.mcp.tool.ToolDefinition;
import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import com.enterprise.mcpgateway.mcp.tool.ToolRegistry;
import com.enterprise.mcpgateway.mcp.tool.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ToolRegistryTest {

    private static McpTool fakeTool(String name) {
        return new McpTool() {
            @Override
            public ToolDefinition definition() {
                return new ToolDefinition(name, "desc", new ObjectMapper().createObjectNode(), null);
            }

            @Override
            public Mono<ToolResult> execute(JsonNode arguments, ToolExecutionContext context) {
                return Mono.just(ToolResult.text("ok"));
            }
        };
    }

    @Test
    void registersAndListsAllProvidedTools() {
        ToolRegistry registry = new ToolRegistry(List.of(fakeTool("a.one"), fakeTool("b.two")));

        assertThat(registry.size()).isEqualTo(2);
        assertThat(registry.listDefinitions()).extracting(ToolDefinition::name)
                .containsExactlyInAnyOrder("a.one", "b.two");
    }

    @Test
    void getReturnsRegisteredTool() {
        ToolRegistry registry = new ToolRegistry(List.of(fakeTool("a.one")));
        assertThat(registry.get("a.one")).isNotNull();
        assertThat(registry.contains("a.one")).isTrue();
        assertThat(registry.contains("missing")).isFalse();
    }

    @Test
    void getThrowsForUnknownTool() {
        ToolRegistry registry = new ToolRegistry(List.of(fakeTool("a.one")));
        assertThatThrownBy(() -> registry.get("does.not.exist"))
                .isInstanceOf(ToolNotFoundException.class)
                .hasMessageContaining("does.not.exist");
    }

    @Test
    void rejectsDuplicateToolNames() {
        assertThatThrownBy(() -> new ToolRegistry(List.of(fakeTool("dup"), fakeTool("dup"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("dup");
    }
}
