package io.sentinelqe.workforce.leave;
import java.time.LocalDate;
import java.util.UUID;
public record LeaveView(UUID id,UUID employeeId,String employeeName,LocalDate startDate,LocalDate endDate,int days,String reason,LeaveStatus status) {
    public static LeaveView of(LeaveRequest request,String name) { return new LeaveView(request.getId(),request.getEmployeeId(),name,request.getStartDate(),request.getEndDate(),request.getDays(),request.getReason(),request.getStatus()); }
}
