package com.enterprise.mcpgateway.mcp.tool;

import com.enterprise.mcpgateway.common.exception.ToolNotFoundException;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Central registry of every {@link McpTool} bean discovered at startup.
 * Backs the {@code tools/list} and {@code tools/call} MCP methods.
 */
@Component
public class ToolRegistry {

    private final Map<String, McpTool> toolsByName = new ConcurrentHashMap<>();

    public ToolRegistry(List<McpTool> tools) {
        for (McpTool tool : tools) {
            String name = tool.definition().name();
            if (toolsByName.containsKey(name)) {
                throw new IllegalStateException("Duplicate MCP tool name registered: " + name);
            }
            toolsByName.put(name, tool);
        }
    }

    public Collection<ToolDefinition> listDefinitions() {
        return toolsByName.values().stream().map(McpTool::definition).toList();
    }

    public McpTool get(String name) {
        McpTool tool = toolsByName.get(name);
        if (tool == null) {
            throw new ToolNotFoundException(name);
        }
        return tool;
    }

    public boolean contains(String name) {
        return toolsByName.containsKey(name);
    }

    public int size() {
        return toolsByName.size();
    }
}
