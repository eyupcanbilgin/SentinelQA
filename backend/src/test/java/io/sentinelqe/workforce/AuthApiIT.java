package io.sentinelqe.workforce;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import io.restassured.response.Response;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

@Tag("api")
class AuthApiIT extends PostgresIT {
    @Test
    @DisplayName("API-AUTH-001 valid login grants an own-record token without credential disclosure")
    void API_AUTH_001_validLogin() {
        Response response = request().body(Map.of("email", "employee1@example.test", "password", PASSWORD))
                .post("/api/auth/login");
        response.then().statusCode(200).body("role", equalTo("EMPLOYEE")).body("employeeId", equalTo(EMPLOYEE_1));
        assertThat(response.jsonPath().getString("token")).isNotBlank();
        assertThat(response.asString()).doesNotContain(PASSWORD, "passwordHash", "password_hash");
        request().auth().oauth2(response.jsonPath().getString("token")).get("/api/employees/{id}", EMPLOYEE_1)
                .then().statusCode(200).body("id", equalTo(EMPLOYEE_1));
    }

    @Test
    @DisplayName("API-AUTH-002 invalid credentials return a bounded correlated error")
    void API_AUTH_002_invalidPassword() {
        Response response = request().header("X-Correlation-ID", "api-auth-002")
                .body(Map.of("email", "employee1@example.test", "password", "wrong-password"))
                .post("/api/auth/login");
        assertError(response, 401);
        assertThat(response.jsonPath().getString("correlationId")).isEqualTo("api-auth-002");
        assertThat(response.header("X-Correlation-ID")).isEqualTo("api-auth-002");
        assertThat(response.asString()).doesNotContain("wrong-password", "token");
    }

    @Test
    @Tag("security")
    @DisplayName("API-AUTH-003 a protected endpoint denies a missing token")
    void API_AUTH_003_missingToken() {
        assertError(request().get("/api/employees"), 401);
    }

    @Test
    @Tag("security")
    @DisplayName("API-AUTH-004 malformed, tampered and correctly signed expired JWTs are denied")
    void API_AUTH_004_invalidAndExpiredTokens() throws Exception {
        assertError(request().auth().oauth2("not-a-jwt").get("/api/employees"), 401);
        String valid = token("employee1");
        int signatureStart = valid.lastIndexOf('.') + 1;
        String tampered = valid.substring(0, signatureStart)
                + (valid.charAt(signatureStart) == 'A' ? 'B' : 'A') + valid.substring(signatureStart + 1);
        assertError(request().auth().oauth2(tampered).get("/api/employees"), 401);

        String userId = jdbc.queryForObject("SELECT id::text FROM users WHERE email = ?", String.class, "employee1@example.test");
        SignedJWT expired = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), new JWTClaimsSet.Builder()
                .subject(userId).issuer("workforceops").claim("role", "EMPLOYEE").claim("employeeId", EMPLOYEE_1)
                .issueTime(Date.from(Instant.now().minusSeconds(3600)))
                .expirationTime(Date.from(Instant.now().minusSeconds(120))).build());
        expired.sign(new MACSigner(JWT_SECRET.getBytes(StandardCharsets.UTF_8)));
        assertError(request().auth().oauth2(expired.serialize()).get("/api/employees"), 401);
    }

    @Test
    @Tag("security")
    @DisplayName("SEC-AUTHZ-001 employee can read own record but cannot disclose another employee's salary")
    void SEC_AUTHZ_001_employeeObjectBoundary() {
        as("employee1").get("/api/employees/{id}", EMPLOYEE_1).then().statusCode(200).body("id", equalTo(EMPLOYEE_1));
        assertError(as("employee1").get("/api/employees/{id}", EMPLOYEE_2), 403);
        assertThat(as("employee1").get("/api/employees").then().statusCode(200).extract().jsonPath().getList("id", String.class))
                .containsExactly(EMPLOYEE_1);
    }

    @Test
    @Tag("security")
    @DisplayName("SEC-AUTHZ-002 manager access is limited to own record and direct reports")
    void SEC_AUTHZ_002_managerObjectBoundary() {
        as("manager").get("/api/employees/{id}", EMPLOYEE_1).then().statusCode(200).body("id", equalTo(EMPLOYEE_1));
        assertError(as("manager").get("/api/employees/{id}", EMPLOYEE_2), 403);
        assertThat(as("manager").get("/api/employees").then().statusCode(200).extract().jsonPath().getList("id", String.class))
                .containsExactlyInAnyOrder(EMPLOYEE_1, MANAGER);
    }

    @Test
    @Tag("security")
    @DisplayName("SEC-AUTHZ-003 non-admin roles cannot read, create, process or finalize payroll")
    void SEC_AUTHZ_003_adminOnlyPayroll() {
        String id = payroll("2030-07");
        for (String account : new String[] {"employee1", "manager", "hr"}) {
            assertError(as(account).body(Map.of("period", "2030-08")).post("/api/payroll-runs"), 403);
            assertError(as(account).get("/api/payroll-runs"), 403);
            assertError(as(account).get("/api/payroll-runs/{id}", id), 403);
            assertError(as(account).post("/api/payroll-runs/{id}/process", id), 403);
            assertError(as(account).post("/api/payroll-runs/{id}/finalize", id), 403);
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payroll_runs", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payroll_items", Integer.class)).isZero();
        as("admin").get("/api/payroll-runs/{id}", id).then().statusCode(200).body("status", equalTo("CREATED"));
    }

    @Test
    @Tag("security")
    @DisplayName("SEC-AUTHZ-004 leave requests enforce object access in detail and collection endpoints")
    void SEC_AUTHZ_004_leaveObjectBoundary() {
        String own = leave("employee1", "2030-08-01", "2030-08-01");
        String other = leave("employee2", "2030-08-02", "2030-08-02");
        assertError(as("employee1").get("/api/leave-requests/{id}", other), 403);
        assertError(as("manager").get("/api/leave-requests/{id}", other), 403);
        assertThat(as("employee1").get("/api/leave-requests").then().statusCode(200).extract().jsonPath().getList("id", String.class))
                .containsExactly(own);
        as("manager").get("/api/leave-requests/{id}", own).then().statusCode(200).body("employeeId", equalTo(EMPLOYEE_1));
    }
}
