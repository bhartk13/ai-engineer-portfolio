package com.enterprise.mcpgateway.mcp.tool;

import java.util.Set;

/**
 * Per-invocation context propagated to tool implementations.
 *
 * @param principal        authenticated caller (service account or delegated user)
 * @param roles             RBAC roles held by the caller
 * @param correlationId     trace/correlation id, echoed in audit logs and downstream calls
 * @param tenantId          multi-tenant partition identifier, if applicable
 */
public record ToolExecutionContext(
        String principal,
        Set<String> roles,
        String correlationId,
        String tenantId
) {
    public boolean hasRole(String role) {
        return role == null || roles.contains(role) || roles.contains("ADMIN");
    }
}
