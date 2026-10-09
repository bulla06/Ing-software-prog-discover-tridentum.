// UC-04 Caricare un ricordo · UC-05 Moderare un contenuto · RF-18 Segnalazioni
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ACCOUNT, accedi, creaAmbiente } from './ambiente.js'

let amb
let utente
let moderatore
beforeAll(async () => {
  amb = await creaAmbiente()
  utente = await accedi(amb.app, ACCOUNT.utente)
  moderatore = await accedi(amb.app, ACCOUNT.moderatore)
})
afterAll(() => amb.chiudi())

/** Foto JPEG 2400×1800 con dati EXIF personali (autore, dispositivo) */
const fotoConExif = () =>
  sharp({ create: { width: 2400, height: 1800, channels: 3, background: { r: 140, g: 47, b: 27 } } })
    .jpeg({ quality: 95 })
    .withExif({ IFD0: { Artist: 'Franco Rossi', Make: 'Telefono di Franco' } })
    .toBuffer()

async function carica(poi, campi, foto) {
  let richiesta = amb.api().post(`/api/poi/${poi}/contenuti`).set(utente)
  for (const [k, v] of Object.entries(campi)) richiesta = richiesta.field(k, v)
  if (foto) richiesta = richiesta.attach('foto', foto, { filename: 'foto.jpg', contentType: 'image/jpeg' })
  return richiesta
}

const codaModerazione = async () => (await amb.api().get('/api/moderazione/coda').set(moderatore)).body

describe('caricare un ricordo (UC-04)', () => {
  it('richiede l\'accesso (1a)', async () => {
    const r = await amb.api().post('/api/poi/duomo/contenuti').field('testo', 'Ciao').field('licenza', 'cc-by')
    expect(r.status).toBe(401)
  })

  it('non accetta un ricordo senza foto né testo (E2)', async () => {
    const r = await carica('duomo', { testo: '   ', licenza: 'cc-by' })
    expect(r.status).toBe(400)
    expect(r.body.campi.testo).toBeTruthy()
  })

  it('rifiuta un file che non è un\'immagine (E1)', async () => {
    const r = await amb.api().post('/api/poi/duomo/contenuti').set(utente)
      .field('licenza', 'cc-by')
      .attach('foto', Buffer.from('non sono una foto'), { filename: 'finta.jpg', contentType: 'image/jpeg' })
    expect(r.status).toBe(400)
    expect(r.body.errore).toBe('foto_non_valida')
  })

  it('accetta solo il testo (3a) e lo mette in attesa, non pubblico (RF-16)', async () => {
    const r = await carica('duomo', { testo: 'Mia nonna si è sposata qui nel 1952.', anno: '1952', licenza: 'cc-by' })
    expect(r.status).toBe(201)
    expect(r.body.stato).toBe('in_attesa')
    expect((await amb.api().get('/api/poi/duomo')).body.ricordi).toHaveLength(0)
  })

  it('riduce la foto sotto i 500 KB e rimuove l\'EXIF (RNF-P03, RNF-S05)', async () => {
    const r = await carica('sass', { testo: 'Gli scavi negli anni Novanta', anno: 'anni \'90', licenza: 'cc-by-nc', consenso_gioco: 'true' }, await fotoConExif())
    expect(r.status).toBe(201)

    const [{ foto }] = await amb.db.query('SELECT foto FROM contenuti WHERE id = $1', [r.body.id])
    const salvata = await amb.archivio.leggi('privata', foto, 'standard')
    const info = await sharp(salvata).metadata()
    expect(salvata.length).toBeLessThan(500 * 1024)
    expect(info.format).toBe('webp')
    expect(Math.max(info.width, info.height)).toBe(1600)
    expect(info.exif).toBeUndefined()
  })

  it('tiene privata la foto in attesa: la vede l\'autore, non gli altri', async () => {
    const [{ foto }] = await amb.db.query('SELECT foto FROM contenuti WHERE foto IS NOT NULL')
    expect((await amb.api().get(`/api/foto/${foto}`)).status).toBe(401)
    expect((await amb.api().get(`/api/foto/${foto}?formato=mini`).set(utente)).status).toBe(200)
    expect((await amb.api().get(`/api/foto/${foto}`).set(moderatore)).status).toBe(200)
  })
})

describe('moderazione (UC-05)', () => {
  it('è negata a chi non è moderatore (E2)', async () => {
    expect((await amb.api().get('/api/moderazione/coda').set(utente)).status).toBe(403)
  })

  it('mostra i contenuti in attesa dal più vecchio', async () => {
    const { contenuti } = await codaModerazione()
    expect(contenuti.length).toBe(3)
    const date = contenuti.map((c) => new Date(c.creato_il).getTime())
    expect(date).toEqual([...date].sort((a, b) => a - b))
    expect(contenuti[0].poi.nome).toBeTruthy()
  })

  it('chiede la motivazione per rifiutare (6a)', async () => {
    const [primo] = (await codaModerazione()).contenuti
    const r = await amb.api().post(`/api/moderazione/contenuti/${primo.id}/decisione`).set(moderatore).send({ esito: 'rifiuta' })
    expect(r.status).toBe(400)
    expect(r.body.campi.motivazione).toBeTruthy()
  })

  it('rifiuta con motivazione, visibile all\'autore nel profilo', async () => {
    const [primo] = (await codaModerazione()).contenuti
    const r = await amb.api().post(`/api/moderazione/contenuti/${primo.id}/decisione`).set(moderatore)
      .send({ esito: 'rifiuta', motivazione: 'Il testo non riguarda questo luogo.' })
    expect(r.status).toBe(200)
    const profilo = (await amb.api().get('/api/me').set(utente)).body
    const rifiutato = profilo.contributi.find((c) => c.id === primo.id)
    expect(rifiutato).toMatchObject({ stato: 'rifiutato', motivazione: 'Il testo non riguarda questo luogo.' })
    expect(amb.posta.postaDiProva()[0].oggetto).toMatch(/non è stato pubblicato/)
  })

  it('pubblica il ricordo approvato con la foto nell\'area pubblica', async () => {
    const conFoto = (await codaModerazione()).contenuti.find((c) => c.foto)
    const r = await amb.api().post(`/api/moderazione/contenuti/${conFoto.id}/decisione`).set(moderatore).send({ esito: 'approva' })
    expect(r.status).toBe(200)

    const scheda = (await amb.api().get('/api/poi/sass')).body
    expect(scheda.ricordi).toHaveLength(1)
    expect(scheda.ricordi[0]).toMatchObject({ autore: 'Utente di prova', licenza: 'cc-by-nc', larghezza: 1600 })
    expect(scheda.copertina).toBe(conFoto.foto)
    expect((await amb.api().get(`/api/foto/${conFoto.foto}`)).status).toBe(200) // ora pubblica
  })

  it('applica solo la prima decisione se due moderatori decidono insieme (E1)', async () => {
    const [ultimo] = (await codaModerazione()).contenuti
    const admin = await accedi(amb.app, ACCOUNT.amministratore)
    const [a, b] = await Promise.all([
      amb.api().post(`/api/moderazione/contenuti/${ultimo.id}/decisione`).set(moderatore).send({ esito: 'approva' }),
      amb.api().post(`/api/moderazione/contenuti/${ultimo.id}/decisione`).set(admin).send({ esito: 'rifiuta', motivazione: 'Doppione di un altro ricordo.' }),
    ])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    expect((await codaModerazione()).contenuti).toHaveLength(0)
  })

  it('usa le foto approvate con consenso come livelli del gioco (RF-23)', async () => {
    const [livello] = await amb.db.query(
      `SELECT count(*)::int AS n FROM contenuti WHERE stato = 'approvato' AND consenso_gioco AND foto IS NOT NULL`,
    )
    expect(livello.n).toBe(1)
  })
})

describe('segnalazioni (RF-18)', () => {
  it('chiunque può segnalare un ricordo pubblicato o un errore nella scheda', async () => {
    const [ricordo] = (await amb.api().get('/api/poi/sass')).body.ricordi
    const r = await amb.api().post(`/api/contenuti/${ricordo.id}/segnalazioni`).send({ motivo: 'inappropriato', nota: 'Non è il SASS' })
    expect(r.status).toBe(201)
    expect((await amb.api().post('/api/poi/duomo/segnalazioni').send({ motivo: 'errato', nota: 'Data sbagliata' })).status).toBe(201)
    expect((await amb.api().post('/api/poi/duomo/segnalazioni').send({ motivo: 'boh' })).status).toBe(400)

    const { segnalazioni } = await codaModerazione()
    expect(segnalazioni).toHaveLength(2)
  })

  it('il moderatore rimuove il ricordo segnalato (1a)', async () => {
    const { segnalazioni } = await codaModerazione()
    const suRicordo = segnalazioni.find((s) => s.contenuto)
    const r = await amb.api().post(`/api/moderazione/segnalazioni/${suRicordo.id}/decisione`).set(moderatore).send({ esito: 'rimuovi' })
    expect(r.status).toBe(200)

    const scheda = (await amb.api().get('/api/poi/sass')).body
    expect(scheda.ricordi).toHaveLength(0)
    expect((await amb.api().get(`/api/foto/${suRicordo.contenuto.foto}`)).status).toBe(401) // di nuovo privata
    expect((await codaModerazione()).segnalazioni).toHaveLength(1)
  })
})

describe('eliminazione dell\'account con i contributi (RF-13)', () => {
  it('con «rimuovi» cancella anche i ricordi e i file delle foto', async () => {
    const [{ foto }] = await amb.db.query('SELECT foto FROM contenuti WHERE foto IS NOT NULL')
    const r = await amb.api().delete('/api/me').set(utente).send({ password: ACCOUNT.utente.password, contributi: 'rimuovi' })
    expect(r.status).toBe(204)
    const [{ n }] = await amb.db.query('SELECT count(*)::int AS n FROM contenuti WHERE autore IS NULL AND foto IS NOT NULL')
    expect(n).toBe(0)
    expect(await amb.db.query('SELECT 1 FROM foto WHERE id = $1', [foto])).toHaveLength(0)
    await expect(amb.archivio.leggi('privata', foto, 'standard')).rejects.toThrow()
  })
})
