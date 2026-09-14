package io.sentinelqe.workforce.auth;

import io.sentinelqe.workforce.common.DomainException;
import io.sentinelqe.workforce.employee.EmployeeRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository users; private final EmployeeRepository employees; private final PasswordEncoder passwords; private final JwtEncoder encoder; private final long ttl;
    private final String dummyHash;
    public AuthController(UserRepository users, EmployeeRepository employees, PasswordEncoder passwords, JwtEncoder encoder, @Value("${app.jwt.ttl-seconds}") long ttl) { this.users=users; this.employees=employees; this.passwords=passwords; this.encoder=encoder; this.ttl=ttl; this.dummyHash=passwords.encode(UUID.randomUUID().toString()); }
    public record LoginRequest(@NotBlank @Email @Size(max=254) String email, @NotBlank @Size(max=128) String password) { }
    public record LoginResponse(String token, Role role, UUID employeeId, String name) { }
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest input) {
        UserAccount user = users.findByEmail(input.email().toLowerCase(Locale.ROOT)).orElse(null);
        boolean matches = passwords.matches(input.password(), user == null ? dummyHash : user.getPasswordHash());
        if (user == null || !matches) throw new DomainException("INVALID_CREDENTIALS", "Email or password is incorrect", HttpStatus.UNAUTHORIZED);
        var employee = employees.findById(user.getEmployeeId()).orElseThrow(DomainException::notFound);
        if (!employee.isActive()) throw new DomainException("INVALID_CREDENTIALS", "Email or password is incorrect", HttpStatus.UNAUTHORIZED);
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer("workforceops").subject(user.getId().toString()).issuedAt(now).expiresAt(now.plusSeconds(ttl)).claim("role", user.getRole().name()).claim("employeeId", user.getEmployeeId().toString()).build();
        String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new LoginResponse(token, user.getRole(), employee.getId(), employee.getName());
    }
}
