package com.enterprise.mcpgateway.audit;

import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import com.enterprise.mcpgateway.mcp.tool.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.kafka.core.KafkaTemplate;

import java.util.Set;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AuditServiceTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final ToolExecutionContext CONTEXT =
            new ToolExecutionContext("alice", Set.of("GITHUB_READ"), "corr-1", "tenant-1");

    private AuditLogRepository repository;
    @SuppressWarnings("unchecked")
    private KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);
    private AuditService auditService;

    @BeforeEach
    void setUp() {
        repository = mock(AuditLogRepository.class);
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(kafkaTemplate.send(anyString(), anyString(), anyString()))
                .thenReturn(CompletableFuture.completedFuture(null));
        auditService = new AuditService(repository, MAPPER, kafkaTemplate);
    }

    @Test
    void recordsSuccessfulInvocationWithOutcomeSuccess() {
        JsonNode args = MAPPER.createObjectNode().put("query", "org:acme");
        auditService.recordInvocation(CONTEXT, "github.search_repositories", args, ToolResult.text("ok"));

        ArgumentCaptor<AuditLogEntry> captor = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getOutcome()).isEqualTo("SUCCESS");
        assertThat(captor.getValue().getToolName()).isEqualTo("github.search_repositories");
        assertThat(captor.getValue().getPrincipal()).isEqualTo("alice");
    }

    @Test
    void recordsErrorOutcomeWhenResultIsError() {
        JsonNode args = MAPPER.createObjectNode();
        auditService.recordInvocation(CONTEXT, "github.search_repositories", args, ToolResult.error("boom"));

        ArgumentCaptor<AuditLogEntry> captor = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getOutcome()).isEqualTo("ERROR");
    }

    @Test
    void redactsSensitiveFieldsBeforePersisting() {
        JsonNode args = MAPPER.createObjectNode()
                .put("username", "alice")
                .put("password", "hunter2")
                .put("apiKey", "sk-secret-value");
        auditService.recordInvocation(CONTEXT, "rest.invoke_endpoint", args, ToolResult.text("ok"));

        ArgumentCaptor<AuditLogEntry> captor = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(repository).save(captor.capture());
        String storedArgs = captor.getValue().getArgumentsJson();
        assertThat(storedArgs).contains("alice");
        assertThat(storedArgs).doesNotContain("hunter2");
        assertThat(storedArgs).doesNotContain("sk-secret-value");
        assertThat(storedArgs).contains("REDACTED");
    }

    @Test
    void recordsDeniedInvocationWithReason() {
        auditService.recordDenied(CONTEXT, "admin.dangerous_op", "insufficient_role");

        ArgumentCaptor<AuditLogEntry> captor = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getOutcome()).isEqualTo("DENIED");
        assertThat(captor.getValue().getResultSummary()).isEqualTo("insufficient_role");
    }

    @Test
    void auditFailureNeverThrowsBackToCaller() {
        when(repository.save(any())).thenThrow(new RuntimeException("db down"));
        JsonNode args = MAPPER.createObjectNode();

        org.junit.jupiter.api.Assertions.assertDoesNotThrow(() ->
                auditService.recordInvocation(CONTEXT, "github.search_repositories", args, ToolResult.text("ok")));
    }
}
