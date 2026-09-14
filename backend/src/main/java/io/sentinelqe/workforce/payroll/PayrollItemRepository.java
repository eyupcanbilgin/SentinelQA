package io.sentinelqe.workforce.payroll;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PayrollItemRepository extends JpaRepository<PayrollItem,UUID> { List<PayrollItem> findByPayrollRunIdOrderByEmployeeId(UUID runId); void deleteByPayrollRunId(UUID runId); }
