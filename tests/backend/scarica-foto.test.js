// Script che scarica le foto dei luoghi da Wikimedia Commons (strumenti/scarica-foto.js).
// Commons qui è simulato: si controlla che lo script scelga solo file con licenza libera,
// riporti autore, licenza e fonte e crei un pacchetto di dati valido.
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { scaricaFoto, testoSemplice } from '../../versione-corrente/backend/src/strumenti/scarica-foto.js'

let cartella
beforeAll(async () => {
  cartella = await mkdtemp(path.join(tmpdir(), 'tridentum-dati-'))
  await mkdir(path.join(cartella, '001-iniziali', 'foto'), { recursive: true })
  await writeFile(path.join(cartella, '001-iniziali', 'foto.json'), JSON.stringify([{ poi: 'con-foto', file: 'x.jpg', autore: 'A', licenza: 'CC0' }]))
  await writeFile(
    path.join(cartella, 'foto-da-scaricare.json'),
    JSON.stringify([
      { poi: 'con-foto', file: 'Gia.jpg' },
      { poi: 'duomo', file: 'Duomo di Trento.jpg' },
      { poi: 'geremia', categoria: 'Palazzo Geremia (Trento)' },
      { poi: 'introvabile', ricerca: 'niente' },
    ]),
  )
})
afterAll(() => rm(cartella, { recursive: true, force: true }))

const FILE = {
  'File:Duomo di Trento.jpg': { licenza: 'CC BY-SA 4.0', autore: '<a href="//commons.wikimedia.org/wiki/User:Mario">Mario Rossi</a>', mime: 'image/jpeg' },
  'File:Riservata.jpg': { licenza: 'All rights reserved', autore: 'X', mime: 'image/jpeg' },
  'File:Geremia.png': { licenza: 'Public domain', autore: 'Giovanni Battista Unterveger', mime: 'image/png' },
}

/** Risposte finte dell'API di Commons e del server delle immagini */
async function commonsFinto(url, opzioni) {
  expect(opzioni.headers['User-Agent']).toMatch(/DiscoverTridentum/)
  const u = new URL(url)
  if (u.hostname === 'upload.wikimedia.org') return new Response(new Uint8Array([1, 2, 3]))
  const p = u.searchParams
  const json = (dati) => new Response(JSON.stringify(dati), { headers: { 'Content-Type': 'application/json' } })
  if (p.get('list') === 'categorymembers') {
    expect(p.get('cmtitle')).toBe('Category:Palazzo Geremia (Trento)')
    return json({ query: { categorymembers: [{ title: 'File:Riservata.jpg' }, { title: 'File:Geremia.png' }] } })
  }
  if (p.get('list') === 'search') return json({ query: { search: [] } })
  const titolo = p.get('titles')
  const f = FILE[titolo]
  const nome = encodeURIComponent(titolo.slice(5))
  return json({
    query: {
      pages: [
        {
          imageinfo: f && [
            {
              mime: f.mime,
              url: `https://upload.wikimedia.org/originale/${nome}`,
              thumburl: `https://upload.wikimedia.org/1600px-${nome}`,
              descriptionurl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(titolo)}`,
              extmetadata: {
                Artist: { value: f.autore },
                LicenseShortName: { value: f.licenza },
                LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
                ImageDescription: { value: '<p>Facciata &amp; dettagli</p>' },
              },
            },
          ],
        },
      ],
    },
  })
}

const silenzioso = { log: () => {}, warn: () => {} }

describe('scarica-foto', () => {
  it('toglie i tag HTML dai crediti di Commons', () => {
    expect(testoSemplice('<a href="x">Mario</a> &amp; <b>Lucia</b>')).toBe('Mario & Lucia')
  })

  it('in prova non scrive niente', async () => {
    const esito = await scaricaFoto({ fetchFn: commonsFinto, cartellaDati: cartella, prova: true, registro: silenzioso })
    expect(esito.pacchetto).toBeNull()
    expect(esito.scaricate).toEqual(['duomo', 'geremia'])
  })

  it('crea un pacchetto con le foto e i crediti, saltando licenze non libere e luoghi che hanno già una foto', async () => {
    const esito = await scaricaFoto({ fetchFn: commonsFinto, cartellaDati: cartella, registro: silenzioso })
    expect(esito.pacchetto).toBe('002-foto-dei-luoghi')
    expect(esito.saltate).toEqual(['con-foto'])
    expect(esito.nonTrovate).toEqual(['introvabile'])
    expect(esito.daControllare).toEqual(['geremia'])

    const foto = JSON.parse(await readFile(path.join(cartella, esito.pacchetto, 'foto.json'), 'utf8'))
    expect(foto).toEqual([
      expect.objectContaining({ poi: 'duomo', file: 'duomo.jpg', autore: 'Mario Rossi', licenza: 'CC BY-SA 4.0', didascalia: 'Facciata & dettagli' }),
      expect.objectContaining({ poi: 'geremia', file: 'geremia.png', autore: 'Giovanni Battista Unterveger', licenza: 'Public domain' }),
    ])
    expect(foto[0].fonte).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File/)
    const immagine = await readFile(path.join(cartella, esito.pacchetto, 'foto', 'duomo.jpg'))
    expect([...immagine]).toEqual([1, 2, 3])
  })
})
