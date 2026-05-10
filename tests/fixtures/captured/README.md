# Captured fixtures

Pseudonymized, deterministic, size-bounded slices of real
Nightscout collections, used to drive Node-only unit tests for
`lib/client-core/` modules with realistic modern payload shapes.

## Provenance

| File | Records | Source |
|---|---|---|
| `entries.json` | 288 | 1 day of CGM SGV records (Dexcom G6 via Loop iOS) |
| `treatments.json` | 100 | Loop-emitted Temp Basals + a few Site Change / Correction Bolus |
| `devicestatus.json` | 30 | Loop iOS uploader (`loop://iPhone`) with full predicted/IOB/COB/override |
| `profile.json` | 10 | Loop-managed profile records with `loopSettings.overridePresets` |

All four files were captured on 2026-05-09 from a real Nightscout
instance and processed through `tools/captured-fixtures/sanitize.js`.

## ⚠️ Coverage gap: Loop iOS only

The current capture covers **only a Loop iOS-style uploader**. None
of the following are represented in this fixture set:

- OpenAPS / oref0 devicestatus (`openaps.iob`, `openaps.suggested`,
  `openaps.enacted` shapes)
- AAPS (Android) devicestatus + treatment shapes
- Trio devicestatus
- xDrip+ entries / pebble fields
- Medtronic pump uploads (CareLink-style)

Tests fed by these fixtures therefore exercise only the Loop code
paths in the modules under test. **Absence of OpenAPS/AAPS test
data here is not evidence of coverage** — the corresponding
extractors must be exercised against captures from those systems
when available.

When new captures land, they should be added as
`*.openaps.json`, `*.aaps.json`, `*.trio.json`, etc., not by
overwriting these files.

## Sanitization rules

Performed by `tools/captured-fixtures/sanitize.js`:

1. **`_id` regenerated** as a deterministic 24-hex-char digest of
   the canonicalized record (sha1 of sorted-keys JSON, truncated).
   Original Mongo `_id` values never appear in the fixtures.
2. **Device serials scrubbed**: `Dexcom G6 8XRSC5` → `Dexcom G6 SERIAL`.
3. **Pump IDs scrubbed**: `pump.pumpID` → `'PUMPID'`.
4. **Uploader names scrubbed**: `uploader.name` → `'test-uploader'`,
   `loop://iPhone` → `loop://test-device`.
5. **Loop instance name scrubbed**: `loop.name` → `'TestLoop'`.
6. **Free-text fields dropped**: `notes`, `reason`, `foodType`,
   `userEnteredAt` are removed from treatments entirely.
7. **Push tokens stripped**: `loopSettings.deviceToken` deleted.
8. **Bundle identifier scrubbed**: `loopSettings.bundleIdentifier`
   → `'test.bundle.identifier'`.
9. **Override preset names scrubbed**: `loopSettings.overridePresets[i].name`
   → `'preset-{i+1}'`. Symbols, durations, target ranges, and
   `insulinNeedsScaleFactor` are preserved (categorical, not identifying).
10. **`syncIdentifier` regenerated** deterministically (uniqueness
    preserved, value opaque).
11. **`enteredBy` pseudonymized**: `'test-user'` for human-style,
    `'loop://test-device'` for device-style.
12. **Timestamps shifted** uniformly so the latest `entries[*].date`
    lands at exactly `2026-05-09T00:00:00.000Z`. Intervals between
    records and time-of-day patterns are preserved.
13. **Top-level keys sorted alphabetically** for canonical diff.

## Determinism guarantee

Re-running the sanitizer on the same source dump produces
byte-identical output:

```sh
node tools/captured-fixtures/sanitize.js
shasum tests/fixtures/captured/*.json
node tools/captured-fixtures/sanitize.js > /dev/null
shasum tests/fixtures/captured/*.json   # must match
```

`tests/captured-fixtures.lint.test.js` enforces this by checking
that no banned tokens appear and that the loaded fixtures conform
to the expected shape and size envelope.

## Regenerating

```sh
node tools/captured-fixtures/sanitize.js \
  --src /path/to/raw/dump \
  --out tests/fixtures/captured
```

Source dump must contain `entries.json`, `treatments.json`,
`devicestatus.json`, and `profile.json` matching the response
shapes of the corresponding Nightscout API v1 endpoints.

## Why these slices and sizes

| File | Limit | Rationale |
|---|---|---|
| entries | 288 | One day of 5-min CGM data — enough for time-of-day, distribution, and direction-trend tests without bloating the repo. |
| treatments | 100 | Representative cross-section of Loop-emitted Temp Basals plus the rare manual entries. |
| devicestatus | 30 | Each record carries a 60-bin `loop.predicted.values` array (~1.5 KB). 30 records keep the file under 100 KB while still spanning enough time for predicted-shape regression tests. |
| profile | 10 | Captures legacy → modern profile-record migrations and override-preset variety. |
