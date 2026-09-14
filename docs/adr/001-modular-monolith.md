# ADR-001: One backend deployable

Status: Accepted.

Context: Leave decisions, balance accounting and payroll state require reliable relational transactions. This reference product has one organization and a small engineering surface.

Decision: Use a Spring Boot modular monolith and one PostgreSQL database. Organize authentication, employees, leave, payroll and audit by domain. Keep the asynchronous payroll worker in the same application.

Alternatives: Separate services and a message broker would demonstrate distributed delivery, but introduce deployment and consistency costs unrelated to the current domain requirement.

Consequences: Local reproduction and cross-domain testing remain inexpensive. Modules share deployment and database availability. Package organization alone does not enforce independence; a future service extraction needs a concrete scaling/ownership requirement and transactional redesign.
