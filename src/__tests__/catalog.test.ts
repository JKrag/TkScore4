import {
  newCatalog, newRing, addRing, removeRing, addShow,
  finalsKeysFor, ensureFinalsSlot, setPlacement, initials,
  activeClassesForShow,
  catalogOrder, allEntryNumbers, isInFinals, setEntryName, setEntryBreed, addEntry, removeEntry,
} from '../catalog/index'
import { generateReport } from '../scoring/report'

describe('catalog helpers', () => {
  it('newCatalog produces a valid catalog with one show', () => {
    const c = newCatalog()
    expect(c.shows).toHaveLength(1)
    expect(c.shows[0].label).toBe('Saturday')
    expect(c.entries).toEqual({})
  })

  it('addRing / removeRing maintain nrings', () => {
    const c = newCatalog()
    addRing(c, 0)
    addRing(c, 0)
    expect(c.shows[0].rings).toHaveLength(2)
    expect(c.shows[0].nrings).toBe(2)
    removeRing(c, 0, 0)
    expect(c.shows[0].rings).toHaveLength(1)
    expect(c.shows[0].nrings).toBe(1)
  })

  it('addShow appends with sequential labels', () => {
    const c = newCatalog()
    addShow(c)
    expect(c.shows).toHaveLength(2)
    expect(c.shows[1].label).toBe('Sunday')
  })

  it('initials derives two-letter code from full name', () => {
    expect(initials('Yvonne Patrick')).toBe('YP')
    expect(initials('Clint Knapp')).toBe('CK')
    expect(initials('Jay Bangle')).toBe('JB')
    expect(initials('')).toBe('')
  })

  it('finalsKeysFor returns class directly for AB rings', () => {
    const ring = newRing('Test Judge')
    ring.absp = 'AB'
    expect(finalsKeysFor(ring, 'CAT')).toEqual(['CAT'])
    expect(finalsKeysFor(ring, 'KIT')).toEqual(['KIT'])
  })

  it('finalsKeysFor returns LH/SH pair for SP rings', () => {
    const ring = newRing('Test Judge')
    ring.absp = 'SP'
    expect(finalsKeysFor(ring, 'CAT')).toEqual(['LHCAT', 'SHCAT'])
    expect(finalsKeysFor(ring, 'KIT')).toEqual(['LHKIT', 'SHKIT'])
  })

  it('setPlacement stores numbers as integers and strings as strings', () => {
    const ring = newRing('J')
    setPlacement(ring, 'CAT', 0, '401')
    expect(ring.finals['CAT'].rank[0]).toBe(401)
    setPlacement(ring, 'CAT', 1, '401A')
    expect(ring.finals['CAT'].rank[1]).toBe('401A')
    setPlacement(ring, 'CAT', 2, '')
    expect(ring.finals['CAT'].rank[2]).toBeNull()
  })

  it('activeClassesForShow returns classes active in at least one ring', () => {
    const c = newCatalog()
    addRing(c, 0)
    const show = c.shows[0]
    // Default: KIT, CAT, HHP, HHK, ALT active; NTR, NBA, NBP inactive
    const active = activeClassesForShow(show)
    expect(active).toContain('KIT')
    expect(active).toContain('CAT')
    expect(active).not.toContain('NTR')
  })
})

describe('catalogOrder', () => {
  it('sorts numerically', () => {
    expect(['99', '100', '7'].sort(catalogOrder)).toEqual(['7', '99', '100'])
  })

  it('puts alpha suffix after bare number', () => {
    expect(['401B', '401A', '401'].sort(catalogOrder)).toEqual(['401', '401A', '401B'])
  })

  it('handles mixed numeric and suffixed entries', () => {
    expect(['402', '401A', '401', '400B'].sort(catalogOrder)).toEqual(['400B', '401', '401A', '402'])
  })

  it('is case-insensitive for suffix', () => {
    expect(catalogOrder('401a', '401B')).toBeLessThan(0)
  })
})

describe('allEntryNumbers', () => {
  it('returns empty array for empty catalog', () => {
    expect(allEntryNumbers(newCatalog())).toEqual([])
  })

  it('includes entries from catalog.entries', () => {
    const c = newCatalog()
    c.entries['401'] = { name: 'Fluffy', breed: 'MC' }
    c.entries['402'] = { name: 'Spot', breed: 'AB' }
    expect(allEntryNumbers(c)).toEqual(['401', '402'])
  })

  it('includes entries only in finals (no entry record)', () => {
    const c = newCatalog()
    addRing(c, 0)
    const ring = c.shows[0].rings[0]
    ensureFinalsSlot(ring, 'CAT')
    ring.finals['CAT'].rank = [401, null, null, null, null, null, null, null, null, null]
    expect(allEntryNumbers(c)).toContain('401')
  })

  it('deduplicates entries that appear in both entries and finals', () => {
    const c = newCatalog()
    c.entries['401'] = { name: 'Fluffy', breed: 'MC' }
    addRing(c, 0)
    const ring = c.shows[0].rings[0]
    ensureFinalsSlot(ring, 'CAT')
    ring.finals['CAT'].rank = [401, null, null, null, null, null, null, null, null, null]
    const nums = allEntryNumbers(c)
    expect(nums.filter(n => n === '401')).toHaveLength(1)
  })

  it('sorts in catalog order', () => {
    const c = newCatalog()
    c.entries['402'] = { name: 'B', breed: 'MC' }
    c.entries['401A'] = { name: 'C', breed: 'MC' }
    c.entries['401'] = { name: 'A', breed: 'MC' }
    expect(allEntryNumbers(c)).toEqual(['401', '401A', '402'])
  })

  it('includes string-keyed entries like 401A from finals rank', () => {
    const c = newCatalog()
    addRing(c, 0)
    const ring = c.shows[0].rings[0]
    ensureFinalsSlot(ring, 'CAT')
    ring.finals['CAT'].rank = ['401A', null, null, null, null, null, null, null, null, null]
    expect(allEntryNumbers(c)).toContain('401A')
  })
})

describe('isInFinals', () => {
  it('returns false for catalog with no finals', () => {
    const c = newCatalog()
    c.entries['401'] = { name: 'Fluffy', breed: 'MC' }
    expect(isInFinals(c, '401')).toBe(false)
  })

  it('returns true when entry appears as integer in rank', () => {
    const c = newCatalog()
    addRing(c, 0)
    const ring = c.shows[0].rings[0]
    ensureFinalsSlot(ring, 'CAT')
    ring.finals['CAT'].rank[0] = 401
    expect(isInFinals(c, '401')).toBe(true)
  })

  it('returns true when entry appears as string in rank', () => {
    const c = newCatalog()
    addRing(c, 0)
    const ring = c.shows[0].rings[0]
    ensureFinalsSlot(ring, 'CAT')
    ring.finals['CAT'].rank[0] = '401A'
    expect(isInFinals(c, '401A')).toBe(true)
  })

  it('returns false when entry not in any rank', () => {
    const c = newCatalog()
    addRing(c, 0)
    const ring = c.shows[0].rings[0]
    ensureFinalsSlot(ring, 'CAT')
    ring.finals['CAT'].rank[0] = 402
    expect(isInFinals(c, '401')).toBe(false)
  })
})

describe('entry mutations', () => {
  it('setEntryName creates entry if missing', () => {
    const c = newCatalog()
    setEntryName(c, '401', 'Fluffy')
    expect(c.entries['401'].name).toBe('Fluffy')
    expect(c.entries['401'].breed).toBe('')
  })

  it('setEntryBreed creates entry if missing', () => {
    const c = newCatalog()
    setEntryBreed(c, '401', 'MC')
    expect(c.entries['401'].breed).toBe('MC')
    expect(c.entries['401'].name).toBe('')
  })

  it('addEntry creates a new blank entry', () => {
    const c = newCatalog()
    addEntry(c, '401')
    expect(c.entries['401']).toEqual({ name: '', breed: '' })
  })

  it('addEntry is no-op for duplicate or empty number', () => {
    const c = newCatalog()
    c.entries['401'] = { name: 'Fluffy', breed: 'MC' }
    addEntry(c, '401')
    expect(c.entries['401'].name).toBe('Fluffy')
    addEntry(c, '')
    expect(Object.keys(c.entries)).toHaveLength(1)
  })

  it('removeEntry deletes the entry', () => {
    const c = newCatalog()
    c.entries['401'] = { name: 'Fluffy', breed: 'MC' }
    removeEntry(c, '401')
    expect(c.entries['401']).toBeUndefined()
  })
})

describe('generateReport with hand-built catalog', () => {
  it('produces output for a minimal catalog with no entries', () => {
    const catalog = newCatalog()
    catalog.club = 'Test Club'
    catalog.location = 'Somewhere'
    catalog.date = 'January 1, 2026'
    catalog.reporter = 'Test Reporter'
    addRing(catalog, 0)
    const ring = catalog.shows[0].rings[0]
    ring.name = 'Yvonne Patrick'
    ring.judge = 'YP'
    ring.absp = 'AB'
    ensureFinalsSlot(ring, 'KIT')
    ring.finals['KIT'].count = 5
    ring.finals['KIT'].rank = [401, 402, 403, null, null, null, null, null, null, null]

    const report = generateReport(catalog, { namewidth: 36, colwidth: 3 })
    expect(report).toContain('Test Club')
    expect(report).toContain('KITTENS')
    expect(report).toContain('YP')
    // Entries not in catalog.entries → display as #401 fallback
    expect(report).toContain('#401')
  })
})
