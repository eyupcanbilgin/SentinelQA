package io.sentinelqe.workforce.leave;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
@Entity @Table(name="leave_requests")
public class LeaveRequest {
    @Id private UUID id;
    @Column(name="employee_id",nullable=false) private UUID employeeId;
    @Column(name="start_date",nullable=false) private LocalDate startDate;
    @Column(name="end_date",nullable=false) private LocalDate endDate;
    @Column(nullable=false) private int days;
    @Column(nullable=false,length=1000) private String reason;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private LeaveStatus status;
    protected LeaveRequest() { }
    public LeaveRequest(UUID id,UUID employeeId,LocalDate startDate,LocalDate endDate,int days,String reason,LeaveStatus status) { this.id=id;this.employeeId=employeeId;this.startDate=startDate;this.endDate=endDate;this.days=days;this.reason=reason;this.status=status; }
    public UUID getId(){return id;} public UUID getEmployeeId(){return employeeId;} public LocalDate getStartDate(){return startDate;} public LocalDate getEndDate(){return endDate;} public int getDays(){return days;} public String getReason(){return reason;} public LeaveStatus getStatus(){return status;}
    public void managerApprove(){status=LeavePolicy.managerApprove(status);} public void hrApprove(){status=LeavePolicy.hrApprove(status);} public void reject(){status=LeavePolicy.reject(status);}
}
