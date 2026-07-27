package com.enterprise.mcpgateway.mcp.tool;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ToolResultTest {

    @Test
    void textFactoryProducesNonErrorSingleTextBlock() {
        ToolResult result = ToolResult.text("hello");
        assertThat(result.isError()).isFalse();
        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).type()).isEqualTo("text");
        assertThat(result.content().get(0).text()).isEqualTo("hello");
    }

    @Test
    void errorFactoryMarksResultAsError() {
        ToolResult result = ToolResult.error("something broke");
        assertThat(result.isError()).isTrue();
        assertThat(result.content().get(0).text()).isEqualTo("something broke");
    }

    @Test
    void jsonFactoryWrapsStructuredValue() {
        ToolResult result = ToolResult.json(java.util.Map.of("key", "value"));
        assertThat(result.isError()).isFalse();
        assertThat(result.content().get(0).type()).isEqualTo("json");
        assertThat(result.content().get(0).data()).containsEntry("value", java.util.Map.of("key", "value"));
    }
}
