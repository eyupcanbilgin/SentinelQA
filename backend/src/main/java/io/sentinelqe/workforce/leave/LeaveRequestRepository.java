package io.sentinelqe.workforce.leave;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest,UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select l from LeaveRequest l where l.id=:id") Optional<LeaveRequest> lockById(@Param("id") UUID id);
}
