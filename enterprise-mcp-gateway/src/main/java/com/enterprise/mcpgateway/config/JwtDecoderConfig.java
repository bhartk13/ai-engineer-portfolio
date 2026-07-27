package com.enterprise.mcpgateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;

import javax.crypto.spec.SecretKeySpec;

/**
 * Builds the {@link ReactiveJwtDecoder} used by the resource server filter.
 *
 * <p>In production, set {@code mcp.gateway.security.jwk-set-uri} to your IdP's JWKS
 * endpoint (Okta, Azure AD, Keycloak, Auth0, ...) and HS256 local validation is
 * disabled automatically. The local-secret HS256 decoder is provided only for local
 * development and CI, where standing up a real IdP is impractical.</p>
 */
@Configuration
public class JwtDecoderConfig {

    @Bean
    public ReactiveJwtDecoder jwtDecoder(
            @Value("${mcp.gateway.security.jwk-set-uri:}") String jwkSetUri,
            @Value("${mcp.gateway.security.local-hmac-secret:}") String localSecret) {

        if (jwkSetUri != null && !jwkSetUri.isBlank()) {
            return NimbusReactiveJwtDecoder.withJwkSetUri(jwkSetUri).build();
        }

        if (localSecret == null || localSecret.isBlank()) {
            throw new IllegalStateException(
                    "Either mcp.gateway.security.jwk-set-uri (production) or " +
                    "mcp.gateway.security.local-hmac-secret (dev/CI only) must be configured.");
        }
        SecretKeySpec key = new SecretKeySpec(localSecret.getBytes(), "HmacSHA256");
        return NimbusReactiveJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    }
}
