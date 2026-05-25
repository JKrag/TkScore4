import type { Catalog, CatEntry, Ring, Show } from '../scoring/types'

// ── Constants ─────────────────────────────────────────────────────────────────

export const CLASS_ORDER = ['KIT', 'CAT', 'ALT', 'HHK', 'HHP', 'NBP', 'NBA', 'NTR']

export const CLASS_LABEL: Record<string, string> = {
  KIT: 'Kittens',
  CAT: 'Cats',
  ALT: 'Alters',
  HHK: 'HH Kittens',
  HHP: 'Household Pets',
  NBP: 'Prelim. New Breeds',
  NBA: 'Adv. New Breeds',
  NTR: 'New Traits',
}

const DEFAULT_CLASSES: Record<string, number> = {
  KIT: 1, CAT: 1, HHP: 1, HHK: 1, ALT: 1, NTR: 0, NBA: 0, NBP: 0,
}

const STORAGE_KEY = 'tkscore4:catalog'

// ── Factory helpers ───────────────────────────────────────────────────────────

export function newCatalog(): Catalog {
  return {
    reporter: '',
    email: '',
    club: '',
    location: '',
    date: '',
    options: { namewidth: 36, colwidth: 3, mixedcase: 0, printscore: 0 },
    entries: {},
    shows: [newShow('Saturday')],
  }
}

export function newShow(label: string): Show {
  return { label, nrings: 0, rings: [] }
}

export function newRing(name: string): Ring {
  return {
    judge: initials(name),
    name,
    absp: 'AB',
    congress: 0,
    classes: { ...DEFAULT_CLASSES },
    finals: {},
  }
}

// ── Mutation helpers ──────────────────────────────────────────────────────────

export function addShow(catalog: Catalog) {
  const labels = ['Saturday', 'Sunday', 'Monday', 'Tuesday']
  const label = labels[catalog.shows.length] ?? `Show ${catalog.shows.length + 1}`
  catalog.shows.push(newShow(label))
}

export function removeShow(catalog: Catalog, idx: number) {
  catalog.shows.splice(idx, 1)
}

export function addRing(catalog: Catalog, showIdx: number) {
  const show = catalog.shows[showIdx]
  show.rings.push(newRing(''))
  show.nrings = show.rings.length
}

export function removeRing(catalog: Catalog, showIdx: number, ringIdx: number) {
  const show = catalog.shows[showIdx]
  show.rings.splice(ringIdx, 1)
  show.nrings = show.rings.length
}

// ── Finals helpers ────────────────────────────────────────────────────────────

/**
 * Returns the finals key(s) for a given class on a ring.
 * AB rings use the class directly; SP rings split into LH and SH sub-categories.
 */
export function finalsKeysFor(ring: Ring, cls: string): string[] {
  return ring.absp === 'SP' ? [`LH${cls}`, `SH${cls}`] : [cls]
}

/** Ensure ring.finals[key] exists with empty slots. */
export function ensureFinalsSlot(ring: Ring, key: string) {
  if (!ring.finals[key]) {
    ring.finals[key] = { count: null, rank: Array(10).fill(null) }
  }
}

/** Set a placement in a finals slot. Converts numeric strings to numbers. */
export function setPlacement(ring: Ring, key: string, slot: number, raw: string) {
  ensureFinalsSlot(ring, key)
  if (raw === '' || raw === null) {
    ring.finals[key].rank[slot] = null
    return
  }
  const n = Number(raw)
  ring.finals[key].rank[slot] = Number.isInteger(n) && String(n) === raw ? n : raw
}

/** Set the count for a finals slot. */
export function setCount(ring: Ring, key: string, raw: string) {
  ensureFinalsSlot(ring, key)
  const n = Number(raw)
  ring.finals[key].count = raw === '' ? null : (Number.isFinite(n) ? n : raw)
}

/** Returns active class list for a show (classes enabled in at least one ring). */
export function activeClassesForShow(show: Show): string[] {
  return CLASS_ORDER.filter(cls =>
    show.rings.some(ring => {
      const v = ring.classes[cls]
      return Boolean(v) && v !== '0'
    })
  )
}

// ── Initials ──────────────────────────────────────────────────────────────────

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return (parts[0][0] ?? '').toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

// ── Persistence ───────────────────────────────────────────────────────────────

export function saveToStorage(catalog: Catalog) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog))
}

export function loadFromStorage(): Catalog | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Catalog
  } catch {
    return null
  }
}

export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
}

export function downloadCatalog(catalog: Catalog, filename?: string) {
  const name = filename ?? makeSafeFilename(catalog, '.json')
  triggerDownload(JSON.stringify(catalog, null, 2), name, 'application/json')
}

export function downloadReport(text: string, catalog: Catalog) {
  triggerDownload(text, makeSafeFilename(catalog, '.txt'), 'text/plain')
}

function makeSafeFilename(catalog: Catalog, ext: string): string {
  const base = [catalog.club, catalog.date].filter(Boolean).join('-') || 'show'
  return base.replace(/[^a-z0-9._-]/gi, '_') + ext
}

function triggerDownload(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Entries helpers ───────────────────────────────────────────────────────────

/**
 * Catalog-order sort comparator for entry numbers.
 * Matches Perl catalog_order: numeric part ascending, then alpha suffix ascending.
 * Reference: Entries.pm catalog_order
 */
export function catalogOrder(a: string, b: string): number {
  const ma = a.toUpperCase().match(/^(\d+)([A-Z]*)/)
  const mb = b.toUpperCase().match(/^(\d+)([A-Z]*)/)
  const na = ma ? parseInt(ma[1], 10) : 0
  const nb = mb ? parseInt(mb[1], 10) : 0
  const sa = ma ? ma[2] : a.toUpperCase()
  const sb = mb ? mb[2] : b.toUpperCase()
  return na !== nb ? na - nb : sa.localeCompare(sb)
}

/**
 * All unique entry numbers from catalog.entries + all finals rank arrays,
 * sorted in catalog order. Rank values are coerced to string.
 */
export function allEntryNumbers(catalog: Catalog): string[] {
  const nums = new Set<string>(Object.keys(catalog.entries))
  for (const show of catalog.shows) {
    for (const ring of show.rings) {
      for (const finals of Object.values(ring.finals)) {
        for (const rank of finals.rank) {
          if (rank != null) nums.add(String(rank))
        }
      }
    }
  }
  return [...nums].sort(catalogOrder)
}

/** Returns true if the entry number appears in any ring's finals rank array. */
export function isInFinals(catalog: Catalog, num: string): boolean {
  for (const show of catalog.shows) {
    for (const ring of show.rings) {
      for (const finals of Object.values(ring.finals)) {
        if (finals.rank.some(r => r != null && String(r) === num)) return true
      }
    }
  }
  return false
}

/** Ensure an entry slot exists; creates empty entry if missing. */
function ensureEntry(catalog: Catalog, num: string): CatEntry {
  if (!catalog.entries[num]) catalog.entries[num] = { name: '', breed: '' }
  return catalog.entries[num]
}

export function setEntryName(catalog: Catalog, num: string, name: string) {
  ensureEntry(catalog, num).name = name
}

export function setEntryBreed(catalog: Catalog, num: string, breed: string) {
  ensureEntry(catalog, num).breed = breed
}

/** Add a new entry by number. No-op if number is empty or already exists. */
export function addEntry(catalog: Catalog, num: string) {
  const n = num.trim()
  if (!n || catalog.entries[n]) return
  catalog.entries[n] = { name: '', breed: '' }
}

/** Remove an entry by number. Entry may still appear in finals after deletion. */
export function removeEntry(catalog: Catalog, num: string) {
  delete catalog.entries[num]
}
