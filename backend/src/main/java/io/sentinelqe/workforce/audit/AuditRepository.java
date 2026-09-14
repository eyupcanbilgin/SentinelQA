package io.sentinelqe.workforce.audit;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface AuditRepository extends JpaRepository<AuditEvent,UUID>{List<AuditEvent> findTop200ByOrderByCreatedAtDesc();}
