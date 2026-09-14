package io.sentinelqe.workforce.payroll;
import java.util.*;
public record PayrollView(UUID id,String period,PayrollStatus status,String totalNet,List<ItemView> items) {
    public record ItemView(UUID id,UUID employeeId,String baseSalary,String tax,String deductions,String netPay){
        public static ItemView of(PayrollItem p){return new ItemView(p.getId(),p.getEmployeeId(),p.getBaseSalary().toPlainString(),p.getTax().toPlainString(),p.getDeductions().toPlainString(),p.getNetPay().toPlainString());}
    }
    public static PayrollView of(PayrollRun p,List<PayrollItem> items){return new PayrollView(p.getId(),p.getPeriod(),p.getStatus(),p.getTotalNet().toPlainString(),items.stream().map(ItemView::of).toList());}
}
