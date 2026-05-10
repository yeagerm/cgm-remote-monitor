# Test Coverage Gaps - Aggregated View

**Last Updated:** May 2026

This document aggregates coverage gaps from all test specifications to provide a prioritized view for planning test development work.

---

## Recently Closed (Phase 5c, May 2026)

- **Loop devicestatus pill math** — extracted to
  `lib/client-core/devicestatus/loop.js` and covered by
  `tests/client-core/devicestatus-loop.test.js` against captured
  Loop iOS fixtures (`tests/fixtures/captured/devicestatus.json`).
- **Pump devicestatus latest-pick** — extracted to
  `lib/client-core/devicestatus/pump.js` and covered by
  `tests/client-core/devicestatus-pump.test.js`.
- **Uploader classification** — new pure helper at
  `lib/client-core/devicestatus/uploader.js` with full branch
  coverage (`tests/client-core/devicestatus-uploader.test.js`).

## Still Open — devicestatus follow-ups

- **OpenAPS pill math** is *not* yet extracted. The `openaps.analyzeData()`
  reduction in `lib/plugins/openaps.js` is more tightly coupled to
  `moment` and the sandbox `device` map than the Loop equivalent;
  splitting it cleanly requires more refactor than Phase 5c
  scoped. Tracked here so it isn't mistaken for done.
- **Captured fixture set is Loop iOS only.** OpenAPS / AAPS / Trio /
  xDrip+ devicestatus payloads are not represented; the
  `classifyUploader` and `selectLoopState` helpers are only
  *executed* against synthetic minimal fixtures for those
  controllers. See `tests/fixtures/captured/README.md`.

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
- **Short-term (Phase 5c, Track 2):** structural wiring is now covered
  by `tests/bundle.smoke.test.js` (boots `bundle.app.js` in jsdom and
  asserts `Nightscout.client/.reportclient/.profileclient/.units` are
  exposed). Per-plugin stats math is exercised by dedicated suites:
  `basalprofileplugin.test.js`, `daytodayplugin.test.js`,
  `foodstatsplugin.test.js`, `glucosedistributionplugin.test.js`,
  `hourlystatsplugin.test.js`, `loopalyzerplugin.test.js`,
  `profileplugin.test.js`, `reportstorage.test.js`. End-to-end
  rendering checks moved to a manual checklist:
  `docs/test-specs/manual-smoke-checklist.md` §3.
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
