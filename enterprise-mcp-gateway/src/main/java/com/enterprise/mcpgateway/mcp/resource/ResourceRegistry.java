package com.enterprise.mcpgateway.mcp.resource;

import com.enterprise.mcpgateway.common.exception.ConnectorException;
import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.Collection;
import java.util.List;

@Component
public class ResourceRegistry {

    private final List<McpResource> resources;

    public ResourceRegistry(List<McpResource> resources) {
        this.resources = resources;
    }

    public Collection<ResourceDefinition> listDefinitions() {
        return resources.stream().map(McpResource::definition).toList();
    }

    public Mono<ResourceContent> read(String uri, ToolExecutionContext context) {
        return resources.stream()
                .filter(r -> r.supports(uri))
                .findFirst()
                .map(r -> r.read(uri, context))
                .orElseGet(() -> Mono.error(new ConnectorException("resource-registry", "No resource handler for URI: " + uri)));
    }
}
