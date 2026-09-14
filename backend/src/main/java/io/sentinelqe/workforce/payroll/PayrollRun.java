package io.sentinelqe.workforce.payroll;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="payroll_runs")
public class PayrollRun {
    @Id private UUID id;
    @Column(nullable=false,unique=true,length=7) private String period;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private PayrollStatus status;
    @Column(name="total_net",nullable=false,precision=18,scale=2) private BigDecimal totalNet;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="queued_at") private Instant queuedAt;
    @Column(name="error_message",length=500) private String errorMessage;
    protected PayrollRun(){}
    public PayrollRun(UUID id,String period){this.id=id;this.period=period;this.status=PayrollStatus.CREATED;this.totalNet=new BigDecimal("0.00");this.createdAt=Instant.now();}
    public UUID getId(){return id;} public String getPeriod(){return period;} public PayrollStatus getStatus(){return status;} public BigDecimal getTotalNet(){return totalNet;} public Instant getQueuedAt(){return queuedAt;}
    public void queue(Instant when){PayrollPolicy.requireProcessable(status);status=PayrollStatus.PROCESSING;queuedAt=when;errorMessage=null;}
    public void complete(BigDecimal total){status=PayrollStatus.COMPLETED;totalNet=total;errorMessage=null;}
    public void fail(){status=PayrollStatus.FAILED;errorMessage="Payroll processing failed; consult correlated backend logs";}
    public void finalizeRun(){PayrollPolicy.requireFinalizable(status);status=PayrollStatus.FINALIZED;}
}
