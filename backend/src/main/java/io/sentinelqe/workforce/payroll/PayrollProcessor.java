package io.sentinelqe.workforce.payroll;

import io.sentinelqe.workforce.employee.Employee;
import io.sentinelqe.workforce.employee.EmployeeRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class PayrollProcessor {
    private static final Logger log = LoggerFactory.getLogger(PayrollProcessor.class);

    private final PayrollRunRepository runs;
    private final PayrollItemRepository items;
    private final EmployeeRepository employees;
    private final PayrollCalculator calculator;
    private final TransactionTemplate txTemplate;

    public PayrollProcessor(
            PayrollRunRepository runs,
            PayrollItemRepository items,
            EmployeeRepository employees,
            PayrollCalculator calculator,
            PlatformTransactionManager txManager) {
        this.runs = runs;
        this.items = items;
        this.employees = employees;
        this.calculator = calculator;
        this.txTemplate = new TransactionTemplate(txManager);
    }

    @Scheduled(fixedDelayString = "${app.payroll.poll-ms:1000}")
    public void poll() {
        boolean processed;
        do {
            processed = Boolean.TRUE.equals(txTemplate.execute(status -> processNext()));
        } while (processed);
    }

    private boolean processNext() {
        Optional<PayrollRun> optionalRun = runs.lockNextQueued();
        if (optionalRun.isEmpty()) {
            return false;
        }

        PayrollRun run = optionalRun.get();
        try {
            log.info("Processing payroll run id={} period={}", run.getId(), run.getPeriod());
            items.deleteByPayrollRunId(run.getId());

            List<Employee> activeEmployees = employees.findByActiveTrueOrderById();
            BigDecimal totalNet = BigDecimal.ZERO;

            for (Employee employee : activeEmployees) {
                PayrollCalculator.Calculation calc = calculator.calculate(employee.getBaseSalary());
                PayrollItem item = new PayrollItem(run.getId(), employee.getId(), calc);
                items.save(item);
                totalNet = totalNet.add(calc.netPay());
            }

            run.complete(totalNet);
            runs.save(run);
            log.info("Completed payroll run id={} items={} totalNet={}", run.getId(), activeEmployees.size(), totalNet);
            return true;
        } catch (Exception e) {
            log.error("Failed to process payroll run id=" + run.getId(), e);
            run.fail();
            runs.save(run);
            return true;
        }
    }
}
