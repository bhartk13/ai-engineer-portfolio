package com.enterprise.mcpgateway;

import com.enterprise.mcpgateway.mcp.tool.ToolRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Loads the full Spring application context with the {@code test} profile
 * (H2 in-memory database, local HMAC JWT secret, no external services
 * required). This is the single highest-value test in the suite: it proves
 * every {@code @Component}/{@code @Configuration} bean across every
 * connector, security, cache, audit, and metrics package actually wires
 * together — something the per-package unit tests, by design, cannot catch
 * on their own since they construct their subjects manually with mocks.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ApplicationContextSmokeTest {

    @Autowired
    private ToolRegistry toolRegistry;

    @Test
    void applicationContextLoadsAndAllToolsAreRegistered() {
        // If this test runs at all, every Spring bean in the application graph
        // (all connectors, security config, cache, audit, metrics, dispatcher)
        // was successfully constructed and wired.
        assertThat(toolRegistry.size()).isGreaterThanOrEqualTo(11); // github(3) + jira(2) + servicenow(1) + salesforce(1) + snowflake(1) + sharepoint(1) + postgres(1) + rest(1)
        assertThat(toolRegistry.contains("github.search_repositories")).isTrue();
        assertThat(toolRegistry.contains("postgres.query_table")).isTrue();
        assertThat(toolRegistry.contains("rest.invoke_endpoint")).isTrue();
    }
}
