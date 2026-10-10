// UC-01, UC-02, UC-10 (consultazione) · UC-07 Gestire i POI
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { popola } from '../../versione-corrente/backend/src/db/popola.js'
import { ACCOUNT, accedi, creaAmbiente } from './ambiente.js'

let amb
let admin
beforeAll(async () => {
  amb = await creaAmbiente()
  admin = await accedi(amb.app, ACCOUNT.amministratore)
})
afterAll(() => amb.chiudi())

describe('consultazione dei POI (UC-01)', () => {
  it('elenca i POI con la posizione', async () => {
    const r = await amb.api().get('/api/poi')
    expect(r.status).toBe(200)
    expect(r.body.length).toBeGreaterThan(10)
    const duomo = r.body.find((p) => p.id === 'duomo')
    expect(duomo.posizione).toEqual([46.0667, 11.1214])
  })

  it('filtra per categoria e tema (RF-04)', async () => {
    const arte = (await amb.api().get('/api/poi?categoria=arte')).body
    expect(arte.length).toBeGreaterThan(0)
    expect(arte.every((p) => p.categoria === 'arte')).toBe(true)

    const adige = (await amb.api().get('/api/poi?tema=adige')).body
    expect(adige.every((p) => p.temi.includes('adige'))).toBe(true)
  })

  it('cerca ignorando maiuscole e accenti, prima chi ha la parola nel nome (RF-05)', async () => {
    const torre = (await amb.api().get('/api/poi?q=TORRE')).body
    const conNome = torre.filter((p) => p.nome.toLowerCase().includes('torre'))
    expect(conNome.map((p) => p.id)).toEqual(expect.arrayContaining(['torre-aquila', 'torre-vanga']))
    expect(torre.slice(0, conNome.length)).toEqual(conNome)
    expect(torre.length).toBeGreaterThan(conNome.length) // anche chi la cita solo nel testo

    const citta = (await amb.api().get('/api/poi?q=citt%C3%A0 romana')).body.map((p) => p.id)
    expect(citta).toContain('sass')
    expect((await amb.api().get('/api/poi?q=parolainesistente')).body).toEqual([])
  })

  it('filtra per area visibile della mappa (bbox)', async () => {
    const r = await amb.api().get('/api/poi?bbox=11.12,46.066,11.123,46.068')
    expect(r.body.map((p) => p.id)).toContain('duomo')
    expect(r.body.map((p) => p.id)).not.toContain('doss-trento')
  })

  it('apre la scheda con ricordi approvati, itinerari e luoghi vicini', async () => {
    const r = await amb.api().get('/api/poi/nettuno')
    expect(r.status).toBe(200)
    expect(r.body.fonti.length).toBeGreaterThan(0)
    expect(r.body.ricordi).toHaveLength(1) // quello in attesa non si vede
    expect(r.body.vicini).toHaveLength(3)
    expect(r.body.vicini[0].distanza).toBeLessThan(100)
    expect(r.body.itinerari.length).toBeGreaterThan(0)
  })

  it('risponde 404 per un POI inesistente', async () => {
    expect((await amb.api().get('/api/poi/inesistente')).status).toBe(404)
  })

  it('esporta i POI in GeoJSON (RNF-PO04)', async () => {
    const r = await amb.api().get('/api/esporta/poi.geojson')
    expect(r.headers['content-type']).toMatch(/geo\+json/)
    expect(r.body.type).toBe('FeatureCollection')
    expect(r.body.features[0].geometry.coordinates).toHaveLength(2)
    expect(r.body.features[0].properties).toHaveProperty('traduzioni')
  })

  it('mostra sulla mappa i luoghi di una tradizione (UC-10, passo 6)', async () => {
    const r = await amb.api().get('/api/poi?tradizione=feste-vigiliane')
    expect(r.body.map((p) => p.id).sort()).toEqual(['adige', 'duomo', 'piazza-fiera'])
  })
})

describe('lingua delle schede (RNF-U05)', () => {
  it('restituisce i testi tradotti con ?lingua=en e l\'italiano dove manca la traduzione', async () => {
    const it = (await amb.api().get('/api/poi/duomo')).body
    const en = (await amb.api().get('/api/poi/duomo?lingua=en')).body
    expect(en.nome).toBe('St Vigilius Cathedral')
    expect(en.sintesi).not.toBe(it.sintesi)
    expect(en.descrizione.join(' ')).not.toBe(it.descrizione.join(' '))
    expect(en.indirizzo).toBe(it.indirizzo) // gli indirizzi non si traducono
    // Lingua sconosciuta: italiano
    expect((await amb.api().get('/api/poi/duomo?lingua=xx')).body.nome).toBe(it.nome)
  })

  it('traduce elenco, itinerari, tradizioni e piatti', async () => {
    const elenco = (await amb.api().get('/api/poi?lingua=en')).body
    expect(elenco.find((p) => p.id === 'duomo').nome).toBe('St Vigilius Cathedral')
    const itinerari = (await amb.api().get('/api/itinerari?lingua=en')).body
    expect(itinerari.every((i) => i.titolo)).toBe(true)
    expect(itinerari.map((i) => i.titolo)).not.toEqual((await amb.api().get('/api/itinerari')).body.map((i) => i.titolo))
    const tradizioni = (await amb.api().get('/api/tradizioni?lingua=en')).body
    expect(tradizioni.find((t) => t.id === 'santa-lucia').nome).toBe('St Lucy’s Day')
    const { piatti } = (await amb.api().get('/api/gusto?lingua=en')).body
    expect(piatti.every((p) => p.descrizione)).toBe(true)
  })

  it('cerca anche nei testi tradotti', async () => {
    const r = (await amb.api().get('/api/poi?q=cathedral&lingua=en')).body.map((p) => p.id)
    expect(r).toContain('duomo')
  })
})

describe('itinerario su misura (RF-08)', () => {
  const chiedi = (q) => amb.api().get(`/api/itinerari/su-misura?${new URLSearchParams(q)}`)

  it('crea un itinerario che sta nel tempo indicato, partendo dalla posizione data', async () => {
    const r = await chiedi({ lat: 46.0670, lng: 11.1214, minuti: 60 })
    expect(r.status).toBe(200)
    expect(r.body.tappe.length).toBeGreaterThanOrEqual(2)
    expect(r.body.durata_minuti).toBeLessThanOrEqual(60)
    expect(r.body.partenza).toEqual([46.067, 11.1214])
    // Senza tema i locali restano fuori
    expect(r.body.tappe.every((t) => t.categoria !== 'gastronomia')).toBe(true)
    // Le tappe non si ripetono
    expect(new Set(r.body.tappe.map((t) => t.id)).size).toBe(r.body.tappe.length)
  })

  it('con più tempo propone più tappe e rispetta il tema', async () => {
    const breve = (await chiedi({ lat: 46.0670, lng: 11.1214, minuti: 30 })).body
    const lungo = (await chiedi({ lat: 46.0670, lng: 11.1214, minuti: 180 })).body
    expect(lungo.tappe.length).toBeGreaterThan(breve.tappe.length)
    const arte = (await chiedi({ lat: 46.0670, lng: 11.1214, minuti: 120, tema: 'arte' })).body
    expect(arte.tappe.every((t) => t.id)).toBe(true)
    const conTema = (await amb.api().get('/api/poi?tema=arte')).body.map((p) => p.id)
    expect(arte.tappe.every((t) => conTema.includes(t.id))).toBe(true)
  })

  it('spiega quando da lì, con quel tempo, non si riesce', async () => {
    const lontano = await chiedi({ lat: 45.4384, lng: 10.9916, minuti: 60 })
    expect(lontano.status).toBe(404)
    expect(lontano.body.errore).toBe('itinerario_impossibile')
    expect((await chiedi({ lat: 46.07, lng: 11.12, minuti: 5 })).status).toBe(400)
  })
})

describe('importazione dei dati (RNF-PO04: export e reimport)', () => {
  it('reimporta i luoghi esportati: aggiorna quelli esistenti e crea i nuovi', async () => {
    const esportati = (await amb.api().get('/api/esporta/poi.geojson')).body
    const duomo = esportati.features.find((f) => f.properties.id === 'duomo')
    duomo.properties.sintesi = 'Sintesi reimportata.'
    const nuovo = structuredClone(duomo)
    nuovo.properties.id = 'luogo-importato'
    nuovo.properties.nome = 'Luogo importato'
    nuovo.geometry.coordinates = [11.125, 46.07]
    esportati.features.push(nuovo)

    const r = await amb.api().post('/api/admin/importa/poi').set(admin).send(esportati)
    expect(r.status).toBe(200)
    expect(r.body).toEqual({ creati: 1, aggiornati: esportati.features.length - 1 })
    expect((await amb.api().get('/api/poi/duomo')).body.sintesi).toBe('Sintesi reimportata.')
    const importato = (await amb.api().get('/api/poi/luogo-importato')).body
    expect(importato.posizione).toEqual([46.07, 11.125])
    expect(importato.descrizione).toEqual(duomo.properties.descrizione)

    // Il file esportato di nuovo è identico a quello importato
    const di_nuovo = (await amb.api().get('/api/esporta/poi.geojson')).body
    const confronta = (f) => ({ ...f.properties, coordinate: f.geometry.coordinates })
    const ordina = (fc) => fc.features.map(confronta).sort((a, b) => a.id.localeCompare(b.id))
    expect(ordina(di_nuovo)).toEqual(ordina(esportati))
  })

  it('non salva niente se una voce non è valida', async () => {
    const esportati = (await amb.api().get('/api/esporta/poi.geojson')).body
    esportati.features[0].properties.sintesi = 'Non dovrebbe essere salvata.'
    esportati.features[1].properties.fonti = []
    const r = await amb.api().post('/api/admin/importa/poi').set(admin).send(esportati)
    expect(r.status).toBe(400)
    expect(r.body.messaggio).toContain(esportati.features[1].properties.id)
    const primo = (await amb.api().get(`/api/poi/${esportati.features[0].properties.id}`)).body
    expect(primo.sintesi).not.toBe('Non dovrebbe essere salvata.')
    expect((await amb.api().post('/api/admin/importa/poi').set(admin).send({ type: 'Feature' })).status).toBe(400)
  })

  it('reimporta gli itinerari con le tappe', async () => {
    const file = (await amb.api().get('/api/esporta/itinerari.json')).body
    const originale = file.itinerari.find((i) => i.id === 'tridentum-e-concilio')
    expect((await amb.api().delete('/api/admin/itinerari/tridentum-e-concilio').set(admin)).status).toBe(204)

    const r = await amb.api().post('/api/admin/importa/itinerari').set(admin).send(file)
    expect(r.status).toBe(200)
    expect(r.body.creati).toBe(1)
    expect(r.body.aggiornati).toBe(file.itinerari.length - 1)
    const ripristinato = (await amb.api().get('/api/itinerari/tridentum-e-concilio')).body
    expect(ripristinato.tappe.map((t) => t.id)).toEqual(originale.tappe)
    expect(ripristinato.titolo).toBe(originale.titolo)
  })
})

describe('itinerari, tradizioni e gusto (UC-02, UC-10)', () => {
  it('filtra gli itinerari per durata e restituisce le tappe in ordine', async () => {
    const brevi = (await amb.api().get('/api/itinerari?durata_max=60')).body
    expect(brevi.every((i) => i.durata_minuti <= 60)).toBe(true)
    const it1 = (await amb.api().get('/api/itinerari/affreschi-all-aperto')).body
    expect(it1.tappe[0].id).toBe('case-cazuffi-rella')
    expect(it1.tappe[0].posizione).toHaveLength(2)
  })

  it('elenca tradizioni con i luoghi e la mappa del gusto', async () => {
    const tradizioni = (await amb.api().get('/api/tradizioni')).body
    expect(tradizioni.find((t) => t.id === 'feste-vigiliane').luoghi.length).toBeGreaterThan(0)
    const gusto = (await amb.api().get('/api/gusto')).body
    expect(gusto.piatti.length).toBeGreaterThan(0)
    expect(gusto.locali.every((l) => l.categoria === 'gastronomia')).toBe(true)
  })
})

describe('gestione dei POI (UC-07)', () => {
  const nuovo = {
    nome: 'Fontana di prova',
    categoria: 'arte',
    temi: ['principi-vescovi'],
    posizione: [46.0675, 11.1205],
    sintesi: 'Una fontana inventata per il test.',
    descrizione: ['Primo paragrafo.'],
    fonti: [{ titolo: 'Fonte di prova', url: 'https://esempio.test' }],
  }

  it('è riservata agli amministratori (RNF-S03)', async () => {
    const mod = await accedi(amb.app, ACCOUNT.moderatore)
    expect((await amb.api().post('/api/admin/poi').set(mod).send(nuovo)).status).toBe(403)
    expect((await amb.api().post('/api/admin/poi').send(nuovo)).status).toBe(401)
  })

  it('non salva senza nome, posizione o fonti (E1)', async () => {
    const r = await amb.api().post('/api/admin/poi').set(admin).send({ ...nuovo, nome: '', posizione: null, fonti: [] })
    expect(r.status).toBe(400)
    expect(Object.keys(r.body.campi)).toEqual(expect.arrayContaining(['nome', 'posizione', 'fonti']))
  })

  it('crea il POI, che compare subito sulla mappa', async () => {
    const r = await amb.api().post('/api/admin/poi').set(admin).send(nuovo)
    expect(r.status).toBe(201)
    expect(r.body.id).toBe('fontana-di-prova')
    expect((await amb.api().get('/api/poi/fontana-di-prova')).body.nome).toBe('Fontana di prova')
  })

  it('chiede conferma per un omonimo a meno di 20 m (E2)', async () => {
    const vicino = { ...nuovo, posizione: [46.06755, 11.1205] }
    const r = await amb.api().post('/api/admin/poi').set(admin).send(vicino)
    expect(r.status).toBe(409)
    expect(r.body.esistente.id).toBe('fontana-di-prova')

    const confermato = await amb.api().post('/api/admin/poi?conferma=1').set(admin).send(vicino)
    expect(confermato.status).toBe(201)
    expect(confermato.body.id).toBe('fontana-di-prova-2')
  })

  it('modifica un POI', async () => {
    const r = await amb.api().put('/api/admin/poi/fontana-di-prova').set(admin).send({ ...nuovo, sintesi: 'Sintesi aggiornata.', posizione: [46.069, 11.121] })
    expect(r.status).toBe(200)
    expect((await amb.api().get('/api/poi/fontana-di-prova')).body.sintesi).toBe('Sintesi aggiornata.')
  })

  it('avvisa prima di eliminare una tappa di un itinerario (1b) e il visitatore vede che la tappa è saltata (UC-02 E1)', async () => {
    const r = await amb.api().delete('/api/admin/poi/nettuno').set(admin)
    expect(r.status).toBe(409)
    expect(r.body.itinerari.length).toBeGreaterThan(0)
    const { nome } = (await amb.api().get('/api/poi/nettuno')).body
    const prima = (await amb.api().get('/api/itinerari/affreschi-all-aperto')).body
    const posto = prima.tappe.findIndex((t) => t.id === 'nettuno') + 1

    expect((await amb.api().delete('/api/admin/poi/nettuno?conferma=1').set(admin)).status).toBe(204)
    expect((await amb.api().get('/api/poi/nettuno')).status).toBe(404)
    const it1 = (await amb.api().get('/api/itinerari/affreschi-all-aperto')).body
    expect(it1.tappe.map((t) => t.id)).not.toContain('nettuno')
    expect(it1.tappe).toHaveLength(prima.tappe.length - 1)
    expect(it1.tappe_rimosse).toEqual([{ ordine: posto, nome }])
    // L'esportazione contiene solo le tappe che esistono ancora
    const esportato = (await amb.api().get('/api/esporta/itinerari.json')).body.itinerari.find((i) => i.id === 'affreschi-all-aperto')
    expect(esportato.tappe).toEqual(it1.tappe.map((t) => t.id))
  })

  it('crea, modifica ed elimina itinerari e tradizioni (RF-24)', async () => {
    const itinerario = { titolo: 'Giro di prova', tema: 'arte', durata_minuti: 30, tappe: ['duomo', 'fontana-di-prova'] }
    const creato = await amb.api().post('/api/admin/itinerari').set(admin).send(itinerario)
    expect(creato.status).toBe(201)
    const sbagliato = await amb.api().put(`/api/admin/itinerari/${creato.body.id}`).set(admin).send({ ...itinerario, tappe: ['duomo', 'inesistente'] })
    expect(sbagliato.status).toBe(400)
    expect((await amb.api().delete(`/api/admin/itinerari/${creato.body.id}`).set(admin)).status).toBe(204)

    const tradizione = { nome: 'Festa di prova', periodo: 'Luglio', mesi: [7], luoghi: ['duomo', 'duomo'] }
    const t = await amb.api().post('/api/admin/tradizioni').set(admin).send(tradizione)
    expect(t.status).toBe(201)
    const lista = (await amb.api().get('/api/tradizioni')).body
    expect(lista.find((x) => x.id === t.body.id).luoghi).toEqual([
      { id: 'duomo', nome: 'Cattedrale di San Vigilio', categoria: 'storia', posizione: [46.0667, 11.1214] },
    ])
  })
})

describe('foto ufficiali dei luoghi', () => {
  const immagine = () =>
    sharp({ create: { width: 1200, height: 900, channels: 3, background: { r: 168, g: 57, b: 31 } } }).jpeg().toBuffer()

  const carica = async (auth, campi) => {
    let r = amb.api().post('/api/admin/poi/duomo/foto').set(auth)
    for (const [k, v] of Object.entries(campi)) r = r.field(k, v)
    return r.attach('foto', await immagine(), { filename: 'duomo.jpg', contentType: 'image/jpeg' })
  }

  it('richiedono autore e licenza', async () => {
    const r = await carica(admin, { autore: '', licenza: '' })
    expect(r.status).toBe(400)
    expect(Object.keys(r.body.campi)).toEqual(expect.arrayContaining(['autore', 'licenza']))
  })

  it('sono riservate agli amministratori (RNF-S03)', async () => {
    const mod = await accedi(amb.app, ACCOUNT.moderatore)
    expect((await carica(mod, { autore: 'X', licenza: 'CC BY 4.0' })).status).toBe(403)
  })

  it('compaiono nella scheda con i crediti e fanno da copertina', async () => {
    const r = await carica(admin, {
      autore: 'Mario Rossi',
      licenza: 'CC BY-SA 4.0',
      url_licenza: 'https://creativecommons.org/licenses/by-sa/4.0/',
      fonte: 'https://commons.wikimedia.org/wiki/File:Esempio.jpg',
      didascalia: 'La facciata del Duomo',
    })
    expect(r.status).toBe(201)

    const scheda = (await amb.api().get('/api/poi/duomo')).body
    expect(scheda.foto).toEqual([
      expect.objectContaining({ id: r.body.id, autore: 'Mario Rossi', licenza: 'CC BY-SA 4.0', didascalia: 'La facciata del Duomo', larghezza: 1200 }),
    ])
    expect(scheda.copertina).toBe(r.body.id)
    expect((await amb.api().get(`/api/foto/${r.body.id}`)).status).toBe(200)
    expect((await amb.api().get('/api/admin/poi').set(admin)).body.find((p) => p.id === 'duomo').foto).toBe(1)
  })

  it('si eliminano insieme al file', async () => {
    const [{ id }] = (await amb.api().get('/api/poi/duomo')).body.foto
    expect((await amb.api().delete(`/api/admin/poi/duomo/foto/${id}`).set(admin)).status).toBe(204)
    expect((await amb.api().get('/api/poi/duomo')).body.foto).toEqual([])
    await expect(amb.archivio.leggi('pubblica', id, 'mini')).rejects.toThrow()
  })
})

describe('pacchetti di dati', () => {
  it('ogni pacchetto si carica una volta sola', async () => {
    const prima = (await amb.db.query('SELECT count(*)::int AS n FROM poi'))[0].n
    await popola(amb.db, { datiDimostrativi: false, archivio: amb.archivio })
    expect((await amb.db.query('SELECT count(*)::int AS n FROM poi'))[0].n).toBe(prima)
  })

  it('un database creato prima dei pacchetti non ricarica i luoghi iniziali', async () => {
    await amb.db.query('DELETE FROM pacchetti_dati')
    await popola(amb.db, { datiDimostrativi: false, archivio: amb.archivio })
    const nomi = (await amb.db.query('SELECT nome FROM pacchetti_dati ORDER BY nome')).map((r) => r.nome)
    expect(nomi[0]).toBe('001-luoghi-iniziali')
    // Il POI eliminato nei test precedenti non è tornato
    expect((await amb.api().get('/api/poi/nettuno')).status).toBe(404)
  })
})
