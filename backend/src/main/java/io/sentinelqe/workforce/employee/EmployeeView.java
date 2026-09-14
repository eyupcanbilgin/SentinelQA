package io.sentinelqe.workforce.employee;
import java.util.UUID;
public record EmployeeView(UUID id,String name,String email,UUID departmentId,UUID managerId,boolean active,String baseSalary) {
    public static EmployeeView of(Employee e) { return new EmployeeView(e.getId(),e.getName(),e.getEmail(),e.getDepartmentId(),e.getManagerId(),e.isActive(),e.getBaseSalary().toPlainString()); }
}
