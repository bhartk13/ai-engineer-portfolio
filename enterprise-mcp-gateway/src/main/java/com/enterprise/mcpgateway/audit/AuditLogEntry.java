package com.enterprise.mcpgateway.audit;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "audit_log", indexes = {
        @Index(name = "idx_audit_principal", columnList = "principal"),
        @Index(name = "idx_audit_tool_name", columnList = "toolName"),
        @Index(name = "idx_audit_created_at", columnList = "createdAt")
})
public class AuditLogEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String principal;
    private String tenantId;
    private String toolName;
    private String correlationId;

    @Column(length = 20)
    private String outcome; // SUCCESS, ERROR, DENIED

    @Column(columnDefinition = "TEXT")
    private String argumentsJson;

    @Column(columnDefinition = "TEXT")
    private String resultSummary;

    private Instant createdAt;

    protected AuditLogEntry() {
        // JPA
    }

    public AuditLogEntry(String principal, String tenantId, String toolName, String correlationId,
                          String outcome, String argumentsJson, String resultSummary) {
        this.principal = principal;
        this.tenantId = tenantId;
        this.toolName = toolName;
        this.correlationId = correlationId;
        this.outcome = outcome;
        this.argumentsJson = argumentsJson;
        this.resultSummary = resultSummary;
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public String getPrincipal() { return principal; }
    public String getTenantId() { return tenantId; }
    public String getToolName() { return toolName; }
    public String getCorrelationId() { return correlationId; }
    public String getOutcome() { return outcome; }
    public String getArgumentsJson() { return argumentsJson; }
    public String getResultSummary() { return resultSummary; }
    public Instant getCreatedAt() { return createdAt; }
}
