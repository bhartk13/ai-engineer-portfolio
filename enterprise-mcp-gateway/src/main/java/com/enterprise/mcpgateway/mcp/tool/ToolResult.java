package com.enterprise.mcpgateway.mcp.tool;

import java.util.List;
import java.util.Map;

/**
 * Result of a {@code tools/call} invocation, per the MCP content-block model.
 */
public record ToolResult(List<ContentBlock> content, boolean isError) {

    public static ToolResult text(String text) {
        return new ToolResult(List.of(ContentBlock.text(text)), false);
    }

    public static ToolResult json(Object structured) {
        return new ToolResult(List.of(ContentBlock.json(structured)), false);
    }

    public static ToolResult error(String message) {
        return new ToolResult(List.of(ContentBlock.text(message)), true);
    }

    public record ContentBlock(String type, String text, Map<String, Object> data) {
        public static ContentBlock text(String text) {
            return new ContentBlock("text", text, null);
        }

        public static ContentBlock json(Object structured) {
            return new ContentBlock("json", null, Map.of("value", structured));
        }
    }
}
