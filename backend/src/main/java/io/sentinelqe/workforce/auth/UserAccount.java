package io.sentinelqe.workforce.auth;

import jakarta.persistence.*;
import java.util.UUID;

@Entity @Table(name="users")
public class UserAccount {
    @Id private UUID id;
    @Column(nullable=false,unique=true) private String email;
    @Column(name="password_hash",nullable=false) private String passwordHash;
    @Column(name="employee_id",nullable=false,unique=true) private UUID employeeId;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private Role role;
    protected UserAccount() { }
    public UserAccount(UUID id, String email, String passwordHash, UUID employeeId, Role role) { this.id=id; this.email=email; this.passwordHash=passwordHash; this.employeeId=employeeId; this.role=role; }
    public UUID getId() { return id; } public String getEmail() { return email; } public String getPasswordHash() { return passwordHash; } public UUID getEmployeeId() { return employeeId; } public Role getRole() { return role; }
}
