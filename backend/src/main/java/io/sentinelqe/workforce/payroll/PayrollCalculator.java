package io.sentinelqe.workforce.payroll;
import io.sentinelqe.workforce.common.DefectSeeds;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class PayrollCalculator {
    private static final BigDecimal TAX = new BigDecimal("0.20");
    private static final BigDecimal WRONG_TAX = new BigDecimal("0.15");
    private static final BigDecimal DEDUCTIONS = new BigDecimal("0.05");

    private final DefectSeeds defects;

    public PayrollCalculator() {
        this(null);
    }

    @Autowired
    public PayrollCalculator(@Autowired(required = false) DefectSeeds defects) {
        this.defects = defects;
    }

    public record Calculation(BigDecimal baseSalary, BigDecimal tax, BigDecimal deductions, BigDecimal netPay) {}

    public Calculation calculate(BigDecimal baseSalary) {
        if (baseSalary == null || baseSalary.signum() < 0 || baseSalary.scale() > 2) {
            throw new IllegalArgumentException("Salary must be a nonnegative amount with at most two decimal places");
        }
        BigDecimal base = baseSalary.setScale(2, RoundingMode.UNNECESSARY);
        BigDecimal effectiveTax = (defects != null && defects.wrongTax()) ? WRONG_TAX : TAX;
        BigDecimal tax = base.multiply(effectiveTax).setScale(2, RoundingMode.HALF_UP);
        BigDecimal deductions = base.multiply(DEDUCTIONS).setScale(2, RoundingMode.HALF_UP);
        return new Calculation(base, tax, deductions, base.subtract(tax).subtract(deductions));
    }
}
