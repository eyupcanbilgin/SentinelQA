# ADR-003: Java API and database verification

Status: Accepted.

Context: The riskiest HTTP behaviors change persisted leave balances, payroll state and confidential object visibility. Java already hosts the domain and database test fixtures.

Decision: Use REST Assured with JUnit/AssertJ for API contracts and workflows. Run database/API `*IT` tests through Maven Failsafe's integration profile, while pure `*Test` checks remain fast.

Alternatives: A second TypeScript API regression framework could reuse browser tooling but would split primary business/API fixtures and reporting across runtimes. Small API helpers in browser fixtures remain useful for setup.

Consequences: HTTP assertions can be paired with PostgreSQL state assertions. Tests must not mistake the test method's transaction for the server's HTTP/async transaction or rely on method ordering.
