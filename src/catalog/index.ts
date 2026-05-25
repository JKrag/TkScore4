import type { Catalog, Ring, Show } from '../scoring/types'

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

export function updateRingName(ring: Ring, name: string) {
  ring.name = name
  // Only auto-update judge initials if they still match the old auto-generated value
  // (i.e. user hasn't manually edited them). We do this by checking if current judge
  // equals what initials() would have produced for the old name.
  ring.judge = initials(name)
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
      return v !== null && v !== undefined && v !== 0 && v !== '' && v !== '0'
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
