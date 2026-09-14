# AI guardrails

AI output is untrusted evidence for an engineer to assess. WorkforceOps' business expectations, test assertions and release requirements remain deterministic. The TypeScript quality tooling separates path-based selection, a structured provider interface, labeled evaluations and a report-driven gate.

| Boundary | Required behavior |
| --- | --- |
| Change selection | Deterministic component/test mapping provides the baseline. Unmapped or uncertain input broadens testing. Provider advice cannot remove required tests. |
| Provider output | Validate the schema, enum values, confidence bounds and evidence fields before use. Malformed output is an error/fallback, not an accepted free-text answer. |
| Failure classification | Use `PRODUCT_DEFECT`, `TEST_DEFECT`, `ENVIRONMENT`, `TEST_DATA`, `FLAKY_TEST` or `UNKNOWN`; retain uncertainty and supporting evidence. |
| Missing evidence | State the gap. A screenshot path does not mean its image was inspected; a trace ID does not prove a backend root cause. |
| Release gate | Read actual test reports. Triage confidence cannot override a failing test or missing required report. |
| Healing | Produce a reviewable proposal only. No automatic file mutation, commit, skip or retry. A person reviews and applies an allowed change. |

The default mock provider is deterministic and requires no paid access or credentials. Optional real-provider execution uses a locally available Ollama HTTP endpoint with explicit `AI_PROVIDER=ollama` and model configuration; normal CI makes no live model calls. Model installation and a running Ollama service are external prerequisites. The provider/model and prompt version are part of an evaluation's identity; silently changing them invalidates a baseline comparison. Keep any future provider credentials outside the repository and out of report artifacts.

Treat diffs, logs, assertion messages, DOM excerpts and user-entered leave reasons as untrusted data, including text that asks the model to ignore instructions. These sources do not have authority to choose tools, change tests or approve release. Reduce inputs to the evidence required for classification, redact credentials and sensitive values, and enforce output schemas locally. Schema validation constrains shape; it does not prove a plausible explanation is true or prevent every semantic prompt-injection attempt.

Failure triage should say “AI-assisted triage suggests…” and show evidence, confidence, likely component/owner and a next investigation step. It cannot claim to have established the root cause. A timeout alone does not distinguish a product slowdown, bad waiting logic, broken dependency or overloaded environment. A retry pass alone does not establish flakiness. Contradictory or insufficient evidence belongs in `UNKNOWN` or a low-confidence suggestion.

The implemented healer's scope is deliberately limited to locator proposals. Deterministic synchronization and test setup/data corrections are potential future proposal categories, not permission for automatic repair. Review must confirm that the same business assertion remains intact and that the evidence demonstrates a test issue. The proposal must describe why the change preserves test meaning and how to verify it.

Forbidden proposals include deleting or weakening assertions, changing expected amounts/states, adding `.skip`, unconditional retries, swallowing exceptions, increasing timeouts without evidence, deleting a failing test or editing product code merely to obtain green results. For example, replacing an exact payroll net-pay assertion with “defined” is forbidden. A textual allowlist/denylist is a useful check, not a proof that an arbitrary patch is safe; human code review is mandatory.

The golden triage dataset is versioned in [agent-evals](../agent-evals). Evaluation reports include accuracy, per-class precision/recall/F1, confusion matrix and UNKNOWN rate. Compare prompts on the same reviewed dataset, preserve disagreements and inspect per-class changes: aggregate accuracy can hide failure on a rare security or product-defect class. UNKNOWN is a legitimate abstention, not automatically a model defect.

The mock evaluation measures deterministic rule behavior and evaluator/report plumbing on curated fixtures. It is not evidence of an LLM's accuracy or production triage quality. A real-provider evaluation is a separate experiment with provider/model, prompt version, dataset identity and run details. Synthetic labeled cases expose selected failure modes but do not represent operational prevalence. Cost or latency belongs in a report only when measured; otherwise omit it or mark it unavailable.

Gate thresholds are acceptance policy rather than achieved performance. If provider output is invalid, evaluation is missing, a report is stale or a guardrail is violated, the gate must preserve the failure/absence. An engineer can review a release exception outside this tool, but an AI-generated explanation cannot create one.
