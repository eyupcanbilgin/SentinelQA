package io.sentinelqe.workforce.leave;
import io.sentinelqe.workforce.audit.AuditService;
import io.sentinelqe.workforce.auth.*;
import io.sentinelqe.workforce.common.*;
import io.sentinelqe.workforce.employee.*;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service @Transactional
public class LeaveService {
    private final LeaveRequestRepository requests;private final LeaveBalanceRepository balances;private final EmployeeRepository employees;private final AuditService audit;private final DefectSeeds defects;
    public LeaveService(LeaveRequestRepository requests,LeaveBalanceRepository balances,EmployeeRepository employees,AuditService audit,DefectSeeds defects){this.requests=requests;this.balances=balances;this.employees=employees;this.audit=audit;this.defects=defects;}
    public LeaveView create(Actor actor,LocalDate start,LocalDate end,String reason){
        Employee employee=employee(actor.employeeId());
        if(!employee.isActive()) throw DomainException.conflict("INACTIVE_EMPLOYEE","Inactive employees cannot request leave");
        int days=LeavePolicy.duration(start,end);
        // All reservations serialize on this employee's row, so pending requests cannot oversubscribe balance.
        balance(employee.getId()).reserve(days);
        LeaveStatus status=employee.getManagerId()==null?LeaveStatus.PENDING_HR:LeaveStatus.PENDING_MANAGER;
        LeaveRequest request=requests.save(new LeaveRequest(UUID.randomUUID(),employee.getId(),start,end,days,reason.strip(),status));
        audit.record(actor.employeeId(),"LEAVE_CREATED","leave",request.getId()); return LeaveView.of(request,employee.getName());
    }
    @Transactional(readOnly=true) public List<LeaveView> list(Actor actor){
        Map<UUID,Employee> visible=new HashMap<>();employees.findAll().stream().filter(e->AccessPolicy.canReadEmployee(actor.role(),actor.employeeId(),e.getId(),e.getManagerId())).forEach(e->visible.put(e.getId(),e));
        return requests.findAll().stream().filter(r->visible.containsKey(r.getEmployeeId())).map(r->LeaveView.of(r,visible.get(r.getEmployeeId()).getName())).toList();
    }
    @Transactional(readOnly=true) public LeaveView get(Actor actor,UUID id){LeaveRequest r=requests.findById(id).orElseThrow(DomainException::notFound);Employee e=employee(r.getEmployeeId()); if(!AccessPolicy.canReadEmployee(actor.role(),actor.employeeId(),e.getId(),e.getManagerId())) throw DomainException.forbidden();return LeaveView.of(r,e.getName());}
    public LeaveView managerApprove(Actor actor,UUID id){LeaveRequest r=locked(id);Employee e=employee(r.getEmployeeId());if(!managerAllowed(actor,e))throw DomainException.forbidden();r.managerApprove();audit.record(actor.employeeId(),"LEAVE_MANAGER_APPROVED","leave",id);return LeaveView.of(r,e.getName());}
    public LeaveView hrApprove(Actor actor,UUID id){LeaveRequest r=locked(id);Employee e=employee(r.getEmployeeId());if(!AccessPolicy.canHrApprove(actor.role(),actor.employeeId(),e.getId()))throw DomainException.forbidden();r.hrApprove();balance(e.getId()).consume(r.getDays());audit.record(actor.employeeId(),"LEAVE_APPROVED","leave",id);return LeaveView.of(r,e.getName());}
    public LeaveView reject(Actor actor,UUID id){
        LeaveRequest r=locked(id);Employee e=employee(r.getEmployeeId());
        boolean allowed=r.getStatus()==LeaveStatus.PENDING_MANAGER?managerAllowed(actor,e):AccessPolicy.canHrApprove(actor.role(),actor.employeeId(),e.getId());
        if(!allowed)throw DomainException.forbidden();r.reject();balance(e.getId()).release(r.getDays());audit.record(actor.employeeId(),"LEAVE_REJECTED","leave",id);return LeaveView.of(r,e.getName());
    }
    @Transactional(readOnly=true) public int available(Actor actor){return balances.findById(actor.employeeId()).orElseThrow(DomainException::notFound).getAvailableDays();}
    private boolean managerAllowed(Actor a,Employee e){return AccessPolicy.canManagerApprove(a.role(),a.employeeId(),e.getId(),e.getManagerId())||(defects.bypassManager()&&a.role()==Role.MANAGER&&!a.employeeId().equals(e.getId()));}
    private LeaveRequest locked(UUID id){return requests.lockById(id).orElseThrow(DomainException::notFound);}
    private LeaveBalance balance(UUID id){return balances.lockByEmployeeId(id).orElseThrow(DomainException::notFound);}
    private Employee employee(UUID id){return employees.findById(id).orElseThrow(DomainException::notFound);}
}
