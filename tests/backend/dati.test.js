// Controlli di coerenza sui dati iniziali (versione-corrente/backend/src/db/dati): i pacchetti
// NNN-nome e i livelli del gioco, prima che vengano caricati nel database.
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CARTELLA_DATI, elencaPacchetti, leggiPacchetto } from '../../versione-corrente/backend/src/db/popola.js'
import testiIt from '../../versione-corrente/frontend/src/i18n/it.js'
import testiEn from '../../versione-corrente/frontend/src/i18n/en.js'
import testiDe from '../../versione-corrente/frontend/src/i18n/de.js'
import informativa from '../../versione-corrente/frontend/src/i18n/informativa.js'

// Tutti i pacchetti insieme, come risultano nel database alla fine del caricamento:
// le voci nuove, con le correzioni e le traduzioni dei pacchetti successivi
const pacchetti = await Promise.all((await elencaPacchetti()).map(async (nome) => ({ nome, ...(await leggiPacchetto(nome)) })))
const tutti = (chiave) => pacchetti.flatMap((p) => p[chiave].map((voce) => ({ ...voce, pacchetto: p.nome })))
const correzioni = pacchetti.flatMap((p) => p.correzioni.luoghi)
const correzioniTradizioni = pacchetti.flatMap((p) => p.correzioni.tradizioni)
// Le lingue si sommano: ogni lingua si scrive solo dove non c'è ancora (come popola.js), e le traduzioni
// scritte dentro la voce valgono più di quelle dei pacchetti successivi
const traduzioni = (chiave) => {
  const tutte = {}
  for (const p of pacchetti) for (const [id, t] of Object.entries(p.traduzioni[chiave])) tutte[id] = { ...t, ...tutte[id] }
  return tutte
}
const conTraduzioni = (voci, chiave) => voci.map((v) => ({ ...v, traduzioni: { ...traduzioni(chiave)[v.id], ...v.traduzioni } }))
const luoghi = conTraduzioni(
  tutti('luoghi').map((p) => Object.assign({}, p, ...correzioni.filter((c) => c.id === p.id))),
  'luoghi',
)
const itinerari = conTraduzioni(tutti('itinerari'), 'itinerari')
const tradizioni = conTraduzioni(
  tutti('tradizioni').map((t) => {
    const c = correzioniTradizioni.filter((x) => x.id === t.id)
    return { ...t, luoghi: [...t.luoghi, ...c.flatMap((x) => x.aggiungi_luoghi ?? [])], descrizione: c.at(-1)?.descrizione ?? t.descrizione }
  }),
  'tradizioni',
)
const piatti = conTraduzioni(tutti('piatti'), 'piatti')
const foto = tutti('foto')
const fotoDaScaricare = JSON.parse(await readFile(path.join(CARTELLA_DATI, 'foto-da-scaricare.json'), 'utf8'))
// I livelli del gioco stanno fuori dai pacchetti: dati/gioco.json, con le foto in dati/foto-gioco/
const gioco = JSON.parse(await readFile(path.join(CARTELLA_DATI, 'gioco.json'), 'utf8'))

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

  it('i locali della mappa del gusto hanno un piatto consigliato (RF-20)', () => {
    for (const p of luoghi.filter((l) => l.categoria === 'gastronomia')) expect(p.piatto_consigliato, p.id).toBeTruthy()
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
  it('le tappe degli itinerari esistono e i temi hanno un\'etichetta', () => {
    for (const itin of itinerari) {
      expect(testiIt[`tema.${itin.tema}`], itin.tema).toBeTruthy()
      expect(itin.tappe.length).toBeGreaterThan(1)
      for (const t of itin.tappe) expect(idLuoghi.has(t), `${itin.id} → ${t}`).toBe(true)
    }
  })

  it('i luoghi delle tradizioni esistono', () => {
    for (const t of tradizioni) for (const l of t.luoghi) expect(idLuoghi.has(l), `${t.id} → ${l}`).toBe(true)
  })

  it('i livelli del gioco puntano a luoghi esistenti e sono almeno 5 (UC-06 E1)', () => {
    expect(gioco.length).toBeGreaterThanOrEqual(5)
    expect(new Set(gioco.map((g) => g.id)).size).toBe(gioco.length)
    for (const g of gioco) expect(idLuoghi.has(g.poi), `${g.id} → ${g.poi}`).toBe(true)
  })

  it('ogni livello del gioco ha la sua foto storica, con autore, licenza e fonte', () => {
    for (const g of gioco) {
      expect(g.foto, g.id).toBe(`${g.id}.webp`)
      expect(existsSync(path.join(CARTELLA_DATI, 'foto-gioco', g.foto)), g.foto).toBe(true)
      expect(g.autore && g.licenza, g.id).toBeTruthy()
      expect(g.fonte, g.id).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
    }
  })
})

describe('foto dei luoghi', () => {
  it('ogni foto esiste e indica luogo, autore, licenza e fonte', () => {
    for (const f of foto) {
      expect(existsSync(path.join(CARTELLA_DATI, f.pacchetto, 'foto', f.file)), f.file).toBe(true)
      expect(idLuoghi.has(f.poi), `${f.file} → ${f.poi}`).toBe(true)
      expect(f.autore, f.file).toBeTruthy()
      expect(f.licenza, f.file).toBeTruthy()
      expect(f.fonte, f.file).toMatch(/^https:\/\//)
    }
  })
})

describe('correzioni dei pacchetti', () => {
  it('riguardano voci di pacchetti precedenti e campi che si possono correggere', () => {
    const tuttiGliId = new Set(tutti('luoghi').map((p) => p.id))
    const permessi = ['id', 'nome', 'sintesi', 'descrizione', 'indirizzo', 'epoca', 'temi', 'parole_chiave', 'piatto_consigliato', 'fonti', 'affresco']
    for (const c of correzioni) {
      expect(tuttiGliId.has(c.id), c.id).toBe(true)
      for (const campo of Object.keys(c)) expect(permessi, `${c.id}.${campo}`).toContain(campo)
    }
  })

  it('la descrizione precedente di una tradizione corrisponde a quella originale', () => {
    const originali = Object.fromEntries(tutti('tradizioni').map((t) => [t.id, t.descrizione]))
    for (const c of correzioniTradizioni.filter((x) => x.descrizione)) {
      expect(c.descrizione_precedente, c.id).toBe(originali[c.id])
    }
  })

  it('ogni tradizione ha almeno un luogo collegato (UC-10, passo 6)', () => {
    for (const t of tradizioni) expect(t.luoghi.length, t.id).toBeGreaterThan(0)
  })
})

describe('contenuti verificati (RF-02, RF-03)', () => {
  it('i testi non contengono note "da verificare" o "da confermare"', () => {
    const testo = JSON.stringify({ luoghi, itinerari, tradizioni, piatti })
    expect(testo).not.toMatch(/da verificar|da confermar|vanno verificat|va confermat/i)
  })

  it('almeno 15 affreschi catalogati, con autore ed epoca, tutti con il tema "arte" (Fase 4, WBS 3.3)', () => {
    const affreschi = luoghi.filter((p) => p.affresco?.autore)
    expect(affreschi.length).toBeGreaterThanOrEqual(15)
    for (const p of affreschi) {
      expect(p.affresco.epoca, p.id).toBeTruthy()
      expect(p.temi, p.id).toContain('arte')
    }
  })

  it('le foto da scaricare da Commons riguardano luoghi esistenti, con un file, una categoria o una ricerca', () => {
    for (const f of fotoDaScaricare) {
      expect(idLuoghi.has(f.poi), f.poi).toBe(true)
      expect(Boolean(f.file || f.categoria || f.ricerca), f.poi).toBe(true)
    }
    // Ogni affresco ha una foto prevista
    for (const p of luoghi.filter((l) => l.affresco?.autore)) {
      expect(fotoDaScaricare.some((f) => f.poi === p.id) || foto.some((f) => f.poi === p.id), p.id).toBe(true)
    }
  })
})

describe('traduzioni in inglese (RNF-U05)', () => {
  it('ogni luogo ha nome, sintesi e storia in inglese, con gli stessi paragrafi', () => {
    for (const p of luoghi) {
      const en = p.traduzioni.en
      expect(en?.nome && en.sintesi, p.id).toBeTruthy()
      expect(en.descrizione?.length, p.id).toBe(p.descrizione.length)
      if (p.affresco?.autore && !/^[A-Z][a-zà-ù]+ [A-Z]/.test(p.affresco.autore)) expect(en.affresco_autore, p.id).toBeTruthy()
      if (p.piatto_consigliato) expect(en.piatto_consigliato, p.id).toBeTruthy()
    }
  })

  it('itinerari, tradizioni e piatti sono tradotti', () => {
    for (const i of itinerari) expect(i.traduzioni.en?.titolo && i.traduzioni.en.descrizione, i.id).toBeTruthy()
    for (const t of tradizioni) expect(t.traduzioni.en?.nome && t.traduzioni.en.periodo && t.traduzioni.en.descrizione, t.id).toBeTruthy()
    for (const p of piatti) expect(p.traduzioni.en?.nome && p.traduzioni.en.tipo && p.traduzioni.en.descrizione, p.id).toBeTruthy()
  })

  it('le traduzioni riguardano voci esistenti', () => {
    for (const [chiave, voci] of [['luoghi', luoghi], ['itinerari', itinerari], ['tradizioni', tradizioni], ['piatti', piatti]]) {
      const ids = new Set(voci.map((v) => v.id))
      for (const id of Object.keys(traduzioni(chiave))) expect(ids.has(id), `${chiave}: ${id}`).toBe(true)
    }
  })
})

describe('traduzioni in tedesco (RNF-U05)', () => {
  // Il tedesco ha le stesse voci tradotte dell'inglese, con gli stessi campi e gli stessi paragrafi
  const campi = (t) => Object.keys(t ?? {}).sort()

  it('ogni luogo, itinerario, tradizione e piatto tradotto in inglese lo è anche in tedesco', () => {
    for (const [chiave, voci] of [['luoghi', luoghi], ['itinerari', itinerari], ['tradizioni', tradizioni], ['piatti', piatti]]) {
      for (const v of voci) {
        expect(campi(v.traduzioni.de), `${chiave}: ${v.id}`).toEqual(campi(v.traduzioni.en))
        if (Array.isArray(v.traduzioni.en?.descrizione)) {
          expect(v.traduzioni.de.descrizione.length, `${chiave}: ${v.id}`).toBe(v.traduzioni.en.descrizione.length)
        }
        for (const testo of Object.values(v.traduzioni.de ?? {}).flat()) expect(testo.trim(), `${chiave}: ${v.id}`).not.toBe('')
      }
    }
  })

  it('le traduzioni tedesche non sono copie dell\'inglese né dell\'italiano', () => {
    for (const p of luoghi) {
      expect(p.traduzioni.de.sintesi, p.id).not.toBe(p.traduzioni.en.sintesi)
      expect(p.traduzioni.de.sintesi, p.id).not.toBe(p.sintesi)
    }
  })
})

describe('testi dell\'interfaccia', () => {
  const segnaposto = (t) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

  it('italiano, inglese e tedesco hanno le stesse chiavi (RNF-U05)', () => {
    expect(Object.keys(testiEn).sort()).toEqual(Object.keys(testiIt).sort())
    expect(Object.keys(testiDe).sort()).toEqual(Object.keys(testiIt).sort())
  })

  it('ogni testo tradotto ha gli stessi segnaposto dell\'italiano e nessun testo è vuoto', () => {
    for (const [lingua, testi] of [['en', testiEn], ['de', testiDe]]) {
      for (const [chiave, testo] of Object.entries(testiIt)) {
        expect(segnaposto(testi[chiave]), `${lingua}: ${chiave}`).toEqual(segnaposto(testo))
        expect(testi[chiave].trim(), `${lingua}: ${chiave}`).not.toBe('')
      }
    }
  })

  it('l\'informativa privacy ha le stesse sezioni e gli stessi segnaposto in tutte le lingue', () => {
    expect(Object.keys(informativa).sort()).toEqual(['de', 'en', 'it'])
    const forma = (i) => i.sezioni.map((x) => [x.testi?.length ?? 0, x.elenco?.length ?? 0])
    const segnapostiDei = (i) => i.sezioni.flatMap((x) => [...(x.testi ?? []), ...(x.elenco ?? [])]).map(segnaposto)
    for (const lingua of ['en', 'de']) {
      expect(forma(informativa[lingua]), lingua).toEqual(forma(informativa.it))
      expect(segnapostiDei(informativa[lingua]), lingua).toEqual(segnapostiDei(informativa.it))
      expect(informativa[lingua].titolo && informativa[lingua].aggiornata && informativa[lingua].intro && informativa[lingua].contattoMancante, lingua).toBeTruthy()
    }
  })
})
