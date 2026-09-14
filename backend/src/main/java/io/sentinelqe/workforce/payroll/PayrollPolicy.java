package io.sentinelqe.workforce.payroll;
import io.sentinelqe.workforce.common.DomainException;
public final class PayrollPolicy {
    private PayrollPolicy(){}
    public static void requireProcessable(PayrollStatus status){if(status!=PayrollStatus.CREATED&&status!=PayrollStatus.FAILED)throw DomainException.conflict("INVALID_PAYROLL_STATE","Only created or failed payroll can be processed");}
    public static void requireFinalizable(PayrollStatus status){if(status!=PayrollStatus.COMPLETED)throw DomainException.conflict("INVALID_PAYROLL_STATE","Only completed payroll can be finalized");}
}
