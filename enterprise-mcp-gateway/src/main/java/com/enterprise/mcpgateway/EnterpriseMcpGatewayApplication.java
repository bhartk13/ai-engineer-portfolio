package com.enterprise.mcpgateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Entry point for the Enterprise MCP Gateway.
 *
 * <p>Exposes enterprise systems (GitHub, Jira, ServiceNow, Salesforce, Snowflake,
 * SharePoint, PostgreSQL, generic REST APIs) to AI agents through a standardized
 * Model Context Protocol (MCP) interface: tools, resources and prompts, delivered
 * over JSON-RPC 2.0 via HTTP + Server-Sent Events.</p>
 */
@SpringBootApplication
@EnableCaching
@EnableKafka
@EnableAsync
public class EnterpriseMcpGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(EnterpriseMcpGatewayApplication.class, args);
    }
}
