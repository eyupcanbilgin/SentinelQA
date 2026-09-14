package io.sentinelqe.workforce;

import io.restassured.response.Response;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

@Tag("api")
class LeaveApiIT extends PostgresIT {
    @Test
    @DisplayName("API-LEAVE-001 creating own leave reserves inclusive calendar days without spending the balance")
    void API_LEAVE_001_createValidRequest() {
        String id = leave("employee1", "2030-06-03", "2030-06-05");
        as("employee1").get("/api/leave-requests/{id}", id).then().statusCode(200)
                .body("employeeId", equalTo(EMPLOYEE_1)).body("days", equalTo(3)).body("status", equalTo("PENDING_MANAGER"));
        assertThat(balance("employee1")).isEqualTo(20);
        assertThat(reservedDays()).isEqualTo(3);
    }

    @Test
    @DisplayName("API-LEAVE-002 reversed dates and empty reason cannot create leave or reserve balance")
    void API_LEAVE_002_invalidDateRange() {
        assertError(as("employee1").body(Map.of("startDate", "2030-06-05", "endDate", "2030-06-03", "reason", "Invalid range"))
                .post("/api/leave-requests"), 400);
        assertError(as("employee1").body(Map.of("startDate", "2030-06-03", "endDate", "2030-06-03", "reason", ""))
                .post("/api/leave-requests"), 400);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM leave_requests", Integer.class)).isZero();
        assertThat(reservedDays()).isZero();
        assertThat(balance("employee1")).isEqualTo(20);
    }

    @Test
    @DisplayName("API-LEAVE-003 insufficient balance rejects the request atomically")
    void API_LEAVE_003_insufficientBalance() {
        assertError(as("employee1").body(Map.of("startDate", "2030-06-01", "endDate", "2030-06-21", "reason", "Exceeds 20 days"))
                .post("/api/leave-requests"), 409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM leave_requests", Integer.class)).isZero();
        assertThat(balance("employee1")).isEqualTo(20);
        assertThat(reservedDays()).isZero();
    }

    @Test
    @DisplayName("API-LEAVE-004 direct manager approval advances state without consuming leave")
    void API_LEAVE_004_managerApproval() {
        String id = managedLeave();
        assertThat(balance("employee1")).isEqualTo(20);
        assertThat(reservedDays()).isEqualTo(3);
        assertError(as("manager").post("/api/leave-requests/{id}/manager-approve", id), 409);
        as("employee1").get("/api/leave-requests/{id}", id).then().statusCode(200).body("status", equalTo("PENDING_HR"));
    }

    @Test
    @DisplayName("API-LEAVE-005 managers cannot approve their own or unrelated employees' requests")
    void API_LEAVE_005_managerApprovalBoundaries() {
        String self = leave("manager", "2030-06-10", "2030-06-10");
        String unrelated = leave("employee2", "2030-06-10", "2030-06-10");
        assertError(as("manager").post("/api/leave-requests/{id}/manager-approve", self), 403);
        assertError(as("manager").post("/api/leave-requests/{id}/manager-approve", unrelated), 403);
        assertThat(balance("manager")).isEqualTo(20);
        assertThat(balance("employee2")).isEqualTo(20);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM leave_requests WHERE status = 'APPROVED'", Integer.class)).isZero();
    }

    @Test
    @DisplayName("API-LEAVE-006 HR approval requires manager approval and spends days exactly once")
    void API_LEAVE_006_hrApprovalExactlyOnce() {
        String id = leave("employee1", "2030-06-03", "2030-06-05");
        assertError(as("hr").post("/api/leave-requests/{id}/hr-approve", id), 409);
        assertThat(balance("employee1")).isEqualTo(20);
        as("manager").post("/api/leave-requests/{id}/manager-approve", id).then().statusCode(200);
        as("hr").post("/api/leave-requests/{id}/hr-approve", id).then().statusCode(200).body("status", equalTo("APPROVED"));
        assertThat(balance("employee1")).isEqualTo(17);
        assertThat(reservedDays()).isZero();
        assertError(as("hr").post("/api/leave-requests/{id}/hr-approve", id), 409);
        assertThat(balance("employee1")).isEqualTo(17);
    }

    @Test
    @DisplayName("API-LEAVE-007 rejection releases reserved days without reducing available leave")
    void API_LEAVE_007_rejectionReleasesReservation() {
        String managerStage = leave("employee1", "2030-06-03", "2030-06-05");
        as("manager").post("/api/leave-requests/{id}/reject", managerStage).then().statusCode(200).body("status", equalTo("REJECTED"));
        assertThat(balance("employee1")).isEqualTo(20);
        assertThat(reservedDays()).isZero();
        String hrStage = managedLeave();
        as("hr").post("/api/leave-requests/{id}/reject", hrStage).then().statusCode(200).body("status", equalTo("REJECTED"));
        assertThat(balance("employee1")).isEqualTo(20);
        assertThat(reservedDays()).isZero();
        // All 20 days are usable again, proving pending reservations do not leak after rejection.
        leave("employee1", "2030-07-01", "2030-07-20");
        assertThat(reservedDays()).isEqualTo(20);
    }

    @Test
    @DisplayName("API-LEAVE-008 inactive employees cannot submit new leave")
    void API_LEAVE_008_inactiveEmployee() {
        token("employee1");
        jdbc.update("UPDATE employees SET active = false WHERE id = ?", UUID.fromString(EMPLOYEE_1));
        assertError(as("employee1").body(Map.of("startDate", "2030-06-03", "endDate", "2030-06-05", "reason", "Inactive employee"))
                .post("/api/leave-requests"), 409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM leave_requests", Integer.class)).isZero();
        assertThat(reservedDays()).isZero();
    }

    @Test
    @DisplayName("API-LEAVE-009 final decisions cannot be changed and clients cannot impersonate leave owners")
    void API_LEAVE_009_immutableDecisionAndOwner() {
        assertError(as("employee1").body(Map.of("employeeId", EMPLOYEE_2, "startDate", "2030-06-03", "endDate", "2030-06-05", "reason", "Forged owner"))
                .post("/api/leave-requests"), 400);
        String id = managedLeave();
        as("hr").post("/api/leave-requests/{id}/hr-approve", id).then().statusCode(200);
        assertError(as("hr").post("/api/leave-requests/{id}/reject", id), 409);
        assertError(as("manager").post("/api/leave-requests/{id}/manager-approve", id), 409);
        as("employee1").get("/api/leave-requests/{id}", id).then().statusCode(200).body("status", equalTo("APPROVED"));
        assertThat(balance("employee1")).isEqualTo(17);

        String hrOwn = leave("hr", "2030-07-01", "2030-07-01");
        assertError(as("hr").post("/api/leave-requests/{id}/hr-approve", hrOwn), 403);
        assertError(as("hr").post("/api/leave-requests/{id}/reject", hrOwn), 403);
        assertThat(balance("hr")).isEqualTo(20);
    }

    private int reservedDays() {
        return jdbc.queryForObject("SELECT reserved_days FROM leave_balances WHERE employee_id = ?", Integer.class, UUID.fromString(EMPLOYEE_1));
    }
}
