package com.enterprise.mcpgateway.cache;

import com.enterprise.mcpgateway.mcp.tool.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.core.ReactiveValueOperations;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class ToolResultCacheTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @SuppressWarnings("unchecked")
    private ReactiveRedisTemplate<String, String> mockTemplate(ReactiveValueOperations<String, String> ops) {
        ReactiveRedisTemplate<String, String> template = mock(ReactiveRedisTemplate.class);
        when(template.opsForValue()).thenReturn(ops);
        return template;
    }

    @Test
    void buildKeyIsDeterministicForSameInputs() {
        ReactiveValueOperations<String, String> ops = mock(ReactiveValueOperations.class);
        ToolResultCache cache = new ToolResultCache(mockTemplate(ops), MAPPER, 120);

        JsonNode args = MAPPER.createObjectNode().put("query", "org:acme");
        String key1 = cache.buildKey("github.search_repositories", args, "tenant-1");
        String key2 = cache.buildKey("github.search_repositories", args, "tenant-1");

        assertThat(key1).isEqualTo(key2);
        assertThat(key1).startsWith("mcp:tool-result:");
    }

    @Test
    void buildKeyDiffersByTenant() {
        ReactiveValueOperations<String, String> ops = mock(ReactiveValueOperations.class);
        ToolResultCache cache = new ToolResultCache(mockTemplate(ops), MAPPER, 120);

        JsonNode args = MAPPER.createObjectNode().put("query", "org:acme");
        String keyTenant1 = cache.buildKey("github.search_repositories", args, "tenant-1");
        String keyTenant2 = cache.buildKey("github.search_repositories", args, "tenant-2");

        assertThat(keyTenant1).isNotEqualTo(keyTenant2);
    }

    @Test
    void writeToolKeysAreNeverEligibleForCacheReads() {
        ReactiveValueOperations<String, String> ops = mock(ReactiveValueOperations.class);
        ToolResultCache cache = new ToolResultCache(mockTemplate(ops), MAPPER, 120);

        JsonNode args = MAPPER.createObjectNode().put("title", "bug report");
        String key = cache.buildKey("github.create_issue", args, "tenant-1");

        assertThat(key).contains("create_issue");

        // A key built from a write tool (name contains "create_") must never be
        // looked up in Redis at all — get() should short-circuit before touching ops.
        StepVerifier.create(cache.get(key)).verifyComplete();
        verifyNoInteractions(ops);
    }

    @Test
    void readToolKeysAreEligibleForCacheReads() {
        ReactiveValueOperations<String, String> ops = mock(ReactiveValueOperations.class);
        when(ops.get(anyString())).thenReturn(Mono.empty());
        ToolResultCache cache = new ToolResultCache(mockTemplate(ops), MAPPER, 120);

        JsonNode args = MAPPER.createObjectNode().put("query", "org:acme");
        String key = cache.buildKey("github.search_repositories", args, "tenant-1");

        StepVerifier.create(cache.get(key)).verifyComplete();
        verify(ops).get(key);
    }

    @Test
    void putSkipsCachingErrorResults() {
        ReactiveValueOperations<String, String> ops = mock(ReactiveValueOperations.class);
        ToolResultCache cache = new ToolResultCache(mockTemplate(ops), MAPPER, 120);

        StepVerifier.create(cache.put("some-key", ToolResult.error("boom")))
                .expectNext(false)
                .verifyComplete();
        verifyNoInteractions(ops);
    }

    @Test
    void putStoresSuccessfulResultsWithConfiguredTtl() {
        ReactiveValueOperations<String, String> ops = mock(ReactiveValueOperations.class);
        when(ops.set(anyString(), anyString(), any(java.time.Duration.class))).thenReturn(Mono.just(true));
        ToolResultCache cache = new ToolResultCache(mockTemplate(ops), MAPPER, 120);

        StepVerifier.create(cache.put("some-key", ToolResult.text("all good")))
                .expectNext(true)
                .verifyComplete();
        verify(ops).set(eq("some-key"), anyString(), eq(java.time.Duration.ofSeconds(120)));
    }
}
