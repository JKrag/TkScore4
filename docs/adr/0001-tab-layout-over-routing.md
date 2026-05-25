# ADR 0001 — Tab layout over client-side routing

**Status:** Accepted  
**Date:** 2026-05-25

## Context

TkScore4 is a single-document editor: one catalog open at a time, with multiple editing
views (metadata, rings, entries, finals, report). We needed to choose between:

- **Vue Router** (distinct URLs per view, browser back/forward, deep-linking)
- **Tabbed layout** (one page, sections toggled by active-tab state)

## Decision

Use a tabbed layout with no Vue Router dependency.

## Reasoning

- The original Perl/Tk app is a persistent window with modal sub-editors — tabs match
  that mental model closely.
- There is no meaningful use case for deep-linking into a specific tab; the catalog must
  already be loaded before any tab is useful.
- Vue Router adds ~30 KB and a navigation layer that provides no benefit for a
  single-document editor.
- Keeps the implementation minimal: active tab is a single `ref<string>` in App.vue.

## Consequences

- No browser back/forward between tabs.
- Tab state is not bookmarkable.
- If multi-catalog management is added later, routing would need to be introduced at
  that point.
