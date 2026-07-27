package com.enterprise.mcpgateway.security;

import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/**
 * Applies a per-principal token-bucket rate limit to every /mcp/** request,
 * ahead of tool-level authorization. Anonymous (pre-auth) traffic is limited
 * by remote address as a fallback. {@link RateLimiter#acquirePermission()} is a
 * fast, non-blocking, in-memory bucket check, so it is safe to call directly
 * within the reactive chain.
 */
@Component
public class RateLimitingWebFilter implements WebFilter, Ordered {

    private final RateLimiterRegistry rateLimiterRegistry;

    public RateLimitingWebFilter(RateLimiterRegistry rateLimiterRegistry) {
        this.rateLimiterRegistry = rateLimiterRegistry;
    }

    @Override
    public int getOrder() {
        return -50; // after Spring Security's auth filters, before controller
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        if (!exchange.getRequest().getPath().value().startsWith("/mcp")) {
            return chain.filter(exchange);
        }
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .defaultIfEmpty(remoteKey(exchange))
                .flatMap(principal -> {
                    RateLimiter limiter = rateLimiterRegistry.rateLimiter(principal);
                    if (limiter.acquirePermission()) {
                        return chain.filter(exchange);
                    }
                    exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
                    return exchange.getResponse().setComplete();
                });
    }

    private String remoteKey(ServerWebExchange exchange) {
        var addr = exchange.getRequest().getRemoteAddress();
        return addr != null ? addr.getAddress().getHostAddress() : "anonymous";
    }
}
