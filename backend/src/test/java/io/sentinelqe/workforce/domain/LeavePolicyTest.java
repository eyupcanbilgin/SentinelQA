package io.sentinelqe.workforce.domain;

import io.sentinelqe.workforce.common.DomainException;
import io.sentinelqe.workforce.leave.LeavePolicy;
import io.sentinelqe.workforce.leave.LeaveStatus;
import java.time.LocalDate;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LeavePolicyTest {
    @ParameterizedTest(name = "{0} through {1} consumes {2} calendar days")
    @CsvSource({
        "2026-09-14,2026-09-14,1",
        "2026-09-14,2026-09-15,2",
        "2026-09-18,2026-09-21,4",
        "2024-02-28,2024-03-01,3",
        "2025-02-28,2025-03-01,2",
        "2026-12-31,2027-01-01,2"
    })
    @DisplayName("UNIT-LEAVE-001: inclusive calendar duration includes weekends and leap day")
    void calculatesInclusiveCalendarDays(LocalDate start, LocalDate end, int expectedDays) {
        assertThat(LeavePolicy.duration(start, end)).isEqualTo(expectedDays);
    }

    @ParameterizedTest
    @MethodSource("invalidDates")
    @DisplayName("UNIT-LEAVE-002: missing or reversed dates have a stable domain error")
    void rejectsInvalidDates(LocalDate start, LocalDate end) {
        assertThatThrownBy(() -> LeavePolicy.duration(start, end))
            .isInstanceOfSatisfying(DomainException.class,
                error -> assertThat(error.code()).isEqualTo("INVALID_LEAVE_DATES"));
    }

    static Stream<Arguments> invalidDates() {
        LocalDate date = LocalDate.of(2026, 9, 14);
        return Stream.of(
            Arguments.of(date, date.minusDays(1)),
            Arguments.of(null, date),
            Arguments.of(date, null),
            Arguments.of(null, null));
    }

    @ParameterizedTest
    @CsvSource({"1,1", "5,5", "1,20", "19,20"})
    @DisplayName("UNIT-LEAVE-003: exact remaining balance can be requested")
    void permitsLeaveWithinAvailableBalance(int requestedDays, int availableDays) {
        assertThatCode(() -> LeavePolicy.requireAvailable(requestedDays, availableDays))
            .doesNotThrowAnyException();
    }

    @ParameterizedTest
    @CsvSource({"1,0", "6,5", "21,20", "1,-1"})
    @DisplayName("UNIT-LEAVE-004: overdrawing available balance is rejected")
    void rejectsInsufficientBalance(int requestedDays, int availableDays) {
        assertThatThrownBy(() -> LeavePolicy.requireAvailable(requestedDays, availableDays))
            .isInstanceOfSatisfying(DomainException.class,
                error -> assertThat(error.code()).isEqualTo("INSUFFICIENT_LEAVE_BALANCE"));
    }

    @ParameterizedTest
    @CsvSource({"0,20", "-1,20", "-10,0"})
    @DisplayName("UNIT-LEAVE-005: nonpositive requests cannot bypass balance validation")
    void rejectsNonpositiveDuration(int requestedDays, int availableDays) {
        assertThatThrownBy(() -> LeavePolicy.requireAvailable(requestedDays, availableDays))
            .isInstanceOfSatisfying(DomainException.class,
                error -> assertThat(error.code()).isEqualTo("INVALID_LEAVE_DAYS"));
    }

    @Test
    @DisplayName("UNIT-LEAVE-006: approvals require manager then HR")
    void followsTwoStageApprovalWorkflow() {
        LeaveStatus managerApproved = LeavePolicy.managerApprove(LeaveStatus.PENDING_MANAGER);
        assertThat(managerApproved).isEqualTo(LeaveStatus.PENDING_HR);
        assertThat(LeavePolicy.hrApprove(managerApproved)).isEqualTo(LeaveStatus.APPROVED);
    }

    @ParameterizedTest
    @EnumSource(value = LeaveStatus.class, names = "PENDING_MANAGER", mode = EnumSource.Mode.EXCLUDE)
    @DisplayName("UNIT-LEAVE-007: manager approval cannot replay or change a final decision")
    void rejectsManagerApprovalFromAnyOtherState(LeaveStatus state) {
        assertInvalidState(() -> LeavePolicy.managerApprove(state));
    }

    @ParameterizedTest
    @EnumSource(value = LeaveStatus.class, names = "PENDING_HR", mode = EnumSource.Mode.EXCLUDE)
    @DisplayName("UNIT-LEAVE-008: HR cannot bypass manager approval or replay approval")
    void rejectsHrApprovalFromAnyOtherState(LeaveStatus state) {
        assertInvalidState(() -> LeavePolicy.hrApprove(state));
    }

    @ParameterizedTest
    @EnumSource(value = LeaveStatus.class, names = {"PENDING_MANAGER", "PENDING_HR"})
    @DisplayName("UNIT-LEAVE-009: either pending stage permits rejection")
    void rejectsPendingRequest(LeaveStatus state) {
        assertThat(LeavePolicy.reject(state)).isEqualTo(LeaveStatus.REJECTED);
    }

    @ParameterizedTest
    @EnumSource(value = LeaveStatus.class, names = {"APPROVED", "REJECTED"})
    @DisplayName("UNIT-LEAVE-010: terminal leave decisions are immutable")
    void cannotRejectFinalDecision(LeaveStatus state) {
        assertInvalidState(() -> LeavePolicy.reject(state));
    }

    private static void assertInvalidState(Runnable transition) {
        assertThatThrownBy(transition::run)
            .isInstanceOfSatisfying(DomainException.class,
                error -> assertThat(error.code()).isEqualTo("INVALID_LEAVE_STATE"));
    }
}
