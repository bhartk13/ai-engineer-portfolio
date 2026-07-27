package com.enterprise.mcpgateway.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLogEntry, String> {
    Page<AuditLogEntry> findByPrincipal(String principal, Pageable pageable);
    Page<AuditLogEntry> findByToolName(String toolName, Pageable pageable);
}
