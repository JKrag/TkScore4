# ADR 0002 — No in-app .tks import; Python converter handles it

**Status:** Accepted  
**Date:** 2026-05-25

## Context

The legacy format is `.tks` (Perl Data::Dumper serialization). Users have archives of
these files. We needed to decide whether the web app should parse them directly.

## Decision

No in-app `.tks` import. The Python converter (`tools/tks_to_json.py`) handles
`.tks` → JSON for the cases that need it (testing, rare historical lookups).

## Reasoning

- The real-world workflow is **always new show from scratch**. No show starts from
  an existing `.tks` file in practice.
- Parsing Perl Data::Dumper in the browser is non-trivial; the Python converter
  already exists, is well-tested, and covers all edge cases.
- If users need to access old files, the converter (or a future Flask wrapper around
  it) is an acceptable tool-assisted step for what is a rare operation.

## Consequences

- Users cannot open `.tks` files directly in the browser.
- If import demand materialises, add a small Flask wrapper around the existing
  Python converter rather than porting the parser to JavaScript.
