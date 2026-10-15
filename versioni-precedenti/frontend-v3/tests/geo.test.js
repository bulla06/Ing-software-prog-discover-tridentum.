import { describe, expect, it } from 'vitest'
import {
  CENTRO_TRENTO,
  direzioneGradi,
  distanzaMetri,
  formattaDistanza,
  luoghiInVista,
  lunghezzaPercorso,
  scartoAngolare,
} from '../src/lib/geo.js'

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

describe('direzioneGradi e scartoAngolare', () => {
  it('misura la direzione da nord in senso orario', () => {
    const duomo = [46.0667, 11.1214]
    expect(direzioneGradi(duomo, [46.0767, 11.1214])).toBeCloseTo(0, 0) // nord
    expect(direzioneGradi(duomo, [46.0667, 11.1314])).toBeCloseTo(90, 0) // est
    expect(direzioneGradi(duomo, [46.0567, 11.1214])).toBeCloseTo(180, 0) // sud
    expect(direzioneGradi(duomo, [46.0667, 11.1114])).toBeCloseTo(270, 0) // ovest
  })

  it('calcola lo scarto più breve tra due direzioni', () => {
    expect(scartoAngolare(350, 10)).toBe(20)
    expect(scartoAngolare(10, 350)).toBe(20)
    expect(scartoAngolare(90, 270)).toBe(180)
    expect(scartoAngolare(45, 45)).toBe(0)
  })
})

describe('luoghiInVista (RF-06)', () => {
  const qui = [46.0667, 11.1214]
  const luoghi = [
    { id: 'nord-vicino', posizione: [46.0685, 11.1215] }, // circa 200 m a nord
    { id: 'nord-lontano', posizione: [46.0720, 11.1214] }, // circa 590 m a nord
    { id: 'est', posizione: [46.0667, 11.1240] }, // circa 200 m a est
    { id: 'accanto', posizione: [46.06675, 11.1214] }, // a 5 m
  ]

  it('trova i luoghi nella direzione in cui si guarda, entro il raggio, dal più vicino', () => {
    const ids = luoghiInVista(qui, 0, luoghi).map((l) => l.poi.id)
    expect(ids).toEqual(['accanto', 'nord-vicino'])
    expect(luoghiInVista(qui, 90, luoghi).map((l) => l.poi.id)).toEqual(['accanto', 'est'])
  })

  it('senza bussola propone i luoghi più vicini', () => {
    expect(luoghiInVista(qui, null, luoghi, { raggioVicini: 100 }).map((l) => l.poi.id)).toEqual(['accanto'])
  })
})
