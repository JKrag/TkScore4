# TkScore4 — Implementation CLAUDE.md

This is the active development project. For project context, constraints, and read-only
reference material, see the root `../CLAUDE.md` first.

## Quick reference

| Command | What it does |
|---------|-------------|
| `npm run dev` | Dev server (Vite, hot reload) |
| `npm test` | Run all tests (Vitest, single-pass) |
| `npm run test:watch` | Watch mode for TDD |
| `npm run test:coverage` | Coverage report |
| `npm run build` | Production build (type-check + vite build) |

## Project structure

```
TkScore4/
  src/
    __tests__/      Unit tests (*.test.ts)
    components/     Vue components
    assets/         Static assets
    main.ts         App entry point
    App.vue         Root component
  tools/
    tks_to_json.py  .tks → JSON converter (Python, dev tool)
  public/
```

## Data model

The show data structure comes directly from the `.tks` format. The root object has:

```
{
  filename, reporter, club, location, date, format,
  nshows,       // number of shows (0-indexed, usually 0)
  options: { namewidth, colwidth, mixedcase, printscore },
  entries: {    // cat number → { name, breed }
    "401": { name, breed },     // bare integer keys become string keys in JSON
    "401A": { name, breed }     // string keys stay strings
  },
  shows: [      // up to 4 show days
    {
      label, nrings,
      judges: { "YP": "Yvonne Patrick", ... },
      rings: [
        {
          judge,   // judge initials key
          name,    // judge full name
          absp,    // "AB" (allbreed) or "SP" (specialty)
          congress,
          classes: { CAT, KIT, HHP, HHK, ALT, NTR, NBA, NBP },  // 1=active, 0=inactive
          finals: {
            "CAT": { count: number, rank: (number|string|null)[] },
            // AB ring keys: CAT, KIT, HHP, HHK, ALT, NTR
            // SP ring keys: LHCAT, SHCAT, LHKIT, SHKIT, LHHHP, SHHHP, LHALT, SHALT, LHNTR, SHNTR, LHHHK, SHHHK
          }
        }
      ]
    }
  ]
}
```

**Important type details:**
- Cat numbers in `rank` arrays: integers like `401` and strings like `"401A"` are distinct
  (they reference different entries). The app must handle both types.
- `null` in rank arrays means no cat placed in that position.
- `count` can be `null`, `""`, or a number — treat `null`/`""` as "not applicable".

## Reference material

When implementing any scoring or reporting feature:

1. Open the corresponding Perl module in `../TkScore_Win/lib/TkScore/`
2. Key modules by feature:
   - Score calculation: `Finals.pm`, `Entries.pm`
   - Report layout: `ShowReport.pm`, `FinalsReport.pm`, `EntriesReport.pm`
   - File I/O: `Catalog.pm` (reads/writes .tks via Data::Dumper)
   - Breed lookups: `BreedCodeTable.pm`, `Breeds.pm`
3. Golden test files: `../TkScore_Win/2013/*.tks` + `../*.txt` pairs

## Golden file test workflow

The converter in `tools/tks_to_json.py` bridges old .tks files into the test pipeline:

```bash
# Convert a single show file to JSON for testing
python3 tools/tks_to_json.py ../TkScore_Win/2013/120526e.tks > test-fixtures/120526e.json

# Batch convert the entire 2013 corpus
python3 tools/tks_to_json.py --batch ../TkScore_Win/2013/ test-fixtures/
```

A test that verifies report output should:
1. Load a pre-converted `.json` fixture
2. Run it through the report generator
3. Compare output to the corresponding `.txt` golden file in `../TkScore_Win/2013/`

The golden `.txt` filenames encode the show: `120526e_36_3.txt` means show `120526e`,
`namewidth=36`, `colwidth=3`.

## Testing conventions

- Test files live in `src/__tests__/` as `*.test.ts`
- Use `describe` / `it` / `expect` (Vitest globals, no imports needed)
- Fixture JSON files go in `test-fixtures/` (gitignored if large; document the generate step)
- A feature is not done until at least one golden file pair passes end-to-end

## Architecture notes

- **No server.** All data lives in `localStorage` during a session. File I/O via the
  browser File System Access API or `<input type="file">` for save/load.
- **No .tks writing required.** The app saves its own JSON format. Legacy files are
  import-only (via the converter or a future in-app import feature).
- Vue 3 Composition API throughout (no Options API).
- Keep scoring logic in plain TypeScript modules (`src/scoring/`), not inside components,
  so it can be unit-tested without DOM.
