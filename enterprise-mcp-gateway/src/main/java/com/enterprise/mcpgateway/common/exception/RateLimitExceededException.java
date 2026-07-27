package com.enterprise.mcpgateway.common.exception;

public class RateLimitExceededException extends RuntimeException {
    public RateLimitExceededException(String principal) {
        super("Rate limit exceeded for principal: " + principal);
    }
}
