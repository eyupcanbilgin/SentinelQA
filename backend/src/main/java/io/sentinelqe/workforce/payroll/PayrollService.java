package io.sentinelqe.workforce.payroll;
import io.sentinelqe.workforce.audit.AuditService;
import io.sentinelqe.workforce.auth.Actor;
import io.sentinelqe.workforce.common.*;
import java.time.Instant;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service @Transactional
public class PayrollService {
    private final PayrollRunRepository runs;private final PayrollItemRepository items;private final AuditService audit;private final DefectSeeds defects;
    public PayrollService(PayrollRunRepository runs,PayrollItemRepository items,AuditService audit,DefectSeeds defects){this.runs=runs;this.items=items;this.audit=audit;this.defects=defects;}
    public PayrollView create(Actor actor,String period){
        try{YearMonth.parse(period);}catch(DateTimeParseException ex){throw new DomainException("INVALID_PAYROLL_PERIOD","Payroll period must be YYYY-MM",HttpStatus.BAD_REQUEST);}
        if(runs.existsByPeriod(period))throw DomainException.conflict("DUPLICATE_PAYROLL_PERIOD","A payroll run already exists for this period");
        PayrollRun p=runs.saveAndFlush(new PayrollRun(UUID.randomUUID(),period));audit.record(actor.employeeId(),"PAYROLL_CREATED","payroll",p.getId());return view(p);
    }
    @Transactional(readOnly=true) public List<PayrollView> list(){return runs.findAllByOrderByCreatedAtDesc().stream().map(this::view).toList();}
    @Transactional(readOnly=true) public PayrollView get(UUID id){return view(runs.findById(id).orElseThrow(DomainException::notFound));}
    public PayrollView process(Actor actor,UUID id){PayrollRun p=locked(id);p.queue(Instant.now().plusSeconds(defects.slowPayroll()?5:0));audit.record(actor.employeeId(),"PAYROLL_QUEUED","payroll",id);return view(p);}
    public PayrollView finalizeRun(Actor actor,UUID id){
        PayrollRun p=locked(id);
        if(!(defects.doubleFinalize()&&p.getStatus()==PayrollStatus.FINALIZED))p.finalizeRun();
        audit.record(actor.employeeId(),"PAYROLL_FINALIZED","payroll",id);return view(p);
    }
    private PayrollRun locked(UUID id){return runs.lockById(id).orElseThrow(DomainException::notFound);}
    private PayrollView view(PayrollRun p){return PayrollView.of(p,items.findByPayrollRunIdOrderByEmployeeId(p.getId()));}
}
