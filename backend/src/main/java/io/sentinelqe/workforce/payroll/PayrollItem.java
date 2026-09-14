package io.sentinelqe.workforce.payroll;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
@Entity @Table(name="payroll_items")
public class PayrollItem {
    @Id private UUID id;
    @Column(name="payroll_run_id",nullable=false) private UUID payrollRunId;
    @Column(name="employee_id",nullable=false) private UUID employeeId;
    @Column(name="base_salary",nullable=false,precision=14,scale=2) private BigDecimal baseSalary;
    @Column(nullable=false,precision=14,scale=2) private BigDecimal tax;
    @Column(nullable=false,precision=14,scale=2) private BigDecimal deductions;
    @Column(name="net_pay",nullable=false,precision=14,scale=2) private BigDecimal netPay;
    protected PayrollItem(){}
    public PayrollItem(UUID runId,UUID employeeId,PayrollCalculator.Calculation c){this.id=UUID.randomUUID();this.payrollRunId=runId;this.employeeId=employeeId;this.baseSalary=c.baseSalary();this.tax=c.tax();this.deductions=c.deductions();this.netPay=c.netPay();}
    public UUID getId(){return id;} public UUID getEmployeeId(){return employeeId;} public BigDecimal getBaseSalary(){return baseSalary;} public BigDecimal getTax(){return tax;} public BigDecimal getDeductions(){return deductions;} public BigDecimal getNetPay(){return netPay;}
}
