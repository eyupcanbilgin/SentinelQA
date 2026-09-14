# ADR-002: Focus browser testing on critical journeys

Status: Accepted.

Context: Users must complete employee-to-manager-to-HR leave approval and asynchronous admin payroll through an accessible interface. Most negative policy combinations are cheaper to verify below the browser.

Decision: Use Playwright with semantic locators, domain fixtures, separate role contexts, bounded state polling and failure traces/screenshots. Run only critical end-to-end workflows and use no blanket retries.

Alternatives: Browser coverage for every API rule duplicates assertions and increases data/synchronization costs. Multiple browser automation frameworks add no distinct capability here.

Consequences: API tests own the authorization matrix; browser tests own interaction and integration. Shared demo journeys run with one worker and require a fresh database between full runs. Browser artifacts remain useful investigation evidence instead of a substitute for business assertions.
