package io.sentinelqe.workforce.payroll;
import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface PayrollRunRepository extends JpaRepository<PayrollRun,UUID> {
    boolean existsByPeriod(String period);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select p from PayrollRun p where p.id=:id") Optional<PayrollRun> lockById(@Param("id") UUID id);
    @Query(value="SELECT * FROM payroll_runs WHERE status='PROCESSING' AND queued_at<=CURRENT_TIMESTAMP ORDER BY queued_at LIMIT 1 FOR UPDATE SKIP LOCKED",nativeQuery=true) Optional<PayrollRun> lockNextQueued();
    List<PayrollRun> findAllByOrderByCreatedAtDesc();
}
