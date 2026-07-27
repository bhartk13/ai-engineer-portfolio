package com.enterprise.mcpgateway.connector.database;

import com.enterprise.mcpgateway.mcp.tool.ToolExecutionContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import reactor.test.StepVerifier;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercises {@link QueryTableTool} against a real, in-memory H2 database (not a
 * mock) so the allow-list enforcement, row cap, and actual JDBC round trip are
 * all genuinely tested.
 */
class QueryTableToolTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final ToolExecutionContext CONTEXT = new ToolExecutionContext("bot", Set.of(), "corr", "tenant");

    private QueryTableTool tool;

    @BeforeEach
    void setUp() {
        JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:query_table_test_" + System.nanoTime() + ";DB_CLOSE_DELAY=-1");
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        jdbcTemplate.execute("CREATE TABLE employees (id INT PRIMARY KEY, full_name VARCHAR(200))");
        jdbcTemplate.update("INSERT INTO employees (id, full_name) VALUES (1, 'Ada Lovelace')");
        jdbcTemplate.update("INSERT INTO employees (id, full_name) VALUES (2, 'Alan Turing')");
        jdbcTemplate.update("INSERT INTO employees (id, full_name) VALUES (3, 'Grace Hopper')");

        DatabaseConnectorProperties properties = new DatabaseConnectorProperties();
        properties.setEnabled(true);
        properties.setAllowedTables(List.of("employees"));
        properties.setMaxRows(2);

        tool = new QueryTableTool(new NamedParameterJdbcTemplate(dataSource), properties);
    }

    @Test
    void rejectsMissingTableArgument() {
        JsonNode args = MAPPER.createObjectNode();
        StepVerifier.create(tool.execute(args, CONTEXT))
                .assertNext(result -> assertThat(result.isError()).isTrue())
                .verifyComplete();
    }

    @Test
    void rejectsTableNotInAllowList() {
        JsonNode args = MAPPER.createObjectNode().put("table", "secret_salaries");
        StepVerifier.create(tool.execute(args, CONTEXT))
                .assertNext(result -> {
                    assertThat(result.isError()).isTrue();
                    assertThat(result.content().get(0).text()).contains("not in the connector allow-list");
                })
                .verifyComplete();
    }

    @Test
    void queriesAllowListedTableSuccessfully() {
        JsonNode args = MAPPER.createObjectNode().put("table", "employees");
        StepVerifier.create(tool.execute(args, CONTEXT))
                .assertNext(result -> assertThat(result.isError()).isFalse())
                .verifyComplete();
    }

    @Test
    void enforcesServerSideMaxRowsCapEvenWhenHigherLimitRequested() {
        // maxRows is configured to 2, but caller asks for 100
        JsonNode args = MAPPER.createObjectNode().put("table", "employees").put("limit", 100);
        StepVerifier.create(tool.execute(args, CONTEXT))
                .assertNext(result -> {
                    assertThat(result.isError()).isFalse();
                    @SuppressWarnings("unchecked")
                    List<Object> rows = (List<Object>) result.content().get(0).data().get("value");
                    assertThat(rows).hasSize(2); // capped, not 3
                })
                .verifyComplete();
    }
}
