# ADR-007: Healing proposals require review

Status: Accepted.

Context: A test assistant can make a failure disappear by weakening its assertion, hiding a product defect. Locator and setup fixes can still be useful when evidence identifies a test defect.

Decision: Restrict healing to reviewable proposals for locator, synchronization or setup/data corrections. Do not automatically mutate files or commit patches. Prohibit weaker expectations, skips, unconditional retries, suppressed errors and product changes made only for green tests.

Alternatives: Autonomous patch-and-rerun loops optimize pass rate rather than product confidence. Prohibiting even proposals loses a bounded investigation aid.

Consequences: A human checks the full diff, unchanged business meaning and rerun evidence. Schema/string guards are defense in depth, not a semantic correctness guarantee. See [AI_GUARDRAILS.md](../AI_GUARDRAILS.md).
