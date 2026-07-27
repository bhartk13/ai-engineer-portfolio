package com.enterprise.mcpgateway.connector.github;

import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import com.enterprise.mcpgateway.mcp.tool.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import mockwebserver3.MockResponse;
import mockwebserver3.MockWebServer;
import mockwebserver3.junit5.internal.MockWebServerExtension;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.test.StepVerifier;

import java.io.IOException;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies the GitHub connector against a real (in-process) HTTP server rather
 * than mocking WebClient itself, so the actual request/response wiring —
 * headers, path building, JSON deserialization, and error mapping — is exercised.
 */
class SearchRepositoriesToolTest {

    private MockWebServer server;
    private SearchRepositoriesTool tool;
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final ToolExecutionContext CONTEXT = new ToolExecutionContext("bot", Set.of(), "corr", "tenant");

    @BeforeEach
    void setUp() throws IOException {
        server = new MockWebServer();
        server.start();

        GitHubClientProperties props = new GitHubClientProperties();
        props.setBaseUrl(server.url("/").toString());
        props.setToken("test-token");
        props.setEnabled(true);

        GitHubApiClient client = new GitHubApiClient(WebClient.builder(), props, CircuitBreakerRegistry.ofDefaults());
        tool = new SearchRepositoriesTool(client);
    }

    @AfterEach
    void tearDown() throws IOException {
        server.shutdown();
    }

    @Test
    void returnsErrorWhenQueryMissing() {
        JsonNode args = MAPPER.createObjectNode();
        StepVerifier.create(tool.execute(args, CONTEXT))
                .assertNext(result -> {
                    assertThat(result.isError()).isTrue();
                    assertThat(result.content().get(0).text()).contains("query");
                })
                .verifyComplete();
    }

    @Test
    void searchesRepositoriesSuccessfully() {
        server.enqueue(new MockResponse.Builder()
                .code(200)
                .addHeader("Content-Type", "application/json")
                .body("{\"total_count\":1,\"items\":[{\"full_name\":\"acme/widgets\"}]}")
                .build());

        JsonNode args = MAPPER.createObjectNode().put("query", "org:acme topic:widgets");

        StepVerifier.create(tool.execute(args, CONTEXT))
                .assertNext(result -> assertThat(result.isError()).isFalse())
                .verifyComplete();
    }

    @Test
    void mapsGitHubErrorResponsesToToolError() {
        server.enqueue(new MockResponse.Builder()
                .code(403)
                .body("{\"message\":\"API rate limit exceeded\"}")
                .build());

        JsonNode args = MAPPER.createObjectNode().put("query", "org:acme");

        StepVerifier.create(tool.execute(args, CONTEXT))
                .assertNext(result -> assertThat(result.isError()).isTrue())
                .verifyComplete();
    }

    @Test
    void definitionDeclaresGithubReadRole() {
        assertThat(tool.definition().requiredRole()).isEqualTo("GITHUB_READ");
        assertThat(tool.definition().name()).isEqualTo("github.search_repositories");
    }
}
