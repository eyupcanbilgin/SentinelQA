package io.sentinelqe.workforce.payroll;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Component;
@Component
public class PayrollCalculator {
    private static final BigDecimal TAX=new BigDecimal("0.20");
    private static final BigDecimal DEDUCTIONS=new BigDecimal("0.05");
    public record Calculation(BigDecimal baseSalary,BigDecimal tax,BigDecimal deductions,BigDecimal netPay){}
    public Calculation calculate(BigDecimal baseSalary){
        if(baseSalary==null||baseSalary.signum()<0||baseSalary.scale()>2)throw new IllegalArgumentException("Salary must be a nonnegative amount with at most two decimal places");
        BigDecimal base=baseSalary.setScale(2,RoundingMode.UNNECESSARY);
        BigDecimal tax=base.multiply(TAX).setScale(2,RoundingMode.HALF_UP);
        BigDecimal deductions=base.multiply(DEDUCTIONS).setScale(2,RoundingMode.HALF_UP);
        return new Calculation(base,tax,deductions,base.subtract(tax).subtract(deductions));
    }
}
