import {
  newCatalog, newRing, addRing, removeRing, addShow,
  finalsKeysFor, ensureFinalsSlot, setPlacement, initials,
  activeClassesForShow,
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
