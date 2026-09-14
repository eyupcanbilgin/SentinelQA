# ADR-005: Deterministic quality decisions with optional AI enrichment

Status: Accepted.

Context: Test omission and mistaken release approval are more damaging than an imperfect triage suggestion. CI must be reproducible without paid model access.

Decision: Path/component/catalog rules select tests; missing mappings broaden selection. A mock provider drives ordinary CI. Structured schemas validate optional AI triage, and actual report artifacts drive release recommendations.

Alternatives: LLM-only selection makes omissions difficult to explain and varies with provider/model availability. Disabling all AI would remove the opportunity to demonstrate evaluated, bounded assistance with ambiguous evidence.

Consequences: Mock fixture accuracy measures rule/evaluation behavior, not LLM quality. Real-provider experiments need separate labeled results and prompt/provider identity. AI explanations never override deterministic requirements.
