// Applicazione Express: il gateway (sicurezza, token, limiti, registro) davanti ai quattro moduli.
// Lo stesso server consegna anche il frontend compilato e le foto pubblicate.

import { existsSync } from 'node:fs'
import path from 'node:path'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { identifica } from './gateway/autenticazione.js'
import { ErroreHttp, gestoreErrori } from './gateway/errori.js'
import { creaLimiti } from './gateway/limiti.js'
import { rotteContenuti } from './moduli/contenuti/rotte.js'
import { rotteGioco } from './moduli/gioco/rotte.js'
import { rotteLuoghi } from './moduli/luoghi/rotte.js'
import { rotteUtenti } from './moduli/utenti/rotte.js'

export function creaApp({ db, config, posta, archivio, registro = config.sviluppo }) {
  const app = express()
  const limiti = creaLimiti()
  const dipendenze = { db, config, posta, archivio, limiti }

  // Dietro un proxy HTTPS l'IP del visitatore arriva in X-Forwarded-For: lo si legge solo se il proxy
  // è dichiarato, altrimenti chiunque potrebbe inventarsi un IP e aggirare i limiti alle richieste
  if (config.proxyFidati) app.set('trust proxy', config.proxyFidati)
  app.disable('x-powered-by')

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'img-src': ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
          // Leaflet posiziona mappa e segnaposti con attributi style
          'style-src': ["'self'", "'unsafe-inline'"],
          // Solo se il sito è davvero in HTTPS: su http://localhost bloccherebbe le risorse
          'upgrade-insecure-requests': config.https ? [] : null,
        },
      },
    }),
  )

  // Registro degli accessi all'API (Fase 3 §5.2)
  if (registro) {
    app.use('/api', (req, res, next) => {
      const inizio = Date.now()
      res.on('finish', () => console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - inizio} ms)`))
      next()
    })
  }

  const api = express.Router()
  api.use(limiti.generale)
  api.use(express.json({ limit: '200kb' }))
  api.use(cookieParser())
  api.use(identifica(config.jwtSegreto))

  api.get('/stato', (req, res) => res.json({ ok: true, sviluppo: config.sviluppo, database: db.tipo }))

  api.use(rotteUtenti(dipendenze))
  api.use(rotteLuoghi(dipendenze))
  api.use(rotteContenuti(dipendenze))
  api.use(rotteGioco(dipendenze))

  // Posta di prova: le e-mail che in sviluppo non vengono spedite
  if (config.sviluppo) {
    api.get('/dev/posta', (req, res) => res.json(posta.postaDiProva()))
  }

  api.use((req, res, next) => next(new ErroreHttp(404, 'non_trovato', 'Indirizzo dell\'API inesistente')))
  app.use('/api', api)

  // Frontend compilato (npm run build): il routing usa l'hash, basta index.html
  if (existsSync(path.join(config.cartellaFrontend, 'index.html'))) {
    app.use(express.static(config.cartellaFrontend, { index: 'index.html', maxAge: '1h' }))
  }

  app.use(gestoreErrori)
  return app
}
