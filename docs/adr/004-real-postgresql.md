# ADR-004: Test the production database semantics

Status: Accepted.

Context: Unique periods, foreign keys, date/money types and concurrent leave reservations depend on PostgreSQL behavior. An in-memory substitute would weaken the most valuable integration evidence.

Decision: Use PostgreSQL Testcontainers and Flyway migrations for integration tests. Permit an explicit dedicated external PostgreSQL setting for local environments without a working container daemon; record which path executed.

Alternatives: H2 is cheaper to launch but does not verify PostgreSQL locking and migration compatibility. A permanently shared database creates state leakage and setup drift.

Consequences: CI requires a container-capable runner. External fallback verification is useful PostgreSQL evidence but is not a Testcontainers pass. Fixture cleanup must handle independent server transactions and async work.
