package io.sentinelqe.workforce;

import io.restassured.response.Response;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

@Tag("api")
class PayrollApiIT extends PostgresIT {
    @Test
    @DisplayName("API-PAY-001 admin creates an empty payroll run for a valid period")
    void API_PAY_001_createPayroll() {
        String id = payroll("2030-01");
        Response run = as("admin").get("/api/payroll-runs/{id}", id);
        run.then().statusCode(200).body("period", equalTo("2030-01")).body("status", equalTo("CREATED"));
        assertThat(run.jsonPath().getList("items")).isEmpty();
        assertThat(new BigDecimal(run.jsonPath().getString("totalNet"))).isZero();
    }

    @Test
    @DisplayName("API-PAY-002 invalid and duplicate periods do not create additional runs")
    void API_PAY_002_duplicatePeriod() {
        payroll("2030-02");
        assertError(as("admin").body(Map.of("period", "2030-02")).post("/api/payroll-runs"), 409);
        assertError(as("admin").body(Map.of("period", "2030-13")).post("/api/payroll-runs"), 400);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payroll_runs", Integer.class)).isEqualTo(1);
    }

    @Test
    @DisplayName("API-PAY-003 accepted payroll processing completes asynchronously with one item per active employee")
    void API_PAY_003_asyncProcessing() {
        String id = payroll("2030-03");
        Response run = completedPayroll(id);
        int activeEmployees = jdbc.queryForObject("SELECT count(*) FROM employees WHERE active", Integer.class);
        assertThat(run.jsonPath().getList("items.employeeId", String.class)).hasSize(activeEmployees).doesNotHaveDuplicates();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payroll_items WHERE payroll_run_id = ?", Integer.class, UUID.fromString(id)))
                .isEqualTo(activeEmployees);
    }

    @Test
    @DisplayName("API-PAY-004 deterministic decimal amounts round correctly and total equals sum of net items")
    void API_PAY_004_decimalCalculationAndTotal() {
        BigDecimal originalSalary = jdbc.queryForObject("SELECT base_salary FROM employees WHERE id = ?", BigDecimal.class, UUID.fromString(EMPLOYEE_1));
        try {
            jdbc.update("UPDATE employees SET base_salary = 1234.57 WHERE id = ?", UUID.fromString(EMPLOYEE_1));
            Response run = completedPayroll(payroll("2030-04"));
            List<Map<String, Object>> items = run.jsonPath().getList("items");
            BigDecimal sum = BigDecimal.ZERO;
            for (Map<String, Object> item : items) {
                assertThat(item.get("baseSalary")).isInstanceOf(String.class);
                assertThat(item.get("tax")).isInstanceOf(String.class);
                assertThat(item.get("deductions")).isInstanceOf(String.class);
                assertThat(item.get("netPay")).isInstanceOf(String.class);
                BigDecimal salary = new BigDecimal((String) item.get("baseSalary"));
                BigDecimal tax = new BigDecimal((String) item.get("tax"));
                BigDecimal deductions = new BigDecimal((String) item.get("deductions"));
                BigDecimal net = new BigDecimal((String) item.get("netPay"));
                assertThat(tax).isEqualByComparingTo(salary.multiply(new BigDecimal("0.20")).setScale(2, RoundingMode.HALF_UP));
                assertThat(deductions).isEqualByComparingTo(salary.multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP));
                assertThat(net).isEqualByComparingTo(salary.subtract(tax).subtract(deductions));
                if (EMPLOYEE_1.equals(item.get("employeeId"))) {
                    assertThat(tax).isEqualByComparingTo("246.91");
                    assertThat(deductions).isEqualByComparingTo("61.73");
                    assertThat(net).isEqualByComparingTo("925.93");
                }
                sum = sum.add(net);
            }
            assertThat((Object) run.jsonPath().get("totalNet")).isInstanceOf(String.class);
            assertThat(new BigDecimal(run.jsonPath().getString("totalNet"))).isEqualByComparingTo(sum);
            assertThat(jdbc.queryForObject("SELECT sum(net_pay) FROM payroll_items", BigDecimal.class)).isEqualByComparingTo(sum);
        } finally {
            jdbc.update("UPDATE employees SET base_salary = ? WHERE id = ?", originalSalary, UUID.fromString(EMPLOYEE_1));
        }
    }

    @Test
    @DisplayName("API-PAY-005 a second finalization is rejected and cannot duplicate or modify payroll items")
    void API_PAY_005_rejectDoubleFinalize() {
        String id = payroll("2030-05");
        Response completed = completedPayroll(id);
        List<Map<String, Object>> expectedItems = completed.jsonPath().getList("items");
        String expectedTotal = completed.jsonPath().getString("totalNet");
        as("admin").post("/api/payroll-runs/{id}/finalize", id).then().statusCode(200).body("status", equalTo("FINALIZED"));
        assertError(as("admin").post("/api/payroll-runs/{id}/finalize", id), 409);
        Response finalRun = as("admin").get("/api/payroll-runs/{id}", id);
        assertThat(finalRun.jsonPath().<Map<String, Object>>getList("items")).containsExactlyInAnyOrderElementsOf(expectedItems);
        assertThat(finalRun.jsonPath().getString("totalNet")).isEqualTo(expectedTotal);
        assertThat(finalRun.jsonPath().getString("status")).isEqualTo("FINALIZED");
    }

    @Test
    @DisplayName("API-PAY-006 finalization requires completion and recalculation is forbidden")
    void API_PAY_006_rejectInvalidTransitions() {
        String id = payroll("2030-06");
        assertError(as("admin").post("/api/payroll-runs/{id}/finalize", id), 409);
        Response complete = completedPayroll(id);
        List<Map<String, Object>> expectedItems = complete.jsonPath().getList("items");
        assertError(as("admin").post("/api/payroll-runs/{id}/process", id), 409);
        as("admin").post("/api/payroll-runs/{id}/finalize", id).then().statusCode(200);
        assertError(as("admin").post("/api/payroll-runs/{id}/process", id), 409);
        assertThat(as("admin").get("/api/payroll-runs/{id}", id).jsonPath().<Map<String, Object>>getList("items"))
                .containsExactlyInAnyOrderElementsOf(expectedItems);
    }
}
