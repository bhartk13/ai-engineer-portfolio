package com.enterprise.mcpgateway.mcp.prompt;

import com.enterprise.mcpgateway.common.exception.ToolNotFoundException;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PromptRegistry {

    private final Map<String, McpPrompt> promptsByName = new ConcurrentHashMap<>();

    public PromptRegistry(List<McpPrompt> prompts) {
        for (McpPrompt prompt : prompts) {
            promptsByName.put(prompt.definition().name(), prompt);
        }
    }

    public Collection<PromptDefinition> listDefinitions() {
        return promptsByName.values().stream().map(McpPrompt::definition).toList();
    }

    public Map<String, Object> render(String name, JsonNode arguments) {
        McpPrompt prompt = promptsByName.get(name);
        if (prompt == null) {
            throw new ToolNotFoundException(name);
        }
        JsonNode args = arguments != null && arguments.has("arguments") ? arguments.get("arguments") : arguments;
        return Map.of(
                "description", prompt.definition().description(),
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", Map.of("type", "text", "text", prompt.render(args))
                ))
        );
    }
}
