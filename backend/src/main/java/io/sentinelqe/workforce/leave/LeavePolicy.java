package io.sentinelqe.workforce.leave;
import io.sentinelqe.workforce.common.DomainException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.springframework.http.HttpStatus;
public final class LeavePolicy {
    private LeavePolicy() { }
    public static int duration(LocalDate start,LocalDate end) {
        if(start==null || end==null || end.isBefore(start)) throw new DomainException("INVALID_LEAVE_DATES","Leave end must be on or after start",HttpStatus.BAD_REQUEST);
        long days=ChronoUnit.DAYS.between(start,end)+1;
        if(days>Integer.MAX_VALUE) throw new DomainException("INVALID_LEAVE_DATES","Leave range is too large",HttpStatus.BAD_REQUEST);
        return (int)days;
    }
    public static void requireAvailable(int days,int available) {
        if(days<=0) throw new DomainException("INVALID_LEAVE_DAYS","Leave duration must be positive",HttpStatus.BAD_REQUEST);
        if(days>available) throw DomainException.conflict("INSUFFICIENT_LEAVE_BALANCE","Requested leave exceeds available balance");
    }
    public static LeaveStatus managerApprove(LeaveStatus status) { if(status!=LeaveStatus.PENDING_MANAGER) throw invalidState(); return LeaveStatus.PENDING_HR; }
    public static LeaveStatus hrApprove(LeaveStatus status) { if(status!=LeaveStatus.PENDING_HR) throw invalidState(); return LeaveStatus.APPROVED; }
    public static LeaveStatus reject(LeaveStatus status) { if(status!=LeaveStatus.PENDING_MANAGER && status!=LeaveStatus.PENDING_HR) throw invalidState(); return LeaveStatus.REJECTED; }
    private static DomainException invalidState() { return DomainException.conflict("INVALID_LEAVE_STATE","Leave request cannot transition from its current state"); }
}
