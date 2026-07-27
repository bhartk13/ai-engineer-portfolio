package com.enterprise.mcpgateway.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/**
 * Exposes tool-level invocation counters on top of the request-level timers
 * already recorded by {@link com.enterprise.mcpgateway.mcp.protocol.McpDispatcher},
 * scraped by Prometheus at {@code /actuator/prometheus} and visualized in the
 * bundled Grafana dashboard (see docker/grafana/).
 */
@Component
public class ToolInvocationMetrics {

    private final MeterRegistry meterRegistry;

    public ToolInvocationMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    public void recordToolCall(String toolName, boolean success) {
        Counter.builder("mcp.tool.invocations")
                .tag("tool", toolName)
                .tag("outcome", success ? "success" : "error")
                .register(meterRegistry)
                .increment();
    }
}
