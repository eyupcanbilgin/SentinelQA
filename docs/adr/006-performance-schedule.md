# ADR-006: Separate workload evidence from fast PR feedback

Status: Accepted.

Context: Payroll acknowledges work before calculation finishes, while shared CI runner contention can distort latency. Large workloads also consume finite payroll periods and leave entitlement.

Decision: Keep PR checks focused on reproducible functional protection. Run larger k6 baseline/load/stress scenarios on scheduled or manual jobs and require configured performance evidence for release. Measure workflow completion as well as request duration.

Alternatives: Running maximum load on every PR adds cost and noisy failures; omitting performance entirely misses slow asynchronous jobs behind healthy HTTP acknowledgements.

Consequences: A PR may have `NOT_RUN` performance with a warning. Release policy requires the relevant artifact. Document workload, environment and thresholds; local measurements do not establish production capacity.
