# TkScore4 Roadmap

## What this is

A complete rewrite of TkScore3 (Perl, 2012) as a client-side web app. TICA cat show
organizers use it to score shows and generate the official `.txt` reports they file with
TICA. The new app must produce byte-identical reports to the original.

**Tech stack:** Vue 3 + TypeScript + Vite. No server. Runs in any modern browser.

---

## Current state (as of 2026-05-25)

### Done

- [x] Root `CLAUDE.md` — project context, read-only reference structure, non-negotiables
- [x] `TkScore4/` initialized: Vite + Vue 3 + TypeScript + Vitest
- [x] `tools/tks_to_json.py` — converts legacy `.tks` (Perl Data::Dumper) to JSON
  - Handles: `undef`→null, bare integer keys, integer vs string cat IDs (`401` ≠ `"401A"`),
    escaped quotes, CP1252/Latin-1 encoding fallback
  - 28 pytest tests covering all edge cases + all 9 real 2013 golden files
- [x] `TkScore4/CLAUDE.md` — data model reference, test workflow, architecture notes
- [x] Golden file integration test harness (`src/__tests__/report.golden.test.ts`)
  - 12 tests: 120526e (4), 120526g (3), 120602a (4), all 12 passing
  - Test helper normalizes tie-group ordering before comparison (Perl hash order is non-reproducible)
- [x] Report generator (`src/scoring/report.ts`, `src/scoring/types.ts`)
  - Bugs fixed: trailing newline, `printscore` Perl falsiness (`'0'`), roster indent, entry sort order, roster caption rows, dynamic `breedwidth` defaulting
- [x] Domain docs: `TkScore4/CONTEXT.md` (glossary) + `TkScore4/docs/adr/` (3 ADRs)
  - ADR 0001: Tab layout over routing
  - ADR 0002: No in-app .tks import (Python converter handles it)
  - ADR 0003: Finals tab two-level selector + placement grid
- [x] Catalog helpers (`src/catalog/index.ts`) — factory, mutation, persistence, file I/O
  - `newCatalog()`, `newShow()`, `newRing()`, `addRing()`, `removeRing()`, `addShow()`, `removeShow()`
  - `finalsKeysFor()` — encodes AB vs SP LH/SH key derivation in one place
  - `setPlacement()`, `setCount()`, `ensureFinalsSlot()`
  - `saveToStorage()` / `loadFromStorage()` (localStorage auto-save)
  - `downloadCatalog()` / `downloadReport()` (browser download)
  - 8 unit tests in `src/__tests__/catalog.test.ts` (21 total tests passing)
- [x] Vue UI — full app shell + 5 tabs
  - `App.vue`: tab shell, localStorage auto-save (watches catalog deeply), New/Open/Save/Save As, Ctrl-S / Ctrl-Shift-S keyboard shortcuts, empty state with call to action
  - `TabShowInfo.vue`: club, location, date, reporter, email; show day labels (up to 4); report options (namewidth, colwidth, printscore, mixedcase)
  - `TabRings.vue`: per-show ring table; judge name (auto-derives initials); AB/SP toggle; class checkboxes; congress flag; add/remove rings
  - `TabFinals.vue`: show selector + class pills + placement grid; AB rings one column, SP rings LH+SH sub-columns; count row + 10 placement slots
  - `TabReport.vue`: generate button → renders report in `<pre>`; download .txt; namewidth/colwidth/printscore controls
  - `TabEntries.vue`: placeholder (not needed for first use case)
- [x] Entries tab — full cat name + breed editor (not needed for "best of best" use case)

### Not started / deferred

- [ ] Expand golden file tests to remaining 6 `.tks` show files (120609a/d, 120623a/b/d/e)
- [ ] `mixedcase` option — title-case transformation (currently passes because 2013 data is already mixed case)
- [ ] In-app .tks import (deferred — Python converter is sufficient; Flask wrapper if needed)

---

## Reference material (read-only, do not modify)

These are local paths outside the repo. They are read-only reference material for the initial port and for verifying report output. This section left here as a reference for further development. 

| Path                          | What it is                                                            |
| ----------------------------- | --------------------------------------------------------------------- |
| `../TkScore_Win/lib/TkScore/` | Authoritative Perl source. Read this before implementing any feature. |
| `../TkScore_Win/2013/*.tks`   | 9 real show records (2012–2013)                                       |
| `../TkScore_Win/2013/*.txt`   | Expected report output for each show                                  |

**Key Perl modules by feature:**

- Score calculation: `Finals.pm`, `Entries.pm`
- Report layout: `ShowReport.pm`, `FinalsReport.pm`, `EntriesReport.pm`
- File I/O: `Catalog.pm` (reads/writes .tks via Data::Dumper)
- Breed lookups: `BreedCodeTable.pm`, `Breeds.pm`

**Golden file naming:** `120526e_36_3.txt` = show `120526e`, `namewidth=36`, `colwidth=3`.
Each `.tks` has up to 4 corresponding `.txt` files (different format options).

---

## Next steps (in order)

### Step 1 — Golden file integration test harness

**Goal:** One failing Vitest test that defines the pipeline we need to build.

1. Convert golden `.tks` files to JSON fixtures:
   
   ```bash
   mkdir -p test-fixtures
   python3 tools/tks_to_json.py --batch ../TkScore_Win/2013/ test-fixtures/
   ```

2. Write `src/__tests__/report.golden.test.ts`:
   - Load `test-fixtures/120526e.json`
   - Call `generateReport(data, { namewidth: 36, colwidth: 3 })`
   - Compare output to `../TkScore_Win/2013/120526e_36_3.txt`
3. Start with one show, one format option. The test should fail cleanly (function not yet
   implemented), establishing the contract.

### Step 2 — Report generator (`src/scoring/report.ts`)

**Goal:** Make the golden file test pass for `120526e_36_3.txt`.

Reference: `../TkScore_Win/lib/TkScore/ShowReport.pm`, `FinalsReport.pm`,
`EntriesReport.pm`.

The `.txt` format is fixed-width text. Key sections (from the golden file):

1. Header — club, location, date
2. Show grid — judges × days, with AB/SP designation
3. KITTENS section — one row per cat, columns per ring
4. CATS section — same structure
5. ALTERS section
6. HOUSEHOLD PETS section
7. Ring count footers
8. (Specialty rings have LH/SH sub-sections)

Work section by section, driven by the golden file test. Each section should have
its own unit tests in `src/__tests__/`.

### Step 3 — Scoring/calculation engine (`src/scoring/finals.ts`, `entries.ts`)

**Goal:** Correct point calculations feeding the report.

Reference: `../TkScore_Win/lib/TkScore/Finals.pm`, `Entries.pm`.

Key rules to implement:

- Allbreed vs Specialty ring scoring differences
- LH/SH split for specialty rings
- Point accumulation across rings
- Congress ring handling (`congress` flag on ring objects)

Each calculation rule gets a unit test before implementation.

### Step 4 — Vue UI

**Goal:** Usable data entry and show management interface.

Only start this after Step 2–3 are verified against golden files. The UI is secondary
to correctness.

Planned views:
- Show setup (club, date, judges, ring config)
- Entry input (cat number, name, breed)
- Finals entry (per-ring placement input)
- Report preview and download

---

## Engineering rules

1. **Read the Perl source first.** Before implementing any scoring rule or report section,
   find and read the corresponding `.pm` file. The source is the spec.

2. **Golden file before feature complete.** No scoring or report feature is done until
   it passes at least one golden file pair end-to-end.

3. **Test with the code.** New parsing rules, calculations, and report sections get tests
   immediately — not as an afterthought.

4. **Regression tests for bugs.** When a bug is fixed, add a test for the specific case
   that was broken.

5. **Scoring logic stays out of components.** Keep `src/scoring/` as pure TypeScript
   with no Vue dependencies. Testable without DOM.

---

## Commands

```bash
# TypeScript tests
npm test                  # single pass
npm run test:watch        # watch mode (TDD)
npm run test:coverage     # coverage report

# Python converter tests (one-time setup: python3 -m venv tools/.venv && tools/.venv/bin/pip install pytest)
tools/.venv/bin/pytest tools/test_tks_to_json.py -v

# Convert golden corpus to JSON fixtures
python3 tools/tks_to_json.py --batch ../TkScore_Win/2013/ test-fixtures/

# Dev server
npm run dev
```
