// Controlli di coerenza sui dati dei luoghi: finché non c'è il database,
// sono questi test a garantire i vincoli che il database imporrebbe.
import { describe, expect, it } from 'vitest'
import luoghi from '../src/data/luoghi.json'
import itinerari from '../src/data/itinerari.json'
import tradizioni from '../src/data/tradizioni.json'
import gioco from '../src/data/gioco.json'
import testiIt from '../src/i18n/it.js'
import testiEn from '../src/i18n/en.js'

const idLuoghi = new Set(luoghi.map((p) => p.id))
const CATEGORIE = ['storia', 'arte', 'tradizioni', 'gastronomia']

describe('luoghi', () => {
  it('hanno identificatori unici', () => {
    expect(idLuoghi.size).toBe(luoghi.length)
  })

  it.each(luoghi)('$id ha i campi obbligatori e almeno una fonte (RNF-V01)', (p) => {
    expect(p.nome).toBeTruthy()
    expect(p.sintesi).toBeTruthy()
    expect(p.descrizione.length).toBeGreaterThan(0)
    expect(CATEGORIE).toContain(p.categoria)
    expect(p.fonti.length).toBeGreaterThan(0)
    for (const f of p.fonti) expect(f.url).toMatch(/^https:\/\//)
  })

  it.each(luoghi)('$id si trova nel comune di Trento', ({ posizione: [lat, lng] }) => {
    expect(lat).toBeGreaterThan(46.0)
    expect(lat).toBeLessThan(46.15)
    expect(lng).toBeGreaterThan(11.05)
    expect(lng).toBeLessThan(11.2)
  })

  it('hanno etichette tradotte per ogni categoria e tema', () => {
    for (const p of luoghi) {
      for (const chiave of [`categoria.${p.categoria}`, ...p.temi.map((t) => `tema.${t}`)]) {
        expect(testiIt[chiave], chiave).toBeTruthy()
        expect(testiEn[chiave], chiave).toBeTruthy()
      }
    }
  })
})

describe('riferimenti ai luoghi', () => {
  it('le tappe degli itinerari esistono', () => {
    for (const itin of itinerari) {
      expect(itin.tappe.length).toBeGreaterThan(1)
      for (const t of itin.tappe) expect(idLuoghi.has(t), `${itin.id} → ${t}`).toBe(true)
    }
  })

  it('i luoghi delle tradizioni esistono', () => {
    for (const t of tradizioni) for (const l of t.luoghi) expect(idLuoghi.has(l), `${t.id} → ${l}`).toBe(true)
  })

  it('i livelli del gioco puntano a luoghi esistenti', () => {
    for (const g of gioco) expect(idLuoghi.has(g.poi), `${g.id} → ${g.poi}`).toBe(true)
  })
})

describe('testi dell\'interfaccia', () => {
  it('italiano e inglese hanno le stesse chiavi (RNF-U05)', () => {
    expect(Object.keys(testiEn).sort()).toEqual(Object.keys(testiIt).sort())
  })
})
