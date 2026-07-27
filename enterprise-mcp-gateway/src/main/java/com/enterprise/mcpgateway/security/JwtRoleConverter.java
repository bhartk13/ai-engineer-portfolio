package com.enterprise.mcpgateway.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Extracts RBAC roles from a validated JWT's "roles" (or "realm_access.roles" for
 * Keycloak-style tokens) claim into Spring Security authorities and application roles.
 */
@Component
public class JwtRoleConverter implements Converter<Jwt, List<GrantedAuthority>> {

    @Override
    @SuppressWarnings("unchecked")
    public List<GrantedAuthority> convert(Jwt jwt) {
        List<String> roles = jwt.getClaimAsStringList("roles");
        if (roles == null) {
            Object realmAccess = jwt.getClaims().get("realm_access");
            if (realmAccess instanceof java.util.Map<?, ?> map && map.get("roles") instanceof List<?> list) {
                roles = (List<String>) list;
            }
        }
        if (roles == null) {
            roles = List.of();
        }
        return roles.stream()
                .map(role -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + role))
                .collect(Collectors.toList());
    }

    public static Set<String> extractRoleNames(Jwt jwt) {
        List<String> roles = jwt.getClaimAsStringList("roles");
        return roles == null ? Set.of() : Set.copyOf(roles);
    }
}
