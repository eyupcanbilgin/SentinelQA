# ADR-008: Deliberately bounded leave and payroll models

Status: Accepted.

Context: Real HR policies vary by jurisdiction, employment contract and calendar. This application needs reproducible risks that can be asserted exactly without implying statutory compliance.

Decision: Leave uses inclusive calendar days; pending requests reserve available entitlement and only final approval decrements stored balance. Approval replay must not change it again. Payroll uses decimal base salary, 20% flat tax and 5% deductions, each rounded `HALF_UP` to two places; net is base minus those rounded amounts. Responses encode money as decimal strings.

Alternatives: Holiday/accrual engines and progressive statutory taxes would require authoritative rule maintenance and much broader acceptance criteria. Binary floating-point money would make results unstable at rounding boundaries.

Consequences: Same-day leave costs one day, weekends count, and concurrent requests need transactional serialization. The payroll model is fictional and intentionally excludes statutory rules, currencies, benefits and payslip compliance. Tests assert the documented arithmetic, not real tax advice.
