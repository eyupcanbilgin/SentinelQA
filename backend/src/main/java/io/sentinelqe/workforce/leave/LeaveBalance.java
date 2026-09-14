package io.sentinelqe.workforce.leave;
import jakarta.persistence.*;
import java.util.UUID;
@Entity @Table(name="leave_balances")
public class LeaveBalance {
    @Id @Column(name="employee_id") private UUID employeeId;
    @Column(name="available_days",nullable=false) private int availableDays;
    @Column(name="reserved_days",nullable=false) private int reservedDays;
    protected LeaveBalance() { }
    public LeaveBalance(UUID employeeId,int days) { this.employeeId=employeeId;this.availableDays=days; }
    public UUID getEmployeeId() { return employeeId; } public int getAvailableDays() { return availableDays; } public int getReservedDays() { return reservedDays; }
    public int spendableDays() { return availableDays-reservedDays; }
    public void reserve(int days) { LeavePolicy.requireAvailable(days,spendableDays()); reservedDays+=days; }
    public void release(int days) { if(days<=0 || days>reservedDays) throw new IllegalStateException("Invalid reservation release"); reservedDays-=days; }
    public void consume(int days) { release(days); availableDays-=days; }
}
