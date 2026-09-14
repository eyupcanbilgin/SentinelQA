package io.sentinelqe.workforce.domain;

import io.sentinelqe.workforce.payroll.PayrollCalculator;
import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PayrollCalculatorTest {
    private final PayrollCalculator calculator = new PayrollCalculator();

    @ParameterizedTest(name = "salary {0}: tax {1}, deductions {2}, net {3}")
    @CsvSource({
        "0.00,0.00,0.00,0.00",
        "0.01,0.00,0.00,0.01",
        "0.02,0.00,0.00,0.02",
        "0.03,0.01,0.00,0.02",
        "0.10,0.02,0.01,0.07",
        "0.15,0.03,0.01,0.11",
        "1000.00,200.00,50.00,750.00",
        "1000.10,200.02,50.01,750.07",
        "1234.56,246.91,61.73,925.92",
        "9999999999.99,2000000000.00,500000000.00,7499999999.99"
    })
    @DisplayName("UNIT-PAY-001: decimal payroll rounds each deduction HALF_UP before computing net")
    void calculatesDocumentedPayrollAmounts(
        BigDecimal salary, BigDecimal tax, BigDecimal deductions, BigDecimal netPay
    ) {
        PayrollCalculator.Calculation result = calculator.calculate(salary);

        assertThat(result.baseSalary()).isEqualByComparingTo(salary);
        assertThat(result.tax()).isEqualTo(tax);
        assertThat(result.deductions()).isEqualTo(deductions);
        assertThat(result.netPay()).isEqualTo(netPay);
        assertThat(result.netPay().add(result.tax()).add(result.deductions()))
            .as("net pay plus rounded withheld amounts must reconcile to the salary")
            .isEqualByComparingTo(salary);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "1", "1000.0", "1234.56"})
    @DisplayName("UNIT-PAY-002: equivalent valid salary inputs always produce cent-denominated outputs")
    void returnsFixedTwoDecimalAmounts(String salary) {
        PayrollCalculator.Calculation result = calculator.calculate(new BigDecimal(salary));

        assertThat(result.tax().scale()).isEqualTo(2);
        assertThat(result.deductions().scale()).isEqualTo(2);
        assertThat(result.netPay().scale()).isEqualTo(2);
        assertThat(calculator.calculate(new BigDecimal(salary)))
            .as("repeated calculation must be deterministic")
            .isEqualTo(result);
    }

    @ParameterizedTest
    @ValueSource(strings = {"-0.01", "-1", "-1000.00", "0.001", "12.345", "1.000"})
    @DisplayName("UNIT-PAY-003: negative or sub-cent salaries are invalid inputs")
    void rejectsInvalidSalaries(String salary) {
        assertThatThrownBy(() -> calculator.calculate(new BigDecimal(salary)))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
