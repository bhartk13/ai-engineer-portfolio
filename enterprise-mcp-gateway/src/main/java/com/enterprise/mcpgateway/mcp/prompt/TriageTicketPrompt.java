package com.enterprise.mcpgateway.mcp.prompt;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Example reusable MCP prompt: guides an agent through triaging a Jira/ServiceNow
 * ticket by first calling the relevant read tool, then reasoning about severity
 * and next steps. Demonstrates how prompts compose with tools in this gateway.
 */
@Component
public class TriageTicketPrompt implements McpPrompt {

    private static final PromptDefinition DEFINITION = new PromptDefinition(
            "triage-ticket",
            "Guides an agent through triaging a support ticket by id, using the read-only connectors.",
            List.of(new PromptDefinition.PromptArgument("ticketId", "Issue/ticket identifier, e.g. ENG-1234 or INC0012345", true))
    );

    @Override
    public PromptDefinition definition() {
        return DEFINITION;
    }

    @Override
    public String render(JsonNode arguments) {
        String ticketId = arguments != null && arguments.hasNonNull("ticketId") ? arguments.get("ticketId").asText() : "<unknown>";
        return """
                You are triaging ticket %s. Steps:
                1. Fetch the ticket details using the appropriate read-only tool \
                (jira.get_issue for Jira keys, servicenow.query_table for ServiceNow numbers).
                2. Summarize the reported problem, current status, and assignee in 2-3 sentences.
                3. Assess severity (P1-P4) based on impact and urgency described in the ticket.
                4. Recommend a concrete next action (escalate, request more info, or proceed).
                Do not modify the ticket; only read-only tools should be used for triage.
                """.formatted(ticketId);
    }
}
