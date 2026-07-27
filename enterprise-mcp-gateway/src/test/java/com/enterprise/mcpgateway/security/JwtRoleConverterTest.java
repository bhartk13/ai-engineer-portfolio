package com.enterprise.mcpgateway.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class JwtRoleConverterTest {

    private final JwtRoleConverter converter = new JwtRoleConverter();

    private Jwt jwtWithClaims(Map<String, Object> claims) {
        return Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .claims(c -> c.putAll(claims))
                .build();
    }

    @Test
    void convertsFlatRolesClaimToGrantedAuthorities() {
        Jwt jwt = jwtWithClaims(Map.of("sub", "alice", "roles", List.of("GITHUB_READ", "JIRA_READ")));

        List<GrantedAuthority> authorities = converter.convert(jwt);

        assertThat(authorities).extracting(GrantedAuthority::getAuthority)
                .containsExactlyInAnyOrder("ROLE_GITHUB_READ", "ROLE_JIRA_READ");
    }

    @Test
    void fallsBackToKeycloakStyleRealmAccessRoles() {
        Jwt jwt = jwtWithClaims(Map.of("sub", "bob", "realm_access", Map.of("roles", List.of("ADMIN"))));

        List<GrantedAuthority> authorities = converter.convert(jwt);

        assertThat(authorities).extracting(GrantedAuthority::getAuthority).containsExactly("ROLE_ADMIN");
    }

    @Test
    void returnsEmptyListWhenNoRolesClaimPresent() {
        Jwt jwt = jwtWithClaims(Map.of("sub", "carol"));

        assertThat(converter.convert(jwt)).isEmpty();
    }

    @Test
    void extractRoleNamesReturnsRawRoleSet() {
        Jwt jwt = jwtWithClaims(Map.of("sub", "dave", "roles", List.of("SNOWFLAKE_READ")));

        Set<String> roles = JwtRoleConverter.extractRoleNames(jwt);

        assertThat(roles).containsExactly("SNOWFLAKE_READ");
    }

    @Test
    void extractRoleNamesReturnsEmptySetWhenAbsent() {
        Jwt jwt = jwtWithClaims(Map.of("sub", "erin"));

        assertThat(JwtRoleConverter.extractRoleNames(jwt)).isEmpty();
    }
}
