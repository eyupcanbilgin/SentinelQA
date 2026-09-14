package io.sentinelqe.workforce.domain;

import io.sentinelqe.workforce.common.DomainException;
import io.sentinelqe.workforce.payroll.PayrollPolicy;
import io.sentinelqe.workforce.payroll.PayrollStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PayrollPolicyTest {
    @ParameterizedTest
    @EnumSource(value = PayrollStatus.class, names = {"CREATED", "FAILED"})
    @DisplayName("UNIT-PAY-004: only a new or failed payroll run may be processed")
    void permitsNewRunAndFailedRunRetry(PayrollStatus status) {
        assertThatCode(() -> PayrollPolicy.requireProcessable(status)).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @EnumSource(value = PayrollStatus.class, names = {"PROCESSING", "COMPLETED", "FINALIZED"})
    @DisplayName("UNIT-PAY-005: payroll processing cannot duplicate work or recalculate final payroll")
    void rejectsProcessingForOtherStates(PayrollStatus status) {
        assertInvalidState(() -> PayrollPolicy.requireProcessable(status));
    }

    @ParameterizedTest
    @EnumSource(value = PayrollStatus.class, names = "COMPLETED")
    @DisplayName("UNIT-PAY-006: a completed payroll run may be finalized")
    void permitsCompletedRunFinalization(PayrollStatus status) {
        assertThatCode(() -> PayrollPolicy.requireFinalizable(status)).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @EnumSource(value = PayrollStatus.class, names = "COMPLETED", mode = EnumSource.Mode.EXCLUDE)
    @DisplayName("UNIT-PAY-007: unfinished runs and already finalized runs cannot be finalized")
    void rejectsPrematureAndRepeatedFinalization(PayrollStatus status) {
        assertInvalidState(() -> PayrollPolicy.requireFinalizable(status));
    }

    private static void assertInvalidState(Runnable operation) {
        assertThatThrownBy(operation::run)
            .isInstanceOfSatisfying(DomainException.class,
                error -> assertThat(error.code()).isEqualTo("INVALID_PAYROLL_STATE"));
    }
}
