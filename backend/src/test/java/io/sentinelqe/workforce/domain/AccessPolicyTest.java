package io.sentinelqe.workforce.domain;

import io.sentinelqe.workforce.auth.AccessPolicy;
import io.sentinelqe.workforce.auth.Role;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;

class AccessPolicyTest {
    private static final UUID ACTOR = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID TARGET = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID OTHER_MANAGER = UUID.fromString("00000000-0000-0000-0000-000000000003");

    @ParameterizedTest
    @EnumSource(Role.class)
    @DisplayName("UNIT-AUTHZ-001: every role can read their own employee record")
    void permitsOwnRecord(Role role) {
        assertThat(AccessPolicy.canReadEmployee(role, ACTOR, ACTOR, OTHER_MANAGER)).isTrue();
    }

    @ParameterizedTest
    @CsvSource({"EMPLOYEE,false", "MANAGER,true", "HR,true", "ADMIN,true"})
    @DisplayName("UNIT-AUTHZ-002: direct-report visibility requires a supervisory role")
    void evaluatesDirectReportVisibility(Role role, boolean permitted) {
        assertThat(AccessPolicy.canReadEmployee(role, ACTOR, TARGET, ACTOR)).isEqualTo(permitted);
    }

    @ParameterizedTest
    @CsvSource({"EMPLOYEE,false", "MANAGER,false", "HR,true", "ADMIN,true"})
    @DisplayName("UNIT-AUTHZ-003: only HR and ADMIN can read unrelated employees")
    void evaluatesUnrelatedRecordVisibility(Role role, boolean permitted) {
        assertThat(AccessPolicy.canReadEmployee(role, ACTOR, TARGET, OTHER_MANAGER)).isEqualTo(permitted);
        assertThat(AccessPolicy.canReadEmployee(role, ACTOR, TARGET, null))
            .as("an unassigned employee is not implicitly managed by the actor")
            .isEqualTo(permitted);
    }

    @ParameterizedTest
    @EnumSource(Role.class)
    @DisplayName("UNIT-AUTHZ-004: no role can approve their own leave at either stage")
    void rejectsSelfApprovalIncludingPrivilegedRoles(Role role) {
        assertThat(AccessPolicy.canManagerApprove(role, ACTOR, ACTOR, ACTOR)).isFalse();
        assertThat(AccessPolicy.canHrApprove(role, ACTOR, ACTOR)).isFalse();
    }

    @ParameterizedTest
    @CsvSource({"EMPLOYEE,false", "MANAGER,true", "HR,false", "ADMIN,false"})
    @DisplayName("UNIT-AUTHZ-005: only the assigned manager can perform manager approval")
    void evaluatesManagerStageApproval(Role role, boolean permitted) {
        assertThat(AccessPolicy.canManagerApprove(role, ACTOR, TARGET, ACTOR)).isEqualTo(permitted);
    }

    @ParameterizedTest
    @EnumSource(Role.class)
    @DisplayName("UNIT-AUTHZ-006: unrelated employees cannot receive manager approval")
    void rejectsManagerApprovalWithoutAssignment(Role role) {
        assertThat(AccessPolicy.canManagerApprove(role, ACTOR, TARGET, OTHER_MANAGER)).isFalse();
        assertThat(AccessPolicy.canManagerApprove(role, ACTOR, TARGET, null)).isFalse();
    }

    @ParameterizedTest
    @CsvSource({"EMPLOYEE,false", "MANAGER,false", "HR,true", "ADMIN,true"})
    @DisplayName("UNIT-AUTHZ-007: only HR or ADMIN can perform HR approval for another employee")
    void evaluatesHrStageApproval(Role role, boolean permitted) {
        assertThat(AccessPolicy.canHrApprove(role, ACTOR, TARGET)).isEqualTo(permitted);
    }
}
