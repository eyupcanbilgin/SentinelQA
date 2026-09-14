package io.sentinelqe.workforce.leave;
import io.sentinelqe.workforce.auth.Actor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api")
public class LeaveController {
    private final LeaveService service;public LeaveController(LeaveService service){this.service=service;}
    public record CreateLeave(@NotNull LocalDate startDate,@NotNull LocalDate endDate,@NotBlank @Size(max=1000) String reason){}
    public record BalanceView(UUID employeeId,int availableDays){}
    @GetMapping("/leave-balances/me") public BalanceView balance(){Actor a=Actor.current();return new BalanceView(a.employeeId(),service.available(a));}
    @GetMapping("/leave-requests") public List<LeaveView> list(){return service.list(Actor.current());}
    @PostMapping("/leave-requests") @ResponseStatus(HttpStatus.CREATED) public LeaveView create(@Valid @RequestBody CreateLeave input){return service.create(Actor.current(),input.startDate(),input.endDate(),input.reason());}
    @GetMapping("/leave-requests/{id}") public LeaveView get(@PathVariable UUID id){return service.get(Actor.current(),id);}
    @PostMapping("/leave-requests/{id}/manager-approve") public LeaveView managerApprove(@PathVariable UUID id){return service.managerApprove(Actor.current(),id);}
    @PostMapping("/leave-requests/{id}/hr-approve") public LeaveView hrApprove(@PathVariable UUID id){return service.hrApprove(Actor.current(),id);}
    @PostMapping("/leave-requests/{id}/reject") public LeaveView reject(@PathVariable UUID id){return service.reject(Actor.current(),id);}
}
