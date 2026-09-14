package io.sentinelqe.workforce.auth;

import java.util.UUID;

public final class AccessPolicy {
    private AccessPolicy() { }
    public static boolean canReadEmployee(Role role, UUID actor, UUID target, UUID targetManager) {
        return actor.equals(target) || role == Role.HR || role == Role.ADMIN || (role == Role.MANAGER && actor.equals(targetManager));
    }
    public static boolean canManagerApprove(Role role, UUID actor, UUID target, UUID targetManager) {
        return role == Role.MANAGER && !actor.equals(target) && actor.equals(targetManager);
    }
    public static boolean canHrApprove(Role role, UUID actor, UUID target) { return (role == Role.HR || role == Role.ADMIN) && !actor.equals(target); }
}
