# TkScore4

A browser-based rewrite of TkScore3, the TICA cat show scoring tool. Runs entirely
client-side — no server or installation required.

**Live Alpha development demo**: https://tk-score4.vercel.app

---

## What it does

TkScore4 lets show reporters record ring placements, manage entries, and generate the
fixed-width `.txt` reports that TICA clubs submit. Data lives in browser localStorage
during a session; catalogs are saved and loaded as `.json` files from disk.

See [CONTEXT.md](CONTEXT.md) for domain terminology (rings, finals, classes, etc.).

## Getting started

```bash
npm install
npm run dev       # dev server at localhost:5173
npm run build     # production build → dist/
npm test          # run test suite (Vitest)
```

## Working with legacy `.tks` files

Old `.tks` show files from TkScore3 use a Perl `Data::Dumper` format. 
This project contains a Python converter translates them to the JSON structure TkScore4 uses:

```bash
# One-time venv setup
python3 -m venv tools/.venv
tools/.venv/bin/pip install pytest

# Convert a single file
python3 tools/tks_to_json.py path/to/show.tks > output.json

# Batch convert a whole directory of .tks files
python3 tools/tks_to_json.py --batch path/to/tks_dir/ output_dir/

# E.g. I batch-converted the 2013 golden corpus from the old TkScore3 project (used for integration tests)
python3 tools/tks_to_json.py --batch ../TkScore_Win/2013/ test-fixtures/
```

The `test-fixtures/` directory thus contains JSON versions of the original `.tks` files, which are used in the golden-file tests to verify that TkScore4 produces the same `.txt` reports as the original program.

## Testing

```bash
npm test                          # TypeScript unit + integration tests
tools/.venv/bin/pytest tools/     # Python converter tests
```

Golden-file integration tests compare generated `.txt` reports against known-good
output from real 2013 show records. A feature is not considered done until at least
one golden-file pair passes end-to-end.

## Contributing / AI agents

See [CLAUDE.md](CLAUDE.md) for build commands, project structure, data model details,
and notes for AI-assisted development.
