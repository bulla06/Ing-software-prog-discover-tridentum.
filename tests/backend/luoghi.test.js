// UC-01, UC-02, UC-10 (consultazione) · UC-07 Gestire i POI
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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

  it('avvisa prima di eliminare una tappa di un itinerario (1b)', async () => {
    const r = await amb.api().delete('/api/admin/poi/nettuno').set(admin)
    expect(r.status).toBe(409)
    expect(r.body.itinerari.length).toBeGreaterThan(0)

    expect((await amb.api().delete('/api/admin/poi/nettuno?conferma=1').set(admin)).status).toBe(204)
    expect((await amb.api().get('/api/poi/nettuno')).status).toBe(404)
    const it1 = (await amb.api().get('/api/itinerari/affreschi-all-aperto')).body
    expect(it1.tappe.map((t) => t.id)).not.toContain('nettuno')
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
    expect(lista.find((x) => x.id === t.body.id).luoghi).toEqual([{ id: 'duomo', nome: 'Cattedrale di San Vigilio' }])
  })
})
