package io.sentinelqe.workforce;

import io.restassured.response.Response;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

@Tag("integration")
class LeaveConcurrencyIT extends PostgresIT {
    @Test
    @DisplayName("INT-LEAVE-001 concurrent requests cannot reserve more leave than the available balance")
    void INT_LEAVE_001_concurrentReservation() throws Exception {
        String bearer = token("employee1");
        var results = concurrently(() -> request().auth().oauth2(bearer)
                .body(Map.of("startDate", "2030-09-01", "endDate", "2030-09-15", "reason", "Concurrent reservation"))
                .post("/api/leave-requests"));
        assertThat(results).extracting(Response::statusCode).containsExactlyInAnyOrder(201, 409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM leave_requests", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT reserved_days FROM leave_balances WHERE employee_id = ?", Integer.class, UUID.fromString(EMPLOYEE_1)))
                .isEqualTo(15);
        assertThat(balance("employee1")).isEqualTo(20);
    }

    @Test
    @DisplayName("INT-LEAVE-002 concurrent final approvals consume leave exactly once")
    void INT_LEAVE_002_concurrentFinalApproval() throws Exception {
        String id = managedLeave();
        String bearer = token("hr");
        var results = concurrently(() -> request().auth().oauth2(bearer).post("/api/leave-requests/{id}/hr-approve", id));
        assertThat(results).extracting(Response::statusCode).containsExactlyInAnyOrder(200, 409);
        assertThat(balance("employee1")).isEqualTo(17);
        assertThat(jdbc.queryForObject("SELECT reserved_days FROM leave_balances WHERE employee_id = ?", Integer.class, UUID.fromString(EMPLOYEE_1)))
                .isZero();
        as("employee1").get("/api/leave-requests/{id}", id).then().statusCode(200).body("status", equalTo("APPROVED"));
    }
}
