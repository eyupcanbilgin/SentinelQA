package io.sentinelqe.workforce.audit;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
@Service
public class AuditService {
    private final AuditRepository events;public AuditService(AuditRepository events){this.events=events;}
    @Transactional(propagation=Propagation.MANDATORY) public void record(UUID actor,String action,String type,UUID id){events.save(new AuditEvent(actor,action,type,id,MDC.get("correlationId")));}
}
