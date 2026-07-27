package com.enterprise.mcpgateway.connector.common;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Small fluent helper for building JSON-Schema {@code inputSchema} objects for
 * {@link com.enterprise.mcpgateway.mcp.tool.ToolDefinition} without hand-writing
 * ObjectMapper boilerplate in every connector.
 */
public final class SchemaBuilder {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private final ObjectNode root;
    private final ObjectNode properties;
    private final ArrayNode required;

    private SchemaBuilder() {
        this.root = MAPPER.createObjectNode();
        root.put("type", "object");
        this.properties = root.putObject("properties");
        this.required = root.putArray("required");
    }

    public static SchemaBuilder object() {
        return new SchemaBuilder();
    }

    public SchemaBuilder stringProp(String name, String description, boolean required) {
        ObjectNode prop = properties.putObject(name);
        prop.put("type", "string");
        prop.put("description", description);
        if (required) this.required.add(name);
        return this;
    }

    public SchemaBuilder integerProp(String name, String description, boolean required) {
        ObjectNode prop = properties.putObject(name);
        prop.put("type", "integer");
        prop.put("description", description);
        if (required) this.required.add(name);
        return this;
    }

    public SchemaBuilder enumProp(String name, String description, boolean required, String... values) {
        ObjectNode prop = properties.putObject(name);
        prop.put("type", "string");
        prop.put("description", description);
        ArrayNode enumArray = prop.putArray("enum");
        for (String v : values) enumArray.add(v);
        if (required) this.required.add(name);
        return this;
    }

    public JsonNode build() {
        return root;
    }
}
