package com.enterprise.mcpgateway.connector.github;

import com.enterprise.mcpgateway.common.exception.ConnectorException;
import com.fasterxml.jackson.databind.JsonNode;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.reactor.circuitbreaker.operator.CircuitBreakerOperator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * Thin, resilient wrapper around the GitHub REST API v3, used by all
 * {@code github.*} MCP tools. Applies a circuit breaker so a degraded GitHub
 * API does not cascade into gateway-wide latency.
 */
@Component
@EnableConfigurationProperties(GitHubClientProperties.class)
public class GitHubApiClient {

    private final WebClient webClient;
    private final CircuitBreaker circuitBreaker;

    public GitHubApiClient(WebClient.Builder webClientBuilder,
                            GitHubClientProperties properties,
                            CircuitBreakerRegistry circuitBreakerRegistry) {
        this.webClient = webClientBuilder
                .baseUrl(properties.getBaseUrl())
                .defaultHeader("Accept", "application/vnd.github+json")
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
                .defaultHeader("Authorization", properties.getToken() != null ? "Bearer " + properties.getToken() : "")
                .build();
        this.circuitBreaker = circuitBreakerRegistry.circuitBreaker("github-api");
    }

    public Mono<JsonNode> get(String uriPath) {
        return webClient.get()
                .uri(uriPath)
                .retrieve()
                .onStatus(status -> status.isError(), resp ->
                        resp.bodyToMono(String.class).defaultIfEmpty("")
                                .map(body -> new ConnectorException("github", "GitHub API error " + resp.statusCode() + ": " + body)))
                .bodyToMono(JsonNode.class)
                .transformDeferred(CircuitBreakerOperator.of(circuitBreaker))
                .onErrorMap(ex -> !(ex instanceof ConnectorException),
                        ex -> new ConnectorException("github", "Call to GitHub failed: " + ex.getMessage(), ex));
    }

    public Mono<JsonNode> post(String uriPath, Object body) {
        return webClient.post()
                .uri(uriPath)
                .bodyValue(body)
                .retrieve()
                .onStatus(status -> status.isError(), resp ->
                        resp.bodyToMono(String.class).defaultIfEmpty("")
                                .map(b -> new ConnectorException("github", "GitHub API error " + resp.statusCode() + ": " + b)))
                .bodyToMono(JsonNode.class)
                .transformDeferred(CircuitBreakerOperator.of(circuitBreaker))
                .onErrorMap(ex -> !(ex instanceof ConnectorException),
                        ex -> new ConnectorException("github", "Call to GitHub failed: " + ex.getMessage(), ex));
    }
}
