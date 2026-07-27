package com.enterprise.mcpgateway.config;

import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Per-principal rate limiting for MCP tool calls, enforced in
 * {@link com.enterprise.mcpgateway.security.RateLimitingWebFilter}.
 *
 * <p>Note: resilience4j's own {@code RateLimiterConfig} type is referenced
 * fully-qualified below rather than imported, since its simple name collides
 * with this Spring {@code @Configuration} class's own name.</p>
 */
@Configuration
public class RateLimiterConfig {

    @Bean
    public RateLimiterRegistry rateLimiterRegistry(
            @Value("${mcp.gateway.rate-limit.requests-per-period:100}") int requestsPerPeriod,
            @Value("${mcp.gateway.rate-limit.period-seconds:60}") long periodSeconds) {
        io.github.resilience4j.ratelimiter.RateLimiterConfig config =
                io.github.resilience4j.ratelimiter.RateLimiterConfig.custom()
                        .limitForPeriod(requestsPerPeriod)
                        .limitRefreshPeriod(Duration.ofSeconds(periodSeconds))
                        .timeoutDuration(Duration.ZERO)
                        .build();
        return RateLimiterRegistry.of(config);
    }
}
