package io.sentinelqe.workforce.audit;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/audit-events") @PreAuthorize("hasRole('ADMIN')")
public class AuditController {
    private final AuditRepository events;public AuditController(AuditRepository events){this.events=events;}
    @GetMapping public List<AuditEvent> list(){return events.findTop200ByOrderByCreatedAtDesc();}
}
