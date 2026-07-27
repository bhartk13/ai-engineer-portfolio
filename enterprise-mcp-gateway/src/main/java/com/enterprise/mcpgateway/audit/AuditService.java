package com.enterprise.mcpgateway.audit;

import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import com.enterprise.mcpgateway.mcp.tool.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Persists a tamper-evident audit trail of every tool invocation to PostgreSQL
 * and, best-effort, publishes an event to Kafka for downstream SIEM ingestion.
 * Audit writes are asynchronous so they never add latency to the caller's request,
 * and failures here must never fail the underlying tool call.
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);
    private static final String AUDIT_TOPIC = "mcp-gateway.audit-events";

    private final AuditLogRepository repository;
    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public AuditService(AuditLogRepository repository, ObjectMapper objectMapper,
                         KafkaTemplate<String, String> kafkaTemplate) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Async
    public void recordInvocation(ToolExecutionContext context, String toolName, JsonNode arguments, ToolResult result) {
        String outcome = result.isError() ? "ERROR" : "SUCCESS";
        persist(context, toolName, arguments, outcome, summarize(result));
    }

    @Async
    public void recordDenied(ToolExecutionContext context, String toolName, String reason) {
        persist(context, toolName, null, "DENIED", reason);
    }

    private void persist(ToolExecutionContext context, String toolName, JsonNode arguments,
                          String outcome, String resultSummary) {
        try {
            String argsJson = arguments != null ? redact(arguments) : null;
            AuditLogEntry entry = new AuditLogEntry(
                    context.principal(), context.tenantId(), toolName, context.correlationId(),
                    outcome, argsJson, resultSummary);
            repository.save(entry);
            kafkaTemplate.send(AUDIT_TOPIC, context.principal(), objectMapper.writeValueAsString(entry.getId()));
        } catch (Exception e) {
            // Audit failures must never break the calling flow.
            log.error("Failed to record audit entry for tool {}: {}", toolName, e.getMessage());
        }
    }

    /** Strips common secret-shaped fields before persisting arguments. */
    private String redact(JsonNode arguments) {
        try {
            JsonNode copy = arguments.deepCopy();
            redactRecursive(copy);
            return objectMapper.writeValueAsString(copy);
        } catch (Exception e) {
            return "<redaction-failed>";
        }
    }

    private void redactRecursive(JsonNode node) {
        if (node.isObject()) {
            node.fieldNames().forEachRemaining(field -> {
                if (isSensitive(field) && node.get(field).isTextual()) {
                    ((com.fasterxml.jackson.databind.node.ObjectNode) node).put(field, "***REDACTED***");
                } else {
                    redactRecursive(node.get(field));
                }
            });
        } else if (node.isArray()) {
            node.forEach(this::redactRecursive);
        }
    }

    private boolean isSensitive(String field) {
        String f = field.toLowerCase();
        return f.contains("password") || f.contains("secret") || f.contains("token") || f.contains("apikey") || f.contains("api_key");
    }

    private String summarize(ToolResult result) {
        if (result.content().isEmpty()) return "";
        var block = result.content().get(0);
        String text = block.text() != null ? block.text() : String.valueOf(block.data());
        return text.length() > 500 ? text.substring(0, 500) + "...(truncated)" : text;
    }
}
