// Configurazione letta dalle variabili d'ambiente, con valori adatti allo sviluppo.
// In produzione (NODE_ENV=production) i segreti sono obbligatori.

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CARTELLA_BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function leggiConfigurazione(env = process.env) {
  const sviluppo = env.NODE_ENV !== 'production'

  const segreto = env.JWT_SEGRETO ?? (sviluppo ? 'segreto-solo-per-lo-sviluppo-locale' : null)
  if (!segreto || (!sviluppo && segreto.length < 32)) {
    throw new Error('In produzione serve JWT_SEGRETO di almeno 32 caratteri')
  }

  return {
    sviluppo,
    porta: Number(env.PORT ?? 3000),

    // Con DATABASE_URL si usa un server PostgreSQL + PostGIS (es. Docker Compose);
    // senza, PGlite: lo stesso PostgreSQL eseguito dentro Node, con i dati in CARTELLA_DATI.
    databaseUrl: env.DATABASE_URL ?? null,
    cartellaDati: env.CARTELLA_DATI ?? path.join(CARTELLA_BACKEND, '.dati'),

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

    get https() {
      return this.indirizzoPubblico.startsWith('https://')
    },

    // Account e ricordi di prova per provare moderazione e amministrazione
    datiDimostrativi: env.DATI_DIMOSTRATIVI ? env.DATI_DIMOSTRATIVI === 'si' : sviluppo,
  }
}
