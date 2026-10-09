import { describe, expect, it } from 'vitest'
import { filtraPoi, normalizza } from '../src/lib/cerca.js'

const poi = (id, nome, extra = {}) => ({
  id,
  nome,
  categoria: 'storia',
  temi: [],
  sintesi: '',
  indirizzo: '',
  parole_chiave: [],
  descrizione: [],
  ...extra,
})

const LUOGHI = [
  poi('torre', 'Torre Vanga', { temi: ['adige'], descrizione: ['Controllava il ponte sul fiume.'] }),
  poi('affreschi', 'Case dipinte', { categoria: 'arte', parole_chiave: ['torre'] }),
  poi('citta', 'Città romana', { temi: ['tridentum'] }),
]

describe('normalizza', () => {
  it('toglie maiuscole e accenti', () => {
    expect(normalizza('  Città ')).toBe('citta')
  })
})

describe('filtraPoi', () => {
  it('senza filtri restituisce tutti i luoghi', () => {
    expect(filtraPoi(LUOGHI)).toHaveLength(3)
  })

  it('filtra per categoria (RF-04)', () => {
    expect(filtraPoi(LUOGHI, { categoria: 'arte' }).map((p) => p.id)).toEqual(['affreschi'])
  })

  it('filtra per tema (RF-04)', () => {
    expect(filtraPoi(LUOGHI, { tema: 'adige' }).map((p) => p.id)).toEqual(['torre'])
  })

  it('cerca nel nome, nelle parole chiave e nella descrizione (RF-05)', () => {
    expect(filtraPoi(LUOGHI, { q: 'fiume' }).map((p) => p.id)).toEqual(['torre'])
  })

  it('ignora accenti e maiuscole', () => {
    expect(filtraPoi(LUOGHI, { q: 'CITTA' }).map((p) => p.id)).toEqual(['citta'])
  })

  it('mette prima chi ha la parola nel nome', () => {
    expect(filtraPoi(LUOGHI, { q: 'torre' }).map((p) => p.id)).toEqual(['torre', 'affreschi'])
  })

  it('richiede tutte le parole cercate', () => {
    expect(filtraPoi(LUOGHI, { q: 'torre ponte' }).map((p) => p.id)).toEqual(['torre'])
    expect(filtraPoi(LUOGHI, { q: 'torre romana' })).toHaveLength(0)
  })

  it('combina ricerca e filtri', () => {
    expect(filtraPoi(LUOGHI, { q: 'torre', categoria: 'arte' }).map((p) => p.id)).toEqual(['affreschi'])
  })
})
