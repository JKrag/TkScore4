/**
 * Show report generator.
 *
 * Reference: TkScore_Win/lib/TkScore/ShowReport.pm (printReport, compileReport,
 * printRoster2). This module must produce output identical to the original Perl
 * program for any given catalog + format options.
 */

import type { Catalog, Show } from './types'

// ── Constants (from ShowReport.pm _initialize) ───────────────────────────────

const CLASS_LABEL: Record<string, string> = {
  KIT: 'KITTENS',
  CAT: 'CATS',
  ALT: 'ALTERS',
  HHK: 'HOUSEHOLD PET KITTENS',
  HHP: 'HOUSEHOLD PETS',
  NBP: 'PRELIMINARY NEW BREEDS',
  NBA: 'ADVANCED NEW BREEDS',
  NTR: 'NEW TRAITS',
  NBC: 'NEW BREEDS',
}

const OLD_CLASSES = ['KIT', 'CAT', 'ALT', 'HHK', 'HHP', 'NBC']
const NEW_CLASSES = ['KIT', 'CAT', 'ALT', 'HHK', 'HHP', 'NBP', 'NBA', 'NTR']

// Scoring tables: points for placements 1st-10th
const AB_SCORES = [200, 190, 180, 170, 160, 150, 140, 130, 120, 110]
const SP_SCORES = [150, 140, 130, 120, 110, 100, 90, 80, 70, 60]

// ── Breed width ───────────────────────────────────────────────────────────────

// BreedWidth in Perl defaults to 3 (Catalog object attribute, not in .tks data).
// It can be overridden by the --bw=N command-line flag.
// ReportOptions.breedwidth lets callers reproduce golden files generated with non-default values.

// ── Formatting helpers ────────────────────────────────────────────────────────

/** Left-align `s` in a field of `width` chars (Perl: %-Ns) */
function ljust(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length)
}

/** Right-align `s` in a field of `width` chars (Perl: %Ns) */
function rjust(s: string, width: number): string {
  return s.length >= width ? s : ' '.repeat(width - s.length) + s
}

// ── Class list ────────────────────────────────────────────────────────────────

/**
 * Returns the ordered class list for this catalog.
 * Reference: Catalog.pm get_classes()
 */
function getClasses(catalog: Catalog): string[] {
  for (const show of catalog.shows) {
    for (const ring of show.rings) {
      for (const cls of Object.keys(ring.classes)) {
        if (cls === 'NBC') return OLD_CLASSES
        if (cls === 'NBP' || cls === 'NBA' || cls === 'NTR') return NEW_CLASSES
      }
    }
  }
  return NEW_CLASSES
}

function activeShows(catalog: Catalog): Show[] {
  return catalog.shows.filter(s => s.label)
}

// ── compileReport ─────────────────────────────────────────────────────────────

interface RingResult {
  judge: string
  absp: string
  lhcount?: number | string | null
  shcount?: number | string | null
}

interface EntryResult {
  num: string
  score: number
  awards: (string | number | '')[]
}

type CompiledClasses = Record<string, { entries: Record<string, EntryResult>; entryOrder: string[]; rings: RingResult[] }>

/**
 * Tabulate awards and calculate scores from all shows and rings.
 * Reference: ShowReport.pm compileReport()
 *
 * Scoring:
 *   AB ring, count >= 10: AB_SCORES[i] + (count - i - 1)
 *   AB ring, 0 < count < 10: AB_SCORES[i] + (count - i - 1) - 10*(10 - count)
 *   SP ring: same formula with SP_SCORES
 *   congress rings: placed normally but score = 0
 */
export function compileReport(catalog: Catalog): CompiledClasses {
  const classes = getClasses(catalog)
  const result: CompiledClasses = {}
  for (const cls of classes) {
    result[cls] = { entries: {}, entryOrder: [], rings: [] }
  }

  function ensureEntry(cls: string, key: string) {
    if (!result[cls].entries[key]) {
      result[cls].entries[key] = { num: key, score: 0, awards: [] }
      result[cls].entryOrder.push(key)
    }
  }

  // In Perl, `unless ($entry)` skips falsy values: null, undef, 0, '', '0'
  function isPerlTruthy(v: number | string | null | undefined): boolean {
    return v !== null && v !== undefined && v !== '' && v !== 0 && v !== '0'
  }

  // congress: in .tks stored as '0' (string) or 0 — both falsy in Perl
  function isCongress(ring: { congress: string | number }): boolean {
    return isPerlTruthy(ring.congress)
  }

  for (const cls of classes) {
    let ringnum = 0
    for (const show of activeShows(catalog)) {
      for (const ring of show.rings) {
        if (ring.classes[cls] != 1) continue

        result[cls].rings[ringnum] = { judge: ring.judge, absp: ring.absp }

        if (ring.absp === 'AB' || cls === 'NBA' || cls === 'NBP' || cls === 'NTR') {
          const finals = ring.finals[cls]
          if (finals) {
            const count = finals.count
            result[cls].rings[ringnum].lhcount = count
            let i = 0
            for (const entry of finals.rank) {
              if (!isPerlTruthy(entry)) { i++; continue }
              const key = String(entry)
              ensureEntry(cls, key)
              result[cls].entries[key].awards[ringnum] = i + 1
              if (isPerlTruthy(count) && !isCongress(ring)) {
                const n = Number(count)
                result[cls].entries[key].score +=
                  n < 10
                    ? AB_SCORES[i] + (n - i - 1) - 10 * (10 - n)
                    : AB_SCORES[i] + (n - i - 1)
              }
              i++
            }
          }
        } else {
          // SP ring: split into LH and SH sub-finals
          for (const lhsh of ['LH', 'SH'] as const) {
            const finalKey = lhsh + cls
            const finals = ring.finals[finalKey]
            if (finals) {
              const count = finals.count
              if (lhsh === 'LH') result[cls].rings[ringnum].lhcount = count
              else result[cls].rings[ringnum].shcount = count
              let i = 0
              for (const entry of finals.rank) {
                if (!isPerlTruthy(entry)) { i++; continue }
                const key = String(entry)
                ensureEntry(cls, key)
                result[cls].entries[key].awards[ringnum] = `${i + 1}${lhsh === 'LH' ? 'L' : 'S'}`
                if (isPerlTruthy(count) && !isCongress(ring)) {
                  const n = Number(count)
                  result[cls].entries[key].score +=
                    n < 10
                      ? SP_SCORES[i] + (n - i - 1) - 10 * (10 - n)
                      : SP_SCORES[i] + (n - i - 1)
                }
                i++
              }
            }
          }
        }
        ringnum++
      }
    }
  }

  return result
}

// ── Roster header ─────────────────────────────────────────────────────────────

/**
 * Build the judge roster header lines.
 * Reference: ShowReport.pm printRoster2()
 *
 * Each show gets a column; width = max(ring name length) + 3.
 * Indent between columns = floor((reportWidth - totalWidth) / (ncols + 1)).
 */
function buildRoster(
  catalog: Catalog,
  compiled: CompiledClasses,
  _displayNamewidth: number,
  colwidth: number,
  breedWidth: number,
): string[] {
  // Perl's printRoster2 reads namewidth from catalog.options, not from self.NameLength.
  // So the roster indent is the same regardless of the user-selected display namewidth.
  const shows = activeShows(catalog)

  interface Column {
    width: number
    rows: string[]
  }

  const columns: Column[] = shows.map(show => {
    // Per-show max column width, accounting for optional captions (split on " - ")
    let w = 0
    const rings = show.rings.map(ring => {
      const parts = ring.name.split(/\s+-\s+/)
      const name = parts[0]
      const caption = parts[1] ?? ''
      w = Math.max(w, name.length + 3)
      if (caption) w = Math.max(w, caption.length + 3)
      return { name, absp: ring.absp, caption }
    })
    const jw = w - 3

    // Center the show label within the column width
    const label = show.label
    const centeredLabel = ' '.repeat(Math.floor((w - label.length) / 2)) + label
    const rows: string[] = [ljust(centeredLabel, w)]

    for (const { name, absp, caption } of rings) {
      rows.push(`${ljust(name, jw)} ${rjust(absp, 2)}`)
      if (caption) rows.push(`   ${ljust(caption, jw)}`)
    }
    return { width: w, rows }
  })

  const ncols = columns.length
  const totalWidth = columns.reduce((sum, c) => sum + c.width, 0)

  // Total number of rings across all classes (for report width)
  let maxRings = 0
  for (const cls of Object.keys(compiled)) {
    maxRings = Math.max(maxRings, compiled[cls].rings.length)
  }
  const catalogNamewidth = catalog.options?.namewidth ?? 36
  const reportWidth = catalogNamewidth + breedWidth + maxRings * colwidth

  const indent =
    reportWidth > totalWidth + ncols * 2
      ? ' '.repeat(Math.floor((reportWidth - totalWidth) / (ncols + 1)))
      : '  '

  const nrows = Math.max(...columns.map(c => c.rows.length))
  const lines: string[] = []
  for (let row = 0; row < nrows; row++) {
    let line = ''
    for (let col = 0; col < ncols; col++) {
      const text = columns[col].rows[row] ?? ' '.repeat(columns[col].width)
      line += indent + text
    }
    lines.push(line)
  }
  return lines
}

// ── generateReport ────────────────────────────────────────────────────────────

export interface ReportOptions {
  namewidth?: number
  colwidth?: number
  breedwidth?: number
}

/**
 * Generate the full show report text.
 * Reference: ShowReport.pm printReport()
 */
export function generateReport(catalog: Catalog, opts: ReportOptions = {}): string {
  const namewidth = opts.namewidth ?? catalog.options?.namewidth ?? 36
  const colwidth = opts.colwidth ?? catalog.options?.colwidth ?? 3
  // printscore stored as '0'/'1' string in .tks; must be numeric-compared (Perl: if ($n) where '0' is falsy)
  const printscore = Number(catalog.options?.printscore ?? 0)
  // Perl Catalog default is 3; overridden per-report by --bw=N flag (not stored in .tks)
  const breedWidth = opts.breedwidth ?? 3

  const classes = getClasses(catalog)
  const compiled = compileReport(catalog)
  const shows = activeShows(catalog)

  // Which classes have at least one active ring?
  const skipClass: Record<string, boolean> = {}
  for (const cls of classes) skipClass[cls] = true
  for (const show of shows) {
    for (const ring of show.rings) {
      for (const [cls, val] of Object.entries(ring.classes)) {
        if (val == 1) skipClass[cls] = false
      }
    }
  }

  const lines: string[] = []

  // ── Header ────────────────────────────────────────────────────────────────
  lines.push(`${catalog.club}, ${catalog.location}, ${catalog.date}`)
  lines.push('')

  // ── Judges' roster ────────────────────────────────────────────────────────
  lines.push(...buildRoster(catalog, compiled, namewidth, colwidth, breedWidth))

  // ── Class sections ────────────────────────────────────────────────────────
  // Perl: $colfmt = "%${colwidth}s"  (right-aligned)
  const col = (s: string | number) => rjust(String(s), colwidth)

  for (const cls of classes) {
    if (skipClass[cls]) continue
    lines.push('')

    // Section heading: class label + ring initials
    // Perl: printf("%-${namewidth}s %-${breedwidth}s ", classLabel, '')
    const heading =
      ljust(CLASS_LABEL[cls] ?? cls, namewidth) +
      ' ' +
      ljust('', breedWidth) +
      ' ' +
      compiled[cls].rings.map(r => col(r.judge)).join('')
    lines.push(heading)

    // Entry rows sorted by score descending; ties resolved by first-seen order (matches Perl hash + stable sort)
    const entries = compiled[cls].entryOrder.map(k => compiled[cls].entries[k])
    entries.sort((a, b) => b.score - a.score)

    for (const entry of entries) {
      // Fill gaps in awards array with ''
      for (let i = 0; i < compiled[cls].rings.length; i++) {
        if (entry.awards[i] == null) entry.awards[i] = ''
      }

      const catEntry = catalog.entries[entry.num]
      const rawName = catEntry?.name ? catEntry.name : `#${entry.num}`
      const name = rawName.slice(0, namewidth)
      const isHH = cls === 'HHK' || cls === 'HHP'
      const breed = isHH ? '' : (catEntry?.breed?.toUpperCase() ?? '')

      // Perl: printf("%-${namewidth}s %-${breedwidth}s ", name, breed)
      const prefix = ljust(name, namewidth) + ' ' + ljust(breed, breedWidth) + ' '
      const awards = entry.awards.map(a => col(a === undefined ? '' : String(a))).join('')

      if (printscore && cls !== 'NBA' && cls !== 'NBP' && cls !== 'NTR') {
        lines.push(`${prefix}${awards} ${rjust(String(entry.score), 4)}`)
      } else {
        lines.push(`${prefix}${awards}`)
      }
    }

    // Count footers
    // Perl: printf("%${namewidth}s  %-${breedwidth}s", "Allbreed/Longhair Count", "")
    // Note: right-aligned name, then "  " + breed-width spaces
    const countPrefix = (label: string) =>
      rjust(label, namewidth) + '  ' + ' '.repeat(breedWidth)

    lines.push(countPrefix('Allbreed/Longhair Count') + compiled[cls].rings.map(r => col(r.lhcount ?? '')).join(''))
    lines.push(countPrefix('Shorthair Count') + compiled[cls].rings.map(r => col(r.shcount ?? '')).join(''))
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const email = (catalog.email ?? '').toLowerCase()
  lines.push('--')
  lines.push(`This report was prepared by ${catalog.reporter} (${email}).`)

  // Perl printf ends the last line with \n, producing a trailing newline in the file
  return lines.join('\n') + '\n'
}
