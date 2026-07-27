package com.enterprise.mcpgateway.connector.common;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SchemaBuilderTest {

    @Test
    void buildsObjectSchemaWithRequiredAndOptionalFields() {
        JsonNode schema = SchemaBuilder.object()
                .stringProp("table", "table name", true)
                .integerProp("limit", "row limit", false)
                .build();

        assertThat(schema.get("type").asText()).isEqualTo("object");
        assertThat(schema.get("properties").get("table").get("type").asText()).isEqualTo("string");
        assertThat(schema.get("properties").get("limit").get("type").asText()).isEqualTo("integer");

        java.util.List<String> required = new java.util.ArrayList<>();
        schema.get("required").forEach(n -> required.add(n.asText()));
        assertThat(required).containsExactly("table");
    }

    @Test
    void buildsEnumProperty() {
        JsonNode schema = SchemaBuilder.object()
                .enumProp("method", "http method", true, "GET", "POST")
                .build();

        java.util.List<String> values = new java.util.ArrayList<>();
        schema.get("properties").get("method").get("enum").forEach(n -> values.add(n.asText()));
        assertThat(values).containsExactly("GET", "POST");
    }
}
