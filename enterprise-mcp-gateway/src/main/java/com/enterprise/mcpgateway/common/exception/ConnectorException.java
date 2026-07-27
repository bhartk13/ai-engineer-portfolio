package com.enterprise.mcpgateway.common.exception;

/**
 * Wraps any failure raised while calling out to a downstream enterprise system
 * (GitHub, Jira, ServiceNow, Salesforce, Snowflake, SharePoint, generic REST/DB).
 */
public class ConnectorException extends RuntimeException {
    private final String connector;

    public ConnectorException(String connector, String message, Throwable cause) {
        super("[" + connector + "] " + message, cause);
        this.connector = connector;
    }

    public ConnectorException(String connector, String message) {
        this(connector, message, null);
    }

    public String getConnector() {
        return connector;
    }
}
