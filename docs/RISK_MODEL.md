# Risk model

Risk prioritizes verification effort. It is an ordinal engineering judgment, not a calibrated probability that a change will fail. The deterministic selector consumes the checked-in component map and test catalog so a reviewer can explain every selected test without a model API call.

The model uses `impact × likelihood`, with each input ranging from 1 to 5. Scores 15–25 are HIGH, 6–14 are MEDIUM and 1–5 are LOW. For several mapped components, use the maximum component score rather than averaging away a critical change. Impact reflects the worst credible business consequence within this application: incorrect pay, a disclosed employee record or corrupted leave entitlement outranks presentation inconvenience. Likelihood reflects the code's branching/state complexity and breadth of affected callers. Historical defect rates and change frequency can inform future reviews, but this new repository has no operational history and does not invent either measurement.

| Area | Configured score | Reason and required response |
| --- | --- | --- |
| Payroll calculation/finalization | 5 × 4 = 20, HIGH | Financial values, rounding boundaries, asynchronous state and immutable results; select unit, API/DB workflow and mutation checks. |
| Authentication/object authorization | 5 × 4 = 20, HIGH | Salary and leave data exposure across identities; keep security matrix checks even for a small policy diff. |
| Leave reservation/final approval | 4 × 4 = 16, HIGH | Concurrent requests and decision replay can consume entitlement incorrectly; require transactional and balance assertions. |
| Employee management | 4 × 3 = 12, MEDIUM | Department/manager relationships affect authorization and payroll inputs. |
| Frontend | 3 × 2 = 6, MEDIUM | Critical role journeys share controls and navigation; even a copy-only change uses this conservative package mapping. |
| Documentation | 1 × 1 = 1, LOW | Instructions still require baseline/tooling checks. |
| Quality tooling / tests | 25, HIGH by broadening policy | Although mapped as 5 × 3, changing the confidence system forces the full catalog. |
| Migrations, dependencies, CI, shared or unmapped paths | 25, HIGH by broadening policy | A narrow match is unsafe for changes with application-wide or unknown effects. |

Security and financial sensitivity determine impact; complexity and blast radius inform likelihood and suite breadth. A small diff to a high-impact policy remains high risk. File count is not a proxy for severity. Shared code belongs to every affected component, and changes to the component map or catalog themselves require tooling checks and broad selection.

Selection begins with actual changed paths, maps them to components, then selects matching catalog tests and configured baseline tests. The output records paths, affected components, score/level, selected stable IDs and reasons. Shared paths, an unmapped path, quality-system changes or missing catalog information force full-catalog selection with risk 25 and mapping confidence 0. Incomplete git comparisons likewise must not produce an unjustified empty set. [component-map.yml](../quality/component-map.yml) and [risk-map.yml](../quality/risk-map.yml) define the executable configuration; update this document with them.

LLM advice may add explanatory context or additional investigations; it cannot reduce deterministic risk, remove required tests or convert absent coverage into confidence. The selector is a recommendation artifact in this reference implementation. CI still runs its configured critical floor, so a successful selection command does not establish that recommended tests executed.

Review a changed mapping with a payroll-only change, an authorization change, a presentation change and an unknown path. Verify that the first two retain high-risk protection and the last broadens. Assess false-negative selection by comparing recommendations with full-suite failures over time; do not publish a false-negative rate without that dataset. A lower test count is not the goal.

Limitations are explicit: ordinal multiplication compresses unlike risks; path rules miss semantic coupling; schema changes can affect queries outside a package; unseen dependencies and external failures remain possible; and synthetic evaluation data does not calibrate real-world risk. Nightly/manual broad regression provides additional coverage, but cannot compensate for deliberately skipping a required PR check.
