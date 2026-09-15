package io.sentinelqe.workforce;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DemoProvisioningIT {
    private static PostgreSQLContainer<?> freshDatabase() {
        var database = new PostgreSQLContainer<>("postgres:17.11-alpine");
        database.start();
        return database;
    }

    private static ServletWebServerApplicationContext start(PostgreSQLContainer<?> database, String profile) {
        return (ServletWebServerApplicationContext) new SpringApplicationBuilder(WorkforceApplication.class).run(
                "--spring.profiles.active=" + profile,
                "--spring.datasource.url=" + database.getJdbcUrl(),
                "--spring.datasource.username=" + database.getUsername(),
                "--spring.datasource.password=" + database.getPassword(),
                "--app.jwt.secret=" + UUID.randomUUID() + UUID.randomUUID(),
                "--management.tracing.enabled=false", "--server.port=0");
    }

    private static io.restassured.response.Response demoLogin(ServletWebServerApplicationContext app) {
        return given().baseUri("http://127.0.0.1").port(app.getWebServer().getPort())
                .contentType("application/json")
                .body(Map.of("email", "admin@example.test", "password", "LocalDemo!2026"))
                .post("/api/auth/login");
    }

    @Test
    @DisplayName("INT-DATA-001 fresh default startup creates schema without demo identities")
    void normalStartupHasNoDemoUsers() {
        try (var database = freshDatabase(); var app = start(database, "default")) {
            var jdbc = app.getBean(JdbcTemplate.class);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM employees", Integer.class)).isZero();
            assertThat(jdbc.queryForList("SELECT version FROM flyway_schema_history WHERE success", String.class)).containsExactly("1");
            var response = demoLogin(app);
            assertThat(response.statusCode()).isEqualTo(401);
            assertThat(response.jsonPath().getString("code")).isEqualTo("INVALID_CREDENTIALS");
            assertThat(response.asString()).doesNotContain("token", "password_hash");
        }
    }

    @Test
    @DisplayName("INT-DATA-002 explicit demo startup provisions documented users once across restart")
    void demoStartupAndRestartPreserveFixtures() {
        try (var database = freshDatabase()) {
            for (int restart = 0; restart < 2; restart++) {
                try (var app = start(database, "demo")) {
                    var jdbc = app.getBean(JdbcTemplate.class);
                    assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isEqualTo(5);
                    assertThat(jdbc.queryForList("SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank", String.class)).containsExactly("1", "2");
                    var response = demoLogin(app);
                    assertThat(response.statusCode()).isEqualTo(200);
                    assertThat(response.jsonPath().getString("role")).isEqualTo("ADMIN");
                    assertThat(response.jsonPath().getString("token")).isNotBlank();
                }
            }
        }
    }

    @Test
    @DisplayName("INT-DATA-003 normal startup refuses a database with recorded demo provisioning")
    void seededDatabaseCannotSilentlyBecomeNormal() {
        try (var database = freshDatabase()) {
            try (var app = start(database, "demo")) {
                assertThat(demoLogin(app).statusCode()).isEqualTo(200);
            }
            assertThatThrownBy(() -> start(database, "default"))
                    .hasStackTraceContaining("Demo-provisioned database requires the explicit demo profile");
        }
    }
}
