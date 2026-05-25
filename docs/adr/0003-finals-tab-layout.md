# ADR 0003 — Finals tab: two-level selector + placement grid

**Status:** Accepted  
**Date:** 2026-05-25

## Context

The Finals tab must let the reporter enter placement rankings (slots 1–10) for each
ring × class combination. A show can have up to 4 days, 12 rings, and 8 classes,
producing a wide grid when all are shown at once.

## Decision

Two-level selector (show picker + class picker) above a placement grid. One class
shown at a time. Each ring is a column; each placement slot is a row.
SP rings split into LH and SH sub-columns.

## Reasoning

- Matches the original app's per-page navigation pattern (show × class sub-pages).
- Keeps the grid manageable — showing one class at a time avoids horizontal overflow.
- Layout can be evaluated and adjusted based on real user feedback after first use.

## Consequences

- Users navigate between classes via the selector rather than scrolling.
- If users find switching between classes awkward, consider a scrollable layout or
  keyboard shortcuts between classes as a follow-up.
