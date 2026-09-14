package io.sentinelqe.workforce.leave;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance,UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select b from LeaveBalance b where b.employeeId=:id") Optional<LeaveBalance> lockByEmployeeId(@Param("id") UUID id);
}
