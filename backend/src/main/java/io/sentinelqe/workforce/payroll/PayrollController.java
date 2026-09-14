package io.sentinelqe.workforce.payroll;
import io.sentinelqe.workforce.auth.Actor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/payroll-runs") @PreAuthorize("hasRole('ADMIN')")
public class PayrollController {
    private final PayrollService service;public PayrollController(PayrollService service){this.service=service;}
    public record CreatePayroll(@NotBlank @Pattern(regexp="[0-9]{4}-(0[1-9]|1[0-2])") String period){}
    @GetMapping public List<PayrollView> list(){return service.list();}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public PayrollView create(@Valid @RequestBody CreatePayroll input){return service.create(Actor.current(),input.period());}
    @GetMapping("/{id}") public PayrollView get(@PathVariable UUID id){return service.get(id);}
    @PostMapping("/{id}/process") @ResponseStatus(HttpStatus.ACCEPTED) public PayrollView process(@PathVariable UUID id){return service.process(Actor.current(),id);}
    @PostMapping("/{id}/finalize") public PayrollView finalizeRun(@PathVariable UUID id){return service.finalizeRun(Actor.current(),id);}
}
