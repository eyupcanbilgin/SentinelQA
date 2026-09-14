package io.sentinelqe.workforce.employee;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
@Entity @Table(name="employees")
public class Employee {
    @Id private UUID id;
    @Column(nullable=false) private String name;
    @Column(nullable=false,unique=true) private String email;
    @Column(name="department_id",nullable=false) private UUID departmentId;
    @Column(name="manager_id") private UUID managerId;
    @Column(nullable=false) private boolean active;
    @Column(name="base_salary",nullable=false,precision=14,scale=2) private BigDecimal baseSalary;
    protected Employee() { }
    public Employee(UUID id,String name,String email,UUID departmentId,UUID managerId,boolean active,BigDecimal baseSalary) { this.id=id;this.name=name;this.email=email;this.departmentId=departmentId;this.managerId=managerId;this.active=active;this.baseSalary=baseSalary; }
    public UUID getId() { return id; } public String getName() { return name; } public String getEmail() { return email; } public UUID getDepartmentId() { return departmentId; } public UUID getManagerId() { return managerId; } public boolean isActive() { return active; } public BigDecimal getBaseSalary() { return baseSalary; }
}
