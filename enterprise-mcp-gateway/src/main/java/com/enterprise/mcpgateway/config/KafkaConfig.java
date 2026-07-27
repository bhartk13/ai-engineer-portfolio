package com.enterprise.mcpgateway.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

import java.time.Duration;

/**
 * Declares the Kafka topics this gateway owns. Spring Kafka's
 * {@code KafkaAdmin} auto-creates/reconciles any {@link NewTopic} bean against
 * the configured broker(s) at startup (requires the broker to allow topic
 * auto-creation via the admin client, which is standard in most managed
 * Kafka/MSK setups).
 */
@Configuration
public class KafkaConfig {

    @Bean
    public NewTopic auditEventsTopic() {
        return TopicBuilder.name("mcp-gateway.audit-events")
                .partitions(6)
                .replicas(3)
                .config("retention.ms", String.valueOf(Duration.ofDays(90).toMillis()))
                .build();
    }
}
