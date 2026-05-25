/**
 * Golden file integration test.
 * Feeds a real .tks show record (pre-converted to JSON) through the report
 * generator and asserts exact match against the known-good .txt output.
 *
 * Golden files live in TkScore_Win/2013/. Each .tks has up to 4 .txt variants:
 *   <show>_<namewidth>_<colwidth>.txt
 *
 * To regenerate fixtures:
 *   python3 tools/tks_to_json.py --batch ../TkScore_Win/2013/ test-fixtures/
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { generateReport, compileReport } from '../scoring/report'
import type { Catalog } from '../scoring/types'

const fixtureDir = resolve(__dirname, '../../test-fixtures')
const goldenDir = resolve(__dirname, '../../../TkScore_Win/2013')
const fixturesAvailable = existsSync(fixtureDir) && existsSync(goldenDir)

function loadFixture(name: string): Catalog {
  const json = readFileSync(resolve(fixtureDir, `${name}.json`), 'utf-8')
  return JSON.parse(json)
}

function loadGolden(name: string): string {
  return readFileSync(resolve(goldenDir, `${name}.txt`), 'utf-8')
}

/**
 * Sort consecutive tied-score entry lines identically in both actual and expected,
 * so Perl hash-bucket tie-ordering differences don't cause spurious failures.
 *
 * Entry lines within the same score group are sorted alphabetically; all other
 * lines (roster, section headers, count footers, blank lines, footer) are unchanged.
 */
function normalizeTieOrder(text: string, catalog: Catalog, namewidth: number): string {
  const compiled = compileReport(catalog)

  // name (truncated to namewidth, raw) → score
  const nameToScore = new Map<string, number>()
  for (const classData of Object.values(compiled)) {
    for (const [key, entry] of Object.entries(classData.entries)) {
      const catEntry = catalog.entries[key]
      const rawName = catEntry?.name ?? `#${key}`
      const truncName = rawName.slice(0, namewidth)
      nameToScore.set(truncName, entry.score)
    }
  }

  const getScore = (line: string): number => {
    const padded = line.slice(0, namewidth)
    return nameToScore.get(padded.trimEnd()) ?? nameToScore.get(padded) ?? Number.NEGATIVE_INFINITY
  }

  const CLASS_LABEL_PREFIXES = [
    'KITTENS', 'CATS', 'ALTERS', 'HOUSEHOLD', 'PRELIMINARY', 'ADVANCED', 'NEW TRAITS', 'NEW BREEDS',
  ]
  const isClassHeader = (l: string) => CLASS_LABEL_PREFIXES.some(p => l.startsWith(p))
  const isCountFooter = (l: string) =>
    l.includes('Allbreed/Longhair Count') || l.includes('Shorthair Count')

  const lines = text.split('\n')
  const result: string[] = []
  let inClass = false
  let inFooter = false
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('--')) {
      inFooter = true
      result.push(line)
      i++
      continue
    }

    if (isClassHeader(line)) {
      inClass = true
      result.push(line)
      i++
      continue
    }

    // Anything outside a class section (roster, header, footer) → verbatim
    if (!inClass || inFooter || !line || line.startsWith(' ') || isCountFooter(line)) {
      result.push(line)
      i++
      continue
    }

    // Entry line: collect same-score consecutive group and sort it
    const score = getScore(line)
    const group = [line]
    let j = i + 1
    while (j < lines.length) {
      const next = lines[j]
      if (!next || next.startsWith(' ') || isCountFooter(next) || isClassHeader(next) || next.startsWith('--')) break
      if (getScore(next) !== score) break
      group.push(next)
      j++
    }
    if (group.length > 1) group.sort()
    result.push(...group)
    i = j
  }

  return result.join('\n')
}

function goldenTest(fixtureName: string, namewidth: number, colwidth: number, breedwidth = 3) {
  const catalog = loadFixture(fixtureName)
  const actual = normalizeTieOrder(
    generateReport(catalog, { namewidth, colwidth, breedwidth }),
    catalog, namewidth,
  )
  const expected = normalizeTieOrder(
    loadGolden(`${fixtureName}_${namewidth}_${colwidth}`),
    catalog, namewidth,
  )
  const actualLines = actual.split('\n')
  const expectedLines = expected.split('\n')
  expect(actualLines.length).toBe(expectedLines.length)
  for (let i = 0; i < expectedLines.length; i++) {
    expect(actualLines[i], `line ${i + 1}`).toBe(expectedLines[i])
  }
}

describe.skipIf(!fixturesAvailable)('golden file: 120526e (International Specialty Club)', () => {
  it('namewidth=36, colwidth=3', () => goldenTest('120526e', 36, 3))
  it('namewidth=36, colwidth=4', () => goldenTest('120526e', 36, 4))
  it('namewidth=38, colwidth=3', () => goldenTest('120526e', 38, 3))
  it('namewidth=38, colwidth=4', () => goldenTest('120526e', 38, 4))
})

describe.skipIf(!fixturesAvailable)('golden file: 120526g', () => {
  it('namewidth=36, colwidth=3', () => goldenTest('120526g', 36, 3))
  it('namewidth=36, colwidth=4', () => goldenTest('120526g', 36, 4))
  it('namewidth=38, colwidth=4', () => goldenTest('120526g', 38, 4))
})

// 120602a golden files were generated with --bw=2 (non-default)
describe.skipIf(!fixturesAvailable)('golden file: 120602a', () => {
  it('namewidth=36, colwidth=3', () => goldenTest('120602a', 36, 3, 2))
  it('namewidth=36, colwidth=4', () => goldenTest('120602a', 36, 4, 2))
  it('namewidth=38, colwidth=3', () => goldenTest('120602a', 38, 3, 2))
  it('namewidth=38, colwidth=4', () => goldenTest('120602a', 38, 4, 2))
})
