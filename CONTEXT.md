# TkScore4 — Domain Glossary

All terminology in this file matches the original TkScore3 application.
UI labels, report headers, and file format names are preserved verbatim
to minimise disruption for existing users.

---

## Core entities

**Catalog**
The root document for one cat show event. Persisted as a `.tks` file (legacy) or
the app's own JSON format. Contains show metadata, entries, ring configuration,
and finals for all show days.

**Show**
One day (or session) of competition within a catalog. A catalog has 1–4 shows.
Labelled by the reporter (e.g. "Saturday", "Sunday").

**Ring**
One judge's set of placements within a show. A ring is either Allbreed (AB) or
Specialty (SP), and may be flagged as a Congress ring.

**Entry**
A cat registered in the show. Identified by an entry number (integer like `401`,
or alphanumeric like `401A`). Has a name and a breed code.

**Finals**
The ranked placements recorded for one class within one ring. Contains a count
(number of eligible entries) and a rank array (entry numbers in placement order,
null for empty slots).

**Class**
A competitive division within a ring. AB ring classes: KIT, CAT, ALT, HHP, HHK,
NTR, NBA, NBP. SP ring classes use LH/SH prefixes: LHCAT, SHCAT, LHKIT, SHKIT, etc.

**Judge**
Identified by initials (e.g. `YP`) within a catalog, with a full name stored in
the show's judge roster.

---

## Report terminology (from .txt output)

- **KITTENS** — KIT class section
- **CATS** — CAT class section  
- **ALTERS** — ALT class section
- **HOUSEHOLD PETS** — HHP class section
- **LONGHAIR / SHORTHAIR** — LH/SH sub-sections within Specialty rings
- **Allbreed/Longhair Count** — entry count footer for AB and LH finals
- **Shorthair Count** — entry count footer for SH finals

---

## Session persistence and file I/O

The app auto-saves the current catalog to **localStorage** on every change, so the session
survives tab close and browser refresh. On startup, if a catalog exists in localStorage,
it is restored automatically.

Explicit file operations mirror the original app:
- **Save (Ctrl-S)**: download catalog as `.json`
- **Save As**: download with a chosen filename
- **Open**: upload a previously saved `.json` to resume editing
- **New**: start a fresh empty catalog (with confirmation if work exists)

## Primary workflow

Every show starts as a new catalog created from scratch in the app. The sequence is:
Show Info → Rings → Finals → Generate Report. Entries (cat names and breeds) are
optional — when omitted, the report renders entry numbers as `#401` and leaves breed
blank. This supports the "best of best" use case where only placements matter.

Reading existing `.tks` files is only needed for testing and rare historical lookups —
it is not part of the day-to-day workflow. The Python converter (`tools/tks_to_json.py`)
handles `.tks` → JSON for those cases.

## File formats

- **`.tks`** — legacy Perl Data::Dumper serialization. Import-only in TkScore4.
- **`.txt`** — fixed-width show report filed with TICA. Exact output fidelity required.
