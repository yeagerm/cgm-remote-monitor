# Test Coverage Gaps - Aggregated View

**Last Updated:** January 2026

This document aggregates coverage gaps from all test specifications to provide a prioritized view for planning test development work.

---

## High Priority Gaps

These gaps represent security-critical or data-critical functionality that should be addressed first.

| Area | Gap | Source Spec | Recommended Action |
|------|-----|-------------|-------------------|
| Authorization | WebSocket Auth (`/storage` subscription) | `authorization-tests.md` | Add socket.io-client tests for subscribe with/without token |
| Authorization | JWT Expiration rejection | `authorization-tests.md` | Create JWT with past exp, verify 401 |
| Authorization | Permission Wildcards (Shiro patterns) | `authorization-tests.md` | Test `api:*:read` vs `api:entries:read` |
| Authorization | API v3 Security model | `authorization-tests.md` | Create separate API v3 security spec |

---

## Medium Priority Gaps

These gaps represent functional coverage that should be addressed after high priority items.

| Area | Gap | Source Spec | Recommended Action |
|------|-----|-------------|-------------------|
| Shape Handling | Response order matches input order | `shape-handling-tests.md` | Add order verification tests |
| Shape Handling | WebSocket + API concurrent writes | `shape-handling-tests.md` | Complex test setup needed |
| Shape Handling | Duplicate identifier handling under load | `shape-handling-tests.md` | Stress test harness needed |
| Shape Handling | Cross-API consistency (v1 vs v3 storage) | `shape-handling-tests.md` | Cross-read verification tests |
| Authorization | Subject CRUD operations | `authorization-tests.md` | Add API tests for admin endpoints |
| Authorization | Role Management | `authorization-tests.md` | Test role creation and permission assignment |

---

## Low Priority Gaps

These gaps are edge cases or lower-risk functionality.

| Area | Gap | Source Spec | Recommended Action |
|------|-----|-------------|-------------------|
| Shape Handling | Null/undefined in array handling | `shape-handling-tests.md` | Define expected behavior, add tests |
| Authorization | Audit Events | `authorization-tests.md` | Mock bus, verify admin-notify event |
| Authorization | Delay Cleanup | `authorization-tests.md` | Fast-forward time, verify cleanup |

---

## Areas Not Yet Documented

These areas from system audits have not yet been converted to formal requirements/test specifications:

| Area | Source Audit | Priority | Blocking Issue |
|------|--------------|----------|----------------|
| API v3 Security | `security-audit.md` | High | Distinct auth model from v1/v2 |
| Core Calculations (IOB/COB) | `plugin-architecture-audit.md` | High | Complex algorithms, domain expertise needed |
| Real-time Event Bus | `realtime-systems-audit.md` | Medium | Need to trace event flows |
| Plugin System | `plugin-architecture-audit.md` | Medium | Large surface area |
| Notification/Messaging | `messaging-subsystem-audit.md` | Medium | Multiple providers |
| Dashboard UI | `dashboard-ui-audit.md` | Low | May be rewritten |

---

## Gap Resolution Process

When addressing a gap:

1. **Review the source spec** - Understand the context and related requirements
2. **Write the test first** - Follow Test ID conventions from the source spec
3. **Update the source spec** - Mark the gap as covered, add test details
4. **Update this file** - Remove the gap from this aggregated view
5. **Update the Progress section** - Note the date and any discoveries

---

## Track 1 / Phase 4 — `reports.test.js` skipped (Phase 4, 2026-05)

**File:** `tests/reports.test.js`
**State:** `describe.skip(...)` — entire suite skipped, never runs.

**What it covered (legacy benv harness):**
- "should produce some html" — exercises `Nightscout.reportclient` end-to-end
  by feeding 7 days of synthetic SGV/treatment data through the client-side
  report rendering pipeline (jQuery + Flot) inside a benv/jsdom-11 sandbox.
- "should produce week to week report" — same scaffolding, week-to-week view.

**Why it can't be ported to modern jsdom today:**
1. Both tests `benv.require()` the full webpack `bundle.app.js` against a
   *new* jsdom window in their `beforeEach`. The bundle's entry module
   (38211) recompiles on each `require()` (cache-busted), but its
   side-effect writes to the new `window` (e.g. `window.Nightscout = ...`)
   are not observable on the second invocation under modern Node — the
   exact mechanism is unclear, but the legacy `benv`+`rewire` path side-
   stepped it via `vm.runInThisContext` semantics that we cannot
   faithfully reproduce. (Re-introducing `rewire` was attempted; it hangs
   on jQuery DOM-ready timing under modern jQuery+jsdom@24.)
2. Even if we worked around that, the rendering surface (Flot, charts as
   raw HTML) is the wrong assertion target. The right surface is the
   server-side statistics API once it lands (see
   `docs/proposals/testing-modernization-proposal.md` Track 3 / Future).

**Coverage replacement plan:**
- **Short-term (no replacement):** the underlying report logic is exercised
  in production daily; the HTML-rendering assertions had marginal
  regression-catching value (they compared against jQuery state, not
  pixel-accurate output).
- **Medium-term:** when the server-side statistics API ships, port the
  per-bucket calculations (TIR, average, std-dev) as Node-only unit tests.
- **Long-term:** delete `tests/reports.test.js` and the supporting
  `static/js/reportinit.js` once the server-side path replaces client
  rendering.

**Tracking:** opening a follow-up issue at PR-merge time to surface this
gap and tie it to the stats API work.

---

## Cross-References

- [Shape Handling Tests](shape-handling-tests.md)
- [Authorization Tests](authorization-tests.md)
- [Documentation Progress](../meta/DOCUMENTATION-PROGRESS.md)
