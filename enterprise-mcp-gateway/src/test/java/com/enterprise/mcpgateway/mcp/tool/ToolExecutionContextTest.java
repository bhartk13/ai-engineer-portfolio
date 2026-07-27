package com.enterprise.mcpgateway.mcp.tool;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ToolExecutionContextTest {

    @Test
    void nullRequiredRoleIsAlwaysPermitted() {
        ToolExecutionContext ctx = new ToolExecutionContext("alice", Set.of(), "corr", "tenant");
        assertThat(ctx.hasRole(null)).isTrue();
    }

    @Test
    void permitsWhenCallerHoldsExactRole() {
        ToolExecutionContext ctx = new ToolExecutionContext("alice", Set.of("JIRA_READ"), "corr", "tenant");
        assertThat(ctx.hasRole("JIRA_READ")).isTrue();
        assertThat(ctx.hasRole("JIRA_WRITE")).isFalse();
    }

    @Test
    void adminRoleBypassesAnyRequiredRole() {
        ToolExecutionContext ctx = new ToolExecutionContext("alice", Set.of("ADMIN"), "corr", "tenant");
        assertThat(ctx.hasRole("SNOWFLAKE_READ")).isTrue();
        assertThat(ctx.hasRole("ANYTHING_ELSE")).isTrue();
    }
}
