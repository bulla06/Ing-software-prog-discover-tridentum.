// Modulo "POI, itinerari e tradizioni" (Fase 3 §5.3): UC-01, UC-02, UC-07, UC-10 ·
// RF-01…RF-05, RF-07, RF-08, RF-19, RF-20, RF-24 · RNF-V01, RNF-PO04, RNF-U05.

import express, { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { richiediRuolo } from '../../gateway/autenticazione.js'
import { ErroreHttp, nonTrovato, valida } from '../../gateway/errori.js'
import { preparaFoto } from '../../servizi/immagini.js'
import { linguaRichiesta, testi, testo } from '../lingua.js'
import { creaItinerarioSuMisura } from './su-misura.js'

const CATEGORIE = ['storia', 'arte', 'tradizioni', 'gastronomia']
const NUMERO_VICINI = 3
const RAGGIO_DUPLICATI_M = 20

// Colonne comuni dei POI, nella lingua richiesta, con la posizione come latitudine e longitudine
const colonnePoi = (lingua) => `p.id, ${testo(lingua, 'p', 'nome')} AS nome, p.categoria, p.temi, p.indirizzo,
  ${testo(lingua, 'p', 'epoca')} AS epoca, ${testo(lingua, 'p', 'sintesi')} AS sintesi,
  ${testo(lingua, 'p', 'piatto_consigliato')} AS piatto_consigliato,
  ST_Y(p.posizione::geometry) AS lat, ST_X(p.posizione::geometry) AS lng`

// Copertina: la prima foto del luogo curata dal team, altrimenti la prima pubblicata dalla community
const COPERTINA = `coalesce(
  (SELECT fp.foto FROM foto_poi fp WHERE fp.poi = p.id ORDER BY fp.ordine, fp.foto LIMIT 1),
  (SELECT c.foto FROM contenuti c WHERE c.poi = p.id AND c.stato = 'approvato' AND c.foto IS NOT NULL
    ORDER BY c.moderato_il LIMIT 1)
) AS copertina`

// Foto dei luoghi caricate dagli amministratori: stessi limiti dei ricordi (RNF-S05)
const caricamento = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 10 } })

// Le importazioni (RNF-PO04) possono superare il limite di 200 kB delle altre richieste
const corpoGrande = express.json({ limit: '10mb' })

const schemaCreditiFoto = z.object({
  autore: z.string().trim().min(1, 'Indica l\'autore della foto').max(200),
  licenza: z.string().trim().min(1, 'Indica la licenza della foto').max(100),
  url_licenza: z.union([z.literal(''), z.url({ protocol: /^https?$/ })]).default('').transform((v) => v || null),
  fonte: z.union([z.literal(''), z.url({ protocol: /^https?$/, error: 'Indirizzo della fonte non valido' })]).default('').transform((v) => v || null),
  didascalia: z.string().trim().max(300).default(''),
})

// Ricerca senza distinguere maiuscole e lettere accentate ("Città" = "citta")
const normalizzaSql = (espressione) => `translate(lower(${espressione}), 'àáâäèéêëìíîïòóôöùúûü', 'aaaaeeeeiiiioooouuuu')`

export const normalizza = (testo) =>
  testo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

function rigaPoi(r) {
  const { lat, lng, ...resto } = r
  return { ...resto, posizione: [lat, lng] }
}

const slug = (testo) =>
  normalizza(testo)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'voce'

// ---------- Schemi per l'amministrazione ----------

const testoBreve = (massimo) => z.string().trim().max(massimo, `Massimo ${massimo} caratteri`)
const idSlug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Identificatore non valido')

/**
 * Traduzioni facoltative di una voce (RNF-U05): { en: { campo: testo } }.
 * I campi vuoti si tolgono, così nel sito compare il testo italiano. Se la richiesta non ha il campo
 * "traduzioni" (per esempio dai pannelli delle versioni precedenti) restano quelle già salvate.
 */
function schemaTraduzioni(campi) {
  const voce = z.object(campi).partial().transform((t) =>
    Object.fromEntries(Object.entries(t).filter(([, v]) => (Array.isArray(v) ? v.length > 0 : Boolean(v)))),
  )
  return z
    .object({ en: voce.optional() })
    .optional()
    .transform((t) => (t === undefined ? undefined : t.en && Object.keys(t.en).length ? { en: t.en } : {}))
}

/** Valore SQL delle traduzioni: null vuol dire "lascia quelle che ci sono" (vedi coalesce nelle query) */
const traduzioniSql = (t) => (t === undefined ? null : JSON.stringify(t))

const paragrafi = z.array(z.string().trim().min(1).max(3000)).max(20)

const schemaPoi = z.object({
  nome: z.string().trim().min(2, 'Il nome è obbligatorio').max(120),
  categoria: z.enum(CATEGORIE, { error: 'Scegli una categoria' }),
  temi: z.array(idSlug).max(10).default([]),
  posizione: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)], {
    error: 'Fissa la posizione sulla mappa',
  }),
  indirizzo: testoBreve(200).default(''),
  epoca: testoBreve(100).default(''),
  sintesi: z.string().trim().min(1, 'La sintesi è obbligatoria').max(300),
  descrizione: z.array(z.string().trim().min(1).max(3000)).max(20).default([]),
  affresco_autore: testoBreve(200).nullish().transform((v) => v || null),
  affresco_epoca: testoBreve(100).nullish().transform((v) => v || null),
  piatto_consigliato: testoBreve(200).nullish().transform((v) => v || null),
  parole_chiave: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  fonti: z
    .array(z.object({ titolo: z.string().trim().min(1, 'Titolo della fonte obbligatorio').max(200), url: z.url({ protocol: /^https?$/, error: 'Indirizzo della fonte non valido' }) }))
    .min(1, 'Serve almeno una fonte'),
  traduzioni: schemaTraduzioni({
    nome: testoBreve(120),
    sintesi: testoBreve(300),
    descrizione: paragrafi,
    epoca: testoBreve(100),
    affresco_autore: testoBreve(200),
    affresco_epoca: testoBreve(100),
    piatto_consigliato: testoBreve(200),
  }),
})

const schemaItinerario = z.object({
  titolo: z.string().trim().min(2, 'Il titolo è obbligatorio').max(120),
  tema: idSlug,
  durata_minuti: z.coerce.number().int().min(10, 'Durata minima 10 minuti').max(24 * 60),
  descrizione: testoBreve(1000).default(''),
  tappe: z.array(idSlug).min(2, 'Servono almeno due tappe').max(30),
  traduzioni: schemaTraduzioni({ titolo: testoBreve(120), descrizione: testoBreve(1000) }),
})

const schemaTradizione = z.object({
  nome: z.string().trim().min(2, 'Il nome è obbligatorio').max(120),
  periodo: z.string().trim().min(1, 'Indica il periodo').max(100),
  mesi: z.array(z.number().int().min(1).max(12)).max(12).default([]),
  descrizione: testoBreve(2000).default(''),
  luoghi: z.array(idSlug).max(20).default([]),
  traduzioni: schemaTraduzioni({ nome: testoBreve(120), periodo: testoBreve(100), descrizione: testoBreve(2000) }),
})

// Importazione (RNF-PO04): gli stessi formati dell'esportazione
const schemaImportaPoi = z.object({
  type: z.literal('FeatureCollection', { error: 'Serve un file GeoJSON (FeatureCollection)' }),
  features: z
    .array(
      z.object({
        type: z.literal('Feature'),
        geometry: z.object({ type: z.literal('Point'), coordinates: z.tuple([z.number(), z.number()]) }),
        properties: z.object({ id: idSlug }).loose(),
      }),
    )
    .max(5000),
})
const schemaImportaItinerari = z.object({
  itinerari: z.array(z.object({ id: idSlug }).loose()).max(1000),
})

export function rotteLuoghi({ db, archivio }) {
  const router = Router()
  const soloAmministratori = richiediRuolo(db, 'amministratore')

  // ---------- Consultazione pubblica ----------

  /** GET /api/poi?categoria=…&tema=…&tradizione=…&q=…&bbox=minLng,minLat,maxLng,maxLat&lingua=… */
  router.get('/poi', async (req, res) => {
    const lingua = linguaRichiesta(req)
    const filtri = valida(
      z.object({
        categoria: z.enum(CATEGORIE).optional(),
        tema: idSlug.optional(),
        tradizione: idSlug.optional(),
        q: z.string().max(100).optional(),
        bbox: z
          .string()
          .regex(/^-?[\d.]+(,-?[\d.]+){3}$/, 'bbox non valido')
          .transform((s) => s.split(',').map(Number))
          .optional(),
      }),
      req.query,
    )

    const condizioni = []
    const parametri = []
    const aggiungi = (sql, valore) => {
      parametri.push(valore)
      condizioni.push(sql.replace('?', `$${parametri.length}`))
    }
    if (filtri.categoria) aggiungi('p.categoria = ?', filtri.categoria)
    if (filtri.tema) aggiungi('? = ANY(p.temi)', filtri.tema)
    // I luoghi collegati a una tradizione, da mostrare sulla mappa (UC-10, passo 6)
    if (filtri.tradizione) aggiungi('p.id IN (SELECT poi FROM tradizioni_poi WHERE tradizione = ?)', filtri.tradizione)
    if (filtri.bbox) {
      parametri.push(...filtri.bbox)
      const n = parametri.length
      condizioni.push(`ST_Intersects(p.posizione, ST_MakeEnvelope($${n - 3}, $${n - 2}, $${n - 1}, $${n}, 4326)::geography)`)
    }

    // Ricerca: ogni parola deve comparire nel testo (in italiano o tradotto); prima chi le ha nel nome (RF-05)
    const parole = normalizza(filtri.q ?? '').split(/\s+/).filter(Boolean).slice(0, 8)
    const tradotti = `coalesce(p.traduzioni->'en'->>'nome', '') || ' ' || coalesce(p.traduzioni->'en'->>'sintesi', '') || ' ' ||
      coalesce((SELECT string_agg(x, ' ') FROM jsonb_array_elements_text(p.traduzioni->'en'->'descrizione') AS x), '')`
    const testoRicerca = normalizzaSql(
      `p.nome || ' ' || p.sintesi || ' ' || p.indirizzo || ' ' || array_to_string(p.parole_chiave, ' ') || ' ' || array_to_string(p.descrizione, ' ') || ' ' || ${tradotti}`,
    )
    const nome = testo(lingua, 'p', 'nome')
    let ordine = nome
    if (parole.length) {
      parametri.push(parole)
      const n = parametri.length
      condizioni.push(`(SELECT bool_and(${testoRicerca} LIKE '%' || parola || '%') FROM unnest($${n}::text[]) AS parola)`)
      ordine = `(SELECT count(*) FROM unnest($${n}::text[]) AS parola WHERE ${normalizzaSql(nome)} LIKE '%' || parola || '%') DESC, ${nome}`
    }

    const righe = await db.query(
      `SELECT ${colonnePoi(lingua)}, ${COPERTINA}
         FROM poi p
        ${condizioni.length ? `WHERE ${condizioni.join(' AND ')}` : ''}
        ORDER BY ${ordine}`,
      parametri,
    )
    res.json(righe.map(rigaPoi))
  })

  /**
   * Esportazione aperta di tutti i POI (RNF-PO04), in GeoJSON. Contiene tutti i campi, traduzioni
   * comprese: lo stesso file si può reimportare dal pannello di amministrazione.
   */
  router.get('/esporta/poi.geojson', async (req, res) => {
    const righe = await db.query(
      `SELECT ${colonnePoi('it')}, p.descrizione, p.affresco_autore, p.affresco_epoca, p.parole_chiave, p.fonti, p.traduzioni
         FROM poi p ORDER BY p.id`,
    )
    res.set('Content-Disposition', 'attachment; filename="discover-tridentum-luoghi.geojson"')
    res.type('application/geo+json').json({
      type: 'FeatureCollection',
      features: righe.map(({ lat, lng, ...proprieta }) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: proprieta,
      })),
    })
  })

  /** Esportazione degli itinerari con le tappe (RNF-PO04), reimportabile */
  router.get('/esporta/itinerari.json', async (req, res) => {
    const itinerari = await db.query(
      `SELECT i.id, i.titolo, i.tema, i.durata_minuti, i.descrizione, i.traduzioni,
              coalesce((SELECT json_agg(t.poi ORDER BY t.ordine) FROM tappe t WHERE t.itinerario = i.id AND t.poi IS NOT NULL), '[]') AS tappe
         FROM itinerari i ORDER BY i.id`,
    )
    res.set('Content-Disposition', 'attachment; filename="discover-tridentum-itinerari.json"')
    res.json({ formato: 'discover-tridentum/itinerari', versione: 1, itinerari })
  })

  /** GET /api/poi/:id — scheda completa con ricordi approvati, itinerari, tradizioni e luoghi vicini */
  router.get('/poi/:id', async (req, res) => {
    const lingua = linguaRichiesta(req)
    const [riga] = await db.query(
      `SELECT ${colonnePoi(lingua)}, ${COPERTINA}, ${testi(lingua, 'p', 'descrizione')} AS descrizione,
              ${testo(lingua, 'p', 'affresco_autore')} AS affresco_autore, ${testo(lingua, 'p', 'affresco_epoca')} AS affresco_epoca,
              p.parole_chiave, p.fonti
         FROM poi p WHERE p.id = $1`,
      [req.params.id],
    )
    if (!riga) throw nonTrovato('Luogo')

    const [foto, ricordi, itinerari, tradizioni, vicini] = await Promise.all([
      db.query(
        `SELECT fp.foto AS id, f.larghezza, f.altezza, fp.didascalia, fp.autore, fp.licenza, fp.url_licenza, fp.fonte
           FROM foto_poi fp JOIN foto f ON f.id = fp.foto
          WHERE fp.poi = $1 ORDER BY fp.ordine, fp.foto`,
        [riga.id],
      ),
      db.query(
        `SELECT c.id, c.testo, c.anno, c.licenza, c.foto, f.larghezza, f.altezza, c.moderato_il AS pubblicato_il,
                u.nome_visualizzato AS autore
           FROM contenuti c
           LEFT JOIN utenti u ON u.id = c.autore
           LEFT JOIN foto f ON f.id = c.foto
          WHERE c.poi = $1 AND c.stato = 'approvato'
          ORDER BY c.moderato_il DESC`,
        [riga.id],
      ),
      db.query(
        `SELECT DISTINCT i.id, ${testo(lingua, 'i', 'titolo')} AS titolo, i.durata_minuti
           FROM itinerari i JOIN tappe t ON t.itinerario = i.id
          WHERE t.poi = $1 ORDER BY i.durata_minuti`,
        [riga.id],
      ),
      db.query(
        `SELECT t.id, ${testo(lingua, 't', 'nome')} AS nome, ${testo(lingua, 't', 'periodo')} AS periodo
           FROM tradizioni t JOIN tradizioni_poi tp ON tp.tradizione = t.id
          WHERE tp.poi = $1 ORDER BY nome`,
        [riga.id],
      ),
      db.query(
        `SELECT ${colonnePoi(lingua)}, ${COPERTINA},
                ST_Distance(p.posizione, (SELECT posizione FROM poi WHERE id = $1)) AS distanza
           FROM poi p WHERE p.id <> $1
          ORDER BY p.posizione <-> (SELECT posizione FROM poi WHERE id = $1)
          LIMIT ${NUMERO_VICINI}`,
        [riga.id],
      ),
    ])

    const { affresco_autore, affresco_epoca, ...poi } = rigaPoi(riga)
    res.json({
      ...poi,
      affresco: affresco_autore || affresco_epoca ? { autore: affresco_autore, epoca: affresco_epoca } : null,
      foto,
      ricordi,
      itinerari,
      tradizioni,
      vicini: vicini.map(rigaPoi),
    })
  })

  /**
   * Itinerari con le tappe nell'ordine. Le tappe il cui luogo è stato eliminato non sono tra le
   * tappe ma in "tappe_rimosse", con il nome che il luogo aveva: il sito le salta e lo dice (UC-02 E1).
   * Con "originale" i testi sono quelli italiani e ci sono le traduzioni (pannello di amministrazione).
   */
  async function leggiItinerari(lingua, condizione = '', parametri = [], { originale = false } = {}) {
    const righe = await db.query(
      `SELECT i.id, ${testo(lingua, 'i', 'titolo')} AS titolo, i.tema, i.durata_minuti,
              ${testo(lingua, 'i', 'descrizione')} AS descrizione, ${originale ? 'i.traduzioni,' : ''}
              coalesce(json_agg(json_build_object(
                'id', p.id, 'nome', ${testo(lingua, 'p', 'nome')}, 'categoria', p.categoria, 'sintesi', ${testo(lingua, 'p', 'sintesi')},
                'posizione', json_build_array(ST_Y(p.posizione::geometry), ST_X(p.posizione::geometry))
              ) ORDER BY t.ordine) FILTER (WHERE p.id IS NOT NULL), '[]') AS tappe,
              coalesce(json_agg(json_build_object('ordine', t.ordine, 'nome', t.luogo_rimosso) ORDER BY t.ordine)
                FILTER (WHERE t.poi IS NULL AND t.luogo_rimosso IS NOT NULL), '[]') AS tappe_rimosse
         FROM itinerari i
         LEFT JOIN tappe t ON t.itinerario = i.id
         LEFT JOIN poi p ON p.id = t.poi
        ${condizione}
        GROUP BY i.id
        ORDER BY i.durata_minuti, titolo`,
      parametri,
    )
    return righe
  }

  /** GET /api/itinerari?durata_max=… (RF-07, filtro "ho … ore" della S-05) */
  router.get('/itinerari', async (req, res) => {
    const lingua = linguaRichiesta(req)
    const { durata_max } = valida(z.object({ durata_max: z.coerce.number().int().positive().optional() }), req.query)
    res.json(durata_max ? await leggiItinerari(lingua, 'WHERE i.durata_minuti <= $1', [durata_max]) : await leggiItinerari(lingua))
  })

  /**
   * GET /api/itinerari/su-misura?lat=…&lng=…&minuti=…&tema=… (RF-08): un itinerario creato sul momento
   * per il tempo disponibile, a partire dalla posizione indicata. La posizione non viene salvata.
   */
  router.get('/itinerari/su-misura', async (req, res) => {
    const lingua = linguaRichiesta(req)
    const richiesta = valida(
      z.object({
        lat: z.coerce.number().min(-90).max(90),
        lng: z.coerce.number().min(-180).max(180),
        minuti: z.coerce.number().int().min(20, 'Servono almeno 20 minuti').max(8 * 60),
        tema: idSlug.optional(),
      }),
      req.query,
    )
    const luoghi = await db.query(
      `SELECT p.id, ${testo(lingua, 'p', 'nome')} AS nome, p.categoria, p.temi, ${testo(lingua, 'p', 'sintesi')} AS sintesi,
              ST_Y(p.posizione::geometry) AS lat, ST_X(p.posizione::geometry) AS lng
         FROM poi p
        WHERE ST_DWithin(p.posizione, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)`,
      [richiesta.lng, richiesta.lat, richiesta.minuti * 80],
    )
    const itinerario = creaItinerarioSuMisura(luoghi.map(rigaPoi), richiesta)
    if (!itinerario) {
      throw new ErroreHttp(404, 'itinerario_impossibile', 'Con questo tempo, da qui, non ci sono abbastanza luoghi da visitare')
    }
    res.json(itinerario)
  })

  router.get('/itinerari/:id', async (req, res) => {
    const [itinerario] = await leggiItinerari(linguaRichiesta(req), 'WHERE i.id = $1', [req.params.id])
    if (!itinerario) throw nonTrovato('Itinerario')
    res.json(itinerario)
  })

  async function leggiTradizioni(lingua, { originale = false } = {}) {
    return db.query(
      `SELECT t.id, ${testo(lingua, 't', 'nome')} AS nome, ${testo(lingua, 't', 'periodo')} AS periodo, t.mesi,
              ${testo(lingua, 't', 'descrizione')} AS descrizione, ${originale ? 't.traduzioni,' : ''}
              coalesce(json_agg(json_build_object('id', p.id, 'nome', ${testo(lingua, 'p', 'nome')}, 'categoria', p.categoria,
                'posizione', json_build_array(ST_Y(p.posizione::geometry), ST_X(p.posizione::geometry)))
                ORDER BY p.nome) FILTER (WHERE p.id IS NOT NULL), '[]') AS luoghi
         FROM tradizioni t
         LEFT JOIN tradizioni_poi tp ON tp.tradizione = t.id
         LEFT JOIN poi p ON p.id = tp.poi
        GROUP BY t.id
        ORDER BY (SELECT min(m) FROM unnest(t.mesi) AS m), t.nome`,
    )
  }

  /** GET /api/tradizioni (RF-19) */
  router.get('/tradizioni', async (req, res) => {
    res.json(await leggiTradizioni(linguaRichiesta(req)))
  })

  /** GET /api/gusto (RF-20): piatti tipici e locali con il piatto consigliato */
  router.get('/gusto', async (req, res) => {
    const lingua = linguaRichiesta(req)
    const [piatti, locali] = await Promise.all([
      db.query(
        `SELECT pi.id, ${testo(lingua, 'pi', 'nome')} AS nome, ${testo(lingua, 'pi', 'tipo')} AS tipo,
                ${testo(lingua, 'pi', 'descrizione')} AS descrizione
           FROM piatti pi ORDER BY pi.ordine, pi.nome`,
      ),
      db.query(`SELECT ${colonnePoi(lingua)}, ${COPERTINA} FROM poi p WHERE p.categoria = 'gastronomia' ORDER BY nome`),
    ])
    res.json({ piatti, locali: locali.map(rigaPoi) })
  })

  // ---------- Amministrazione (UC-07, RF-24) ----------

  router.get('/admin/poi', soloAmministratori, async (req, res) => {
    const righe = await db.query(
      `SELECT ${colonnePoi('it')}, p.descrizione, p.affresco_autore, p.affresco_epoca, p.parole_chiave, p.fonti, p.traduzioni, p.aggiornato_il,
              (SELECT count(*)::int FROM tappe t WHERE t.poi = p.id) AS tappe,
              (SELECT count(*)::int FROM foto_poi fp WHERE fp.poi = p.id) AS foto
         FROM poi p ORDER BY p.nome`,
    )
    res.json(righe.map(rigaPoi))
  })

  /** E2: esiste un POI con lo stesso nome a meno di 20 m? */
  async function cercaDuplicato(dati, escludiId = null) {
    const [duplicato] = await db.query(
      `SELECT id, nome FROM poi
        WHERE ${normalizzaSql('nome')} = ${normalizzaSql('$1')}
          AND ST_DWithin(posizione, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, ${RAGGIO_DUPLICATI_M})
          AND id IS DISTINCT FROM $4`,
      [dati.nome, dati.posizione[1], dati.posizione[0], escludiId],
    )
    return duplicato
  }

  async function idLibero(tabella, base) {
    let id = slug(base)
    for (let n = 2; (await db.query(`SELECT 1 FROM ${tabella} WHERE id = $1`, [id])).length; n++) id = `${slug(base)}-${n}`
    return id
  }

  const valoriPoi = (d) => [
    d.nome, d.categoria, d.temi, d.posizione[1], d.posizione[0], d.indirizzo, d.epoca, d.sintesi, d.descrizione,
    d.affresco_autore, d.affresco_epoca, d.categoria === 'gastronomia' ? d.piatto_consigliato : null, d.parole_chiave,
    JSON.stringify(d.fonti), traduzioniSql(d.traduzioni),
  ]
  const INSERISCI_POI = `INSERT INTO poi (id, nome, categoria, temi, posizione, indirizzo, epoca, sintesi, descrizione,
                        affresco_autore, affresco_epoca, piatto_consigliato, parole_chiave, fonti, traduzioni)
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7, $8, $9, $10, $11, $12, $13, $14, $15,
               coalesce($16::jsonb, '{}'::jsonb))`
  const AGGIORNA_POI = `UPDATE poi SET nome = $2, categoria = $3, temi = $4, posizione = ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
              indirizzo = $7, epoca = $8, sintesi = $9, descrizione = $10, affresco_autore = $11, affresco_epoca = $12,
              piatto_consigliato = $13, parole_chiave = $14, fonti = $15, traduzioni = coalesce($16::jsonb, traduzioni),
              aggiornato_il = now()
        WHERE id = $1 RETURNING id`

  router.post('/admin/poi', soloAmministratori, async (req, res) => {
    const dati = valida(schemaPoi, req.body)
    const duplicato = await cercaDuplicato(dati)
    if (duplicato && req.query.conferma !== '1') {
      throw new ErroreHttp(409, 'possibile_duplicato', `Esiste già "${duplicato.nome}" a meno di ${RAGGIO_DUPLICATI_M} m`, { esistente: duplicato })
    }
    const id = await idLibero('poi', dati.nome)
    await db.query(INSERISCI_POI, [id, ...valoriPoi(dati)])
    res.status(201).json({ id })
  })

  router.put('/admin/poi/:id', soloAmministratori, async (req, res) => {
    const dati = valida(schemaPoi, req.body)
    const duplicato = await cercaDuplicato(dati, req.params.id)
    if (duplicato && req.query.conferma !== '1') {
      throw new ErroreHttp(409, 'possibile_duplicato', `Esiste già "${duplicato.nome}" a meno di ${RAGGIO_DUPLICATI_M} m`, { esistente: duplicato })
    }
    const [aggiornato] = await db.query(AGGIORNA_POI, [req.params.id, ...valoriPoi(dati)])
    if (!aggiornato) throw nonTrovato('Luogo')
    res.json({ id: aggiornato.id })
  })

  // 1b: se il POI è una tappa di un itinerario si chiede conferma prima di eliminarlo.
  // Le tappe restano negli itinerari come "rimosse" (migrazione 004): il visitatore viene avvisato.
  router.delete('/admin/poi/:id', soloAmministratori, async (req, res) => {
    const [esiste] = await db.query('SELECT id FROM poi WHERE id = $1', [req.params.id])
    if (!esiste) throw nonTrovato('Luogo')
    const itinerari = await db.query(
      'SELECT DISTINCT i.id, i.titolo FROM itinerari i JOIN tappe t ON t.itinerario = i.id WHERE t.poi = $1',
      [req.params.id],
    )
    if (itinerari.length && req.query.conferma !== '1') {
      throw new ErroreHttp(409, 'usato_in_itinerari', 'Il luogo è una tappa di uno o più itinerari', { itinerari })
    }
    const foto = await db.transazione(async (tx) => {
      const elenco = await tx.query(
        `SELECT f.id, f.area FROM foto f JOIN contenuti c ON c.foto = f.id WHERE c.poi = $1
         UNION ALL
         SELECT f.id, f.area FROM foto f JOIN foto_poi fp ON fp.foto = f.id WHERE fp.poi = $1`,
        [req.params.id],
      )
      await tx.query('DELETE FROM poi WHERE id = $1', [req.params.id])
      await tx.query('DELETE FROM preferiti WHERE tipo = \'poi\' AND riferimento = $1', [req.params.id])
      if (elenco.length) await tx.query('DELETE FROM foto WHERE id = ANY($1::uuid[])', [elenco.map((f) => f.id)])
      return elenco
    })
    for (const f of foto) await archivio.elimina(f.area, f.id)
    res.status(204).end()
  })

  // Foto ufficiali di un luogo, con i crediti (autore e licenza sono obbligatori)
  router.post('/admin/poi/:id/foto', soloAmministratori, caricamento.single('foto'), async (req, res) => {
    const crediti = valida(schemaCreditiFoto, req.body)
    if (!req.file) {
      throw new ErroreHttp(400, 'dati_non_validi', 'Scegli una foto', { campi: { foto: 'Scegli una foto' } })
    }
    const [poi] = await db.query('SELECT id FROM poi WHERE id = $1', [req.params.id])
    if (!poi) throw nonTrovato('Luogo')

    const immagine = await preparaFoto(req.file.buffer)
    const id = await db.transazione(async (tx) => {
      const [riga] = await tx.query(
        'INSERT INTO foto (area, larghezza, altezza) VALUES (\'pubblica\', $1, $2) RETURNING id',
        [immagine.larghezza, immagine.altezza],
      )
      await tx.query(
        `INSERT INTO foto_poi (foto, poi, ordine, didascalia, autore, licenza, url_licenza, fonte)
         VALUES ($1, $2, (SELECT coalesce(max(ordine), -1) + 1 FROM foto_poi WHERE poi = $2), $3, $4, $5, $6, $7)`,
        [riga.id, poi.id, crediti.didascalia, crediti.autore, crediti.licenza, crediti.url_licenza, crediti.fonte],
      )
      return riga.id
    })
    await archivio.salva('pubblica', id, immagine)
    res.status(201).json({ id })
  })

  router.delete('/admin/poi/:id/foto/:foto', soloAmministratori, async (req, res) => {
    const idFoto = valida(z.uuid('Foto non valida'), req.params.foto)
    const [eliminata] = await db.query(
      `DELETE FROM foto WHERE id = $1 AND id IN (SELECT foto FROM foto_poi WHERE poi = $2) RETURNING area`,
      [idFoto, req.params.id],
    )
    if (!eliminata) throw nonTrovato('Foto')
    await archivio.elimina(eliminata.area, idFoto)
    res.status(204).end()
  })

  async function controllaPoiEsistenti(ids) {
    if (!ids.length) return
    const trovati = await db.query('SELECT id FROM poi WHERE id = ANY($1::text[])', [ids])
    const mancanti = ids.filter((id) => !trovati.some((t) => t.id === id))
    if (mancanti.length) {
      throw new ErroreHttp(400, 'dati_non_validi', 'Alcuni luoghi non esistono', { campi: { tappe: `Luoghi inesistenti: ${mancanti.join(', ')}` } })
    }
  }

  // Elenchi con i testi originali e le traduzioni, per i moduli del pannello di amministrazione
  router.get('/admin/itinerari', soloAmministratori, async (req, res) => {
    res.json(await leggiItinerari('it', '', [], { originale: true }))
  })

  router.get('/admin/tradizioni', soloAmministratori, async (req, res) => {
    res.json(await leggiTradizioni('it', { originale: true }))
  })

  router.post('/admin/itinerari', soloAmministratori, async (req, res) => {
    const dati = valida(schemaItinerario, req.body)
    await controllaPoiEsistenti(dati.tappe)
    const id = await idLibero('itinerari', dati.titolo)
    await db.transazione(async (tx) => {
      await tx.query(
        `INSERT INTO itinerari (id, titolo, tema, durata_minuti, descrizione, traduzioni)
         VALUES ($1, $2, $3, $4, $5, coalesce($6::jsonb, '{}'::jsonb))`,
        [id, dati.titolo, dati.tema, dati.durata_minuti, dati.descrizione, traduzioniSql(dati.traduzioni)],
      )
      for (const [i, poi] of dati.tappe.entries()) {
        await tx.query('INSERT INTO tappe (itinerario, ordine, poi) VALUES ($1, $2, $3)', [id, i + 1, poi])
      }
    })
    res.status(201).json({ id })
  })

  router.put('/admin/itinerari/:id', soloAmministratori, async (req, res) => {
    const dati = valida(schemaItinerario, req.body)
    await controllaPoiEsistenti(dati.tappe)
    await db.transazione(async (tx) => {
      const [esiste] = await tx.query(
        `UPDATE itinerari SET titolo = $2, tema = $3, durata_minuti = $4, descrizione = $5, traduzioni = coalesce($6::jsonb, traduzioni)
          WHERE id = $1 RETURNING id`,
        [req.params.id, dati.titolo, dati.tema, dati.durata_minuti, dati.descrizione, traduzioniSql(dati.traduzioni)],
      )
      if (!esiste) throw nonTrovato('Itinerario')
      await tx.query('DELETE FROM tappe WHERE itinerario = $1', [req.params.id])
      for (const [i, poi] of dati.tappe.entries()) {
        await tx.query('INSERT INTO tappe (itinerario, ordine, poi) VALUES ($1, $2, $3)', [req.params.id, i + 1, poi])
      }
    })
    res.json({ id: req.params.id })
  })

  router.delete('/admin/itinerari/:id', soloAmministratori, async (req, res) => {
    const [eliminato] = await db.query('DELETE FROM itinerari WHERE id = $1 RETURNING id', [req.params.id])
    if (!eliminato) throw nonTrovato('Itinerario')
    await db.query('DELETE FROM preferiti WHERE tipo = \'itinerario\' AND riferimento = $1', [req.params.id])
    res.status(204).end()
  })

  router.post('/admin/tradizioni', soloAmministratori, async (req, res) => {
    const dati = valida(schemaTradizione, req.body)
    await controllaPoiEsistenti(dati.luoghi)
    const id = await idLibero('tradizioni', dati.nome)
    await db.transazione(async (tx) => {
      await tx.query(
        `INSERT INTO tradizioni (id, nome, periodo, mesi, descrizione, traduzioni)
         VALUES ($1, $2, $3, $4, $5, coalesce($6::jsonb, '{}'::jsonb))`,
        [id, dati.nome, dati.periodo, dati.mesi, dati.descrizione, traduzioniSql(dati.traduzioni)],
      )
      for (const poi of new Set(dati.luoghi)) await tx.query('INSERT INTO tradizioni_poi (tradizione, poi) VALUES ($1, $2)', [id, poi])
    })
    res.status(201).json({ id })
  })

  router.put('/admin/tradizioni/:id', soloAmministratori, async (req, res) => {
    const dati = valida(schemaTradizione, req.body)
    await controllaPoiEsistenti(dati.luoghi)
    await db.transazione(async (tx) => {
      const [esiste] = await tx.query(
        `UPDATE tradizioni SET nome = $2, periodo = $3, mesi = $4, descrizione = $5, traduzioni = coalesce($6::jsonb, traduzioni)
          WHERE id = $1 RETURNING id`,
        [req.params.id, dati.nome, dati.periodo, dati.mesi, dati.descrizione, traduzioniSql(dati.traduzioni)],
      )
      if (!esiste) throw nonTrovato('Tradizione')
      await tx.query('DELETE FROM tradizioni_poi WHERE tradizione = $1', [req.params.id])
      for (const poi of new Set(dati.luoghi)) {
        await tx.query('INSERT INTO tradizioni_poi (tradizione, poi) VALUES ($1, $2)', [req.params.id, poi])
      }
    })
    res.json({ id: req.params.id })
  })

  router.delete('/admin/tradizioni/:id', soloAmministratori, async (req, res) => {
    const [eliminata] = await db.query('DELETE FROM tradizioni WHERE id = $1 RETURNING id', [req.params.id])
    if (!eliminata) throw nonTrovato('Tradizione')
    res.status(204).end()
  })

  // ---------- Importazione (RNF-PO04): i file dell'esportazione, anche modificati ----------
  // Una voce con un identificatore già presente viene aggiornata, le altre vengono create.
  // Tutto il file viene controllato prima di salvare: se una voce non è valida non si salva niente.

  /** Errore di una voce del file, con il suo identificatore */
  function voceNonValida(id, errore) {
    const campi = errore.dettagli?.campi ? Object.entries(errore.dettagli.campi).map(([c, m]) => `${c}: ${m}`).join('; ') : errore.message
    return new ErroreHttp(400, 'importazione_non_valida', `"${id}": ${campi}`)
  }

  router.post('/admin/importa/poi', soloAmministratori, corpoGrande, async (req, res) => {
    const file = valida(schemaImportaPoi, req.body)
    const voci = file.features.map(({ geometry, properties }) => {
      const { id, lat: _lat, lng: _lng, posizione: _p, ...campi } = properties
      try {
        return { id, dati: valida(schemaPoi, { ...campi, posizione: [geometry.coordinates[1], geometry.coordinates[0]] }) }
      } catch (errore) {
        throw voceNonValida(id, errore)
      }
    })
    const esito = await db.transazione(async (tx) => {
      const conteggio = { creati: 0, aggiornati: 0 }
      for (const { id, dati } of voci) {
        const [aggiornato] = await tx.query(AGGIORNA_POI, [id, ...valoriPoi(dati)])
        if (aggiornato) conteggio.aggiornati++
        else {
          await tx.query(INSERISCI_POI, [id, ...valoriPoi(dati)])
          conteggio.creati++
        }
      }
      return conteggio
    })
    res.json(esito)
  })

  router.post('/admin/importa/itinerari', soloAmministratori, corpoGrande, async (req, res) => {
    const file = valida(schemaImportaItinerari, req.body)
    const voci = file.itinerari.map(({ id, ...campi }) => {
      try {
        return { id, dati: valida(schemaItinerario, campi) }
      } catch (errore) {
        throw voceNonValida(id, errore)
      }
    })
    await controllaPoiEsistenti([...new Set(voci.flatMap((v) => v.dati.tappe))])
    const esito = await db.transazione(async (tx) => {
      const conteggio = { creati: 0, aggiornati: 0 }
      for (const { id, dati } of voci) {
        const [riga] = await tx.query(
          `INSERT INTO itinerari (id, titolo, tema, durata_minuti, descrizione, traduzioni)
           VALUES ($1, $2, $3, $4, $5, coalesce($6::jsonb, '{}'::jsonb))
           ON CONFLICT (id) DO UPDATE SET titolo = $2, tema = $3, durata_minuti = $4, descrizione = $5,
                                          traduzioni = coalesce($6::jsonb, itinerari.traduzioni)
           RETURNING (xmax = 0) AS creato`,
          [id, dati.titolo, dati.tema, dati.durata_minuti, dati.descrizione, traduzioniSql(dati.traduzioni)],
        )
        conteggio[riga.creato ? 'creati' : 'aggiornati']++
        await tx.query('DELETE FROM tappe WHERE itinerario = $1', [id])
        for (const [i, poi] of dati.tappe.entries()) {
          await tx.query('INSERT INTO tappe (itinerario, ordine, poi) VALUES ($1, $2, $3)', [id, i + 1, poi])
        }
      }
      return conteggio
    })
    res.json(esito)
  })

  return router
}
