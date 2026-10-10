// Configurazione letta dalle variabili d'ambiente, con valori adatti allo sviluppo.

import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CARTELLA_BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Segreto per firmare i token. Si può dare con JWT_SEGRETO (almeno 32 caratteri); altrimenti in
 * produzione il server ne crea uno casuale al primo avvio e lo conserva nella cartella dei dati,
 * così `docker compose up` funziona senza preparare niente (RNF-PO03) e il segreto resta lo stesso
 * a ogni riavvio.
 */
function segretoJwt(env, sviluppo, cartellaDati) {
  if (env.JWT_SEGRETO) {
    if (!sviluppo && env.JWT_SEGRETO.length < 32) throw new Error('JWT_SEGRETO deve avere almeno 32 caratteri')
    return env.JWT_SEGRETO
  }
  if (sviluppo) return 'segreto-solo-per-lo-sviluppo-locale'
  const file = path.join(cartellaDati, 'segreto-jwt')
  if (existsSync(file)) return readFileSync(file, 'utf8').trim()
  const segreto = randomBytes(48).toString('base64url')
  mkdirSync(cartellaDati, { recursive: true })
  writeFileSync(file, segreto, { mode: 0o600 })
  return segreto
}

export function leggiConfigurazione(env = process.env) {
  const sviluppo = env.NODE_ENV !== 'production'
  const cartellaDati = env.CARTELLA_DATI ?? path.join(CARTELLA_BACKEND, '.dati')
  const segreto = segretoJwt(env, sviluppo, cartellaDati)

  return {
    sviluppo,
    porta: Number(env.PORT ?? 3000),

    // Con DATABASE_URL si usa un server PostgreSQL + PostGIS (es. Docker Compose);
    // senza, PGlite: lo stesso PostgreSQL eseguito dentro Node, con i dati in CARTELLA_DATI.
    databaseUrl: env.DATABASE_URL ?? null,
    cartellaDati,

    jwtSegreto: new TextEncoder().encode(segreto),

    // Senza SMTP_URL le e-mail non partono: finiscono nella "posta di prova" (solo in sviluppo)
    smtpUrl: env.SMTP_URL ?? null,
    mittente: env.EMAIL_MITTENTE ?? 'Discover Tridentum <noreply@discover-tridentum.local>',

    // Indirizzo da cui gli utenti aprono il sito: serve per i link nelle e-mail.
    // Se è in HTTPS (RNF-S01) i cookie viaggiano solo su connessioni cifrate.
    indirizzoPubblico: (env.INDIRIZZO_PUBBLICO ?? (sviluppo ? 'http://localhost:5173' : `http://localhost:${env.PORT ?? 3000}`)).replace(/\/$/, ''),

    // Frontend compilato (npm run build) servito dallo stesso server
    cartellaFrontend: env.CARTELLA_FRONTEND ?? path.join(CARTELLA_BACKEND, '..', 'frontend', 'dist'),

    // Numero di proxy (es. il proxy HTTPS) tra Internet e il server
    proxyFidati: Number(env.PROXY_FIDATI ?? 0),

    // Richieste all'API al minuto per indirizzo IP (RNF-S06); il test di carico lo alza
    limiteRichieste: Number(env.LIMITE_RICHIESTE ?? 600),

    // Indirizzo a cui scrivere per esercitare i diritti sui dati personali, mostrato nell'informativa (RNF-S04)
    contattoPrivacy: env.EMAIL_PRIVACY || null,

    get https() {
      return this.indirizzoPubblico.startsWith('https://')
    },

    // Account e ricordi di prova per provare moderazione e amministrazione
    datiDimostrativi: env.DATI_DIMOSTRATIVI ? env.DATI_DIMOSTRATIVI === 'si' : sviluppo,
  }
}
