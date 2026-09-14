package io.sentinelqe.workforce.employee;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface DepartmentRepository extends JpaRepository<Department, UUID> { }
