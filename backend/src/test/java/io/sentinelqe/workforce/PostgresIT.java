package io.sentinelqe.workforce;

import io.restassured.builder.RequestSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/** Shared infrastructure only: every test owns its requests, tokens and database state. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("demo")
@Execution(ExecutionMode.SAME_THREAD)
abstract class PostgresIT {
    protected static final String EMPLOYEE_1 = "00000000-0000-0000-0000-000000000001";
    protected static final String EMPLOYEE_2 = "00000000-0000-0000-0000-000000000002";
    protected static final String MANAGER = "00000000-0000-0000-0000-000000000003";
    protected static final String PASSWORD = "LocalDemo!2026";
    protected static final String JWT_SECRET = "sentinel-integration-only-secret-64-characters-for-HMAC-signing-key";
    private static final String EXTERNAL_URL = System.getProperty("test.db.url", System.getenv("TEST_DB_URL"));
    private static PostgreSQLContainer<?> database;

    @LocalServerPort private int port;
    @Autowired protected JdbcTemplate jdbc;
    private final Map<String, String> tokens = new HashMap<>();

    @DynamicPropertySource
    static void postgres(DynamicPropertyRegistry properties) {
        if (EXTERNAL_URL != null && !EXTERNAL_URL.isBlank()) {
            if (!EXTERNAL_URL.startsWith("jdbc:postgresql:")) {
                throw new IllegalArgumentException("Integration tests require PostgreSQL: test.db.url must start jdbc:postgresql:");
            }
            properties.add("spring.datasource.url", () -> EXTERNAL_URL);
            properties.add("spring.datasource.username", () -> System.getProperty("test.db.user", "sentinel"));
            properties.add("spring.datasource.password", () -> System.getProperty("test.db.password", "sentinel"));
        } else {
            // Startup failure is deliberate: a missing Docker daemon must never produce green skipped coverage.
            database = new PostgreSQLContainer<>("postgres:17.11-alpine");
            database.start();
            properties.add("spring.datasource.url", database::getJdbcUrl);
            properties.add("spring.datasource.username", database::getUsername);
            properties.add("spring.datasource.password", database::getPassword);
        }
        properties.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        properties.add("app.jwt.secret", () -> JWT_SECRET);
        properties.add("management.tracing.enabled", () -> "false");
    }

    @BeforeEach
    void resetMutableState() {
        // Explicit external mode is destructive to this disposable test database; see tests/integration/README.md.
        jdbc.execute("TRUNCATE TABLE payroll_items, payroll_runs, leave_requests, audit_events");
        jdbc.update("UPDATE leave_balances SET available_days = 20, reserved_days = 0");
        jdbc.update("UPDATE employees SET active = true");
        tokens.clear();
    }

    protected RequestSpecification request() {
        return given().spec(new RequestSpecBuilder().setBaseUri("http://127.0.0.1").setPort(port)
                .setContentType(ContentType.JSON).build());
    }

    protected RequestSpecification as(String account) {
        return request().auth().oauth2(token(account));
    }

    protected String token(String account) {
        return tokens.computeIfAbsent(account, email -> request().body(Map.of(
                "email", email + "@example.test", "password", PASSWORD))
                .post("/api/auth/login").then().statusCode(200).extract().path("token"));
    }

    protected String leave(String account, String start, String end) {
        return as(account).body(Map.of("startDate", start, "endDate", end, "reason", "Independent API fixture"))
                .post("/api/leave-requests").then().statusCode(201).extract().path("id");
    }

    protected String managedLeave() {
        String id = leave("employee1", "2030-06-03", "2030-06-05");
        as("manager").post("/api/leave-requests/{id}/manager-approve", id)
                .then().statusCode(200).body("status", org.hamcrest.Matchers.equalTo("PENDING_HR"));
        return id;
    }

    protected int balance(String account) {
        return as(account).get("/api/leave-balances/me").then().statusCode(200).extract().path("availableDays");
    }

    protected String payroll(String period) {
        return as("admin").body(Map.of("period", period)).post("/api/payroll-runs")
                .then().statusCode(201).extract().path("id");
    }

    protected Response completedPayroll(String id) {
        as("admin").post("/api/payroll-runs/{id}/process", id).then().statusCode(202);
        await().atMost(Duration.ofSeconds(15)).pollInterval(Duration.ofMillis(100)).untilAsserted(() -> {
            Response response = as("admin").get("/api/payroll-runs/{id}", id);
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(response.jsonPath().getString("status")).isEqualTo("COMPLETED");
        });
        return as("admin").get("/api/payroll-runs/{id}", id);
    }

    protected List<Response> concurrently(Callable<Response> operation) throws Exception {
        CyclicBarrier barrier = new CyclicBarrier(2);
        try (var executor = Executors.newFixedThreadPool(2)) {
            Callable<Response> synchronizedOperation = () -> {
                barrier.await(10, TimeUnit.SECONDS);
                return operation.call();
            };
            var first = executor.submit(synchronizedOperation);
            var second = executor.submit(synchronizedOperation);
            return List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
        }
    }

    protected void assertError(Response response, int status) {
        assertThat(response.statusCode()).isEqualTo(status);
        assertThat(response.jsonPath().getString("code")).isNotBlank();
        assertThat(response.jsonPath().getString("message")).isNotBlank();
        assertThat(response.jsonPath().getString("correlationId")).isNotBlank();
        assertThat(response.jsonPath().getMap("$").keySet()).containsExactlyInAnyOrder("code", "message", "correlationId");
        assertThat(response.asString()).doesNotContain("stackTrace", "java.lang.", "org.springframework", "baseSalary", "password_hash");
    }
}
