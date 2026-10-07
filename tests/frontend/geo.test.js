import { describe, expect, it } from 'vitest'
import {
  CENTRO_TRENTO,
  PUNTEGGIO_MAX,
  distanzaMetri,
  formattaDistanza,
  lunghezzaPercorso,
  punteggio,
} from '../../src/frontend/src/lib/geo.js'

describe('distanzaMetri', () => {
  it('è zero tra un punto e se stesso', () => {
    expect(distanzaMetri(CENTRO_TRENTO, CENTRO_TRENTO)).toBe(0)
  })

  it('misura circa 111 km per un grado di latitudine', () => {
    expect(distanzaMetri([46, 11], [47, 11])).toBeCloseTo(111195, -2)
  })

  it('è simmetrica', () => {
    const a = [46.0667, 11.1214]
    const b = [46.0708, 11.1272]
    expect(distanzaMetri(a, b)).toBeCloseTo(distanzaMetri(b, a), 6)
  })
})

describe('lunghezzaPercorso', () => {
  it('somma i tratti nell\'ordine dato', () => {
    const a = [46.0, 11.0]
    const b = [46.01, 11.0]
    const c = [46.02, 11.0]
    expect(lunghezzaPercorso([a, b, c])).toBeCloseTo(distanzaMetri(a, c), 3)
  })

  it('è zero con meno di due punti', () => {
    expect(lunghezzaPercorso([])).toBe(0)
    expect(lunghezzaPercorso([CENTRO_TRENTO])).toBe(0)
  })
})

describe('formattaDistanza', () => {
  it('usa i metri sotto il chilometro, arrotondati a 10', () => {
    expect(formattaDistanza(347)).toBe('350 m')
  })

  it('usa i chilometri con un decimale', () => {
    expect(formattaDistanza(1234, 'it')).toBe('1,2 km')
    expect(formattaDistanza(1234, 'en')).toBe('1.2 km')
  })
})

describe('punteggio di "Dov\'era?"', () => {
  it('dà il massimo se si centra il luogo', () => {
    expect(punteggio(0)).toBe(PUNTEGGIO_MAX)
  })

  it('si dimezza circa ogni 200 m', () => {
    expect(punteggio(200)).toBeGreaterThan(480)
    expect(punteggio(200)).toBeLessThan(520)
  })

  it('cala sempre con la distanza e vale zero oltre i 2 km', () => {
    expect(punteggio(100)).toBeGreaterThan(punteggio(300))
    expect(punteggio(2001)).toBe(0)
  })
})
