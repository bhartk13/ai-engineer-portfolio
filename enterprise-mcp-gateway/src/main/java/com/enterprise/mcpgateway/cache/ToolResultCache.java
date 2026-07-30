package com.enterprise.mcpgateway.cache;

import com.enterprise.mcpgateway.mcp.tool.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Set;

/**
 * Caches idempotent tool results in Redis, keyed by tool name + argument hash + tenant.
 * Mutating tools (writes) opt out via {@link #NON_CACHEABLE_PREFIXES}.
 */
@Component
public class ToolResultCache {

    private static final Logger log = LoggerFactory.getLogger(ToolResultCache.class);

    // Tool name prefixes that perform writes and must never be cached.
    private static final Set<String> NON_CACHEABLE_PREFIXES = Set.of(
            "create_", "update_", "delete_", "post_", "put_", "patch_", "execute_write"
    );

    private final ReactiveStringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Duration ttl;

    public ToolResultCache(ReactiveStringRedisTemplate redisTemplate,
                            ObjectMapper objectMapper,
                            @Value("${mcp.gateway.cache.tool-result-ttl-seconds:120}") long ttlSeconds) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.ttl = Duration.ofSeconds(ttlSeconds);
    }

    /**
     * Builds the cache key. The tool name is kept in plaintext as a key segment
     * (not hashed) so that {@link #isCacheKeyEligible(String)} can still tell
     * write tools apart from read tools when {@link #get(String)} is later called
     * with only the resulting key — hashing the tool name away would make that
     * check unenforceable.
     */
    public String buildKey(String toolName, JsonNode arguments, String tenantId) {
        String raw = toolName + "|" + tenantId + "|" + arguments.toString();
        return "mcp:tool-result:" + toolName + ":" + sha256(raw);
    }

    public Mono<ToolResult> get(String key) {
        if (!isCacheKeyEligible(key)) {
            return Mono.empty();
        }
        return redisTemplate.opsForValue().get(key)
                .flatMap(json -> {
                    try {
                        return Mono.just(objectMapper.readValue(json, ToolResult.class));
                    } catch (Exception e) {
                        log.warn("Failed to deserialize cached tool result for key {}: {}", key, e.getMessage());
                        return Mono.empty();
                    }
                })
                .onErrorResume(e -> {
                    log.warn("Cache read failed, falling back to live execution: {}", e.getMessage());
                    return Mono.empty();
                });
    }

    public Mono<Boolean> put(String key, ToolResult result) {
        if (result.isError()) {
            return Mono.just(false); // never cache errors
        }
        try {
            String json = objectMapper.writeValueAsString(result);
            return redisTemplate.opsForValue().set(key, json, ttl)
                    .onErrorResume(e -> {
                        log.warn("Cache write failed (non-fatal): {}", e.getMessage());
                        return Mono.just(false);
                    });
        } catch (Exception e) {
            return Mono.just(false);
        }
    }

    private boolean isCacheKeyEligible(String key) {
        return NON_CACHEABLE_PREFIXES.stream().noneMatch(key::contains);
    }

    private static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
