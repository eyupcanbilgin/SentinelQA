package io.sentinelqe.workforce.auth;

import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

public record Actor(UUID employeeId, Role role) {
    public static Actor current() {
        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return new Actor(UUID.fromString(jwt.getClaimAsString("employeeId")), Role.valueOf(jwt.getClaimAsString("role")));
    }
}
