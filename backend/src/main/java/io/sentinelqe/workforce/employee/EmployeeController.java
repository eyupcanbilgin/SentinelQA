package io.sentinelqe.workforce.employee;
import io.sentinelqe.workforce.auth.*;
import io.sentinelqe.workforce.audit.AuditService;
import io.sentinelqe.workforce.common.DomainException;
import io.sentinelqe.workforce.leave.LeaveBalance;
import io.sentinelqe.workforce.leave.LeaveBalanceRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class EmployeeController {
    private final EmployeeRepository employees; private final DepartmentRepository departments; private final LeaveBalanceRepository balances; private final AuditService audit;
    public EmployeeController(EmployeeRepository employees,DepartmentRepository departments,LeaveBalanceRepository balances,AuditService audit) { this.employees=employees;this.departments=departments;this.balances=balances;this.audit=audit; }
    @GetMapping("/employees") public List<EmployeeView> list() { Actor a=Actor.current(); return employees.findAll().stream().filter(e->AccessPolicy.canReadEmployee(a.role(),a.employeeId(),e.getId(),e.getManagerId())).map(EmployeeView::of).toList(); }
    @GetMapping("/employees/{id}") public EmployeeView get(@PathVariable UUID id) { Employee e=employees.findById(id).orElseThrow(DomainException::notFound); Actor a=Actor.current(); if(!AccessPolicy.canReadEmployee(a.role(),a.employeeId(),e.getId(),e.getManagerId())) throw DomainException.forbidden(); return EmployeeView.of(e); }
    public record CreateEmployee(@NotBlank @Size(max=120) String name,@NotBlank @Email @Size(max=254) String email,@NotNull UUID departmentId,UUID managerId,@NotNull @DecimalMin("0.00") @Digits(integer=12,fraction=2) BigDecimal baseSalary) { }
    @PostMapping("/employees") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('ADMIN')") @Transactional
    public EmployeeView create(@Valid @RequestBody CreateEmployee input) {
        if(!departments.existsById(input.departmentId())) throw new DomainException("INVALID_DEPARTMENT","Department does not exist",HttpStatus.BAD_REQUEST);
        if(input.managerId()!=null && !employees.existsById(input.managerId())) throw new DomainException("INVALID_MANAGER","Manager does not exist",HttpStatus.BAD_REQUEST);
        Employee e=employees.save(new Employee(UUID.randomUUID(),input.name().strip(),input.email().toLowerCase(Locale.ROOT),input.departmentId(),input.managerId(),true,input.baseSalary().setScale(2)));
        balances.save(new LeaveBalance(e.getId(),20)); audit.record(Actor.current().employeeId(),"EMPLOYEE_CREATED","employee",e.getId()); return EmployeeView.of(e);
    }
    public record DepartmentView(UUID id,String name) { }
    @GetMapping("/departments") public List<DepartmentView> departments() { return departments.findAll().stream().map(d->new DepartmentView(d.getId(),d.getName())).toList(); }
}
