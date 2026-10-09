// Identità e ruoli (Fase 3 §5.2, D-08): token di accesso JWT di breve durata
// e token di rinnovo casuale, salvato come hash nel database e inviato in un cookie httpOnly.

import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { ErroreHttp } from './errori.js'

export const DURATA_ACCESSO = '15m'
export const DURATA_RINNOVO_MS = 30 * 24 * 60 * 60 * 1000
export const COOKIE_RINNOVO = 'tridentum_rinnovo'

export const hashToken = (token) => createHash('sha256').update(token).digest('hex')
export const nuovoTokenCasuale = () => randomBytes(32).toString('base64url')

export function creaTokenAccesso(utente, segreto) {
  return new SignJWT({ ruolo: utente.ruolo, nome: utente.nome_visualizzato })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(utente.id)
    .setAudience('accesso')
    .setIssuedAt()
    .setExpirationTime(DURATA_ACCESSO)
    .sign(segreto)
}

/**
 * Legge l'eventuale token "Authorization: Bearer …" e imposta req.utente.
 * Un token scaduto o non valido dà 401: il frontend chiede un nuovo token e riprova.
 */
export function identifica(segreto) {
  return async (req, res, next) => {
    const intestazione = req.get('authorization')
    if (!intestazione?.startsWith('Bearer ')) return next()
    try {
      const { payload } = await jwtVerify(intestazione.slice(7), segreto, { algorithms: ['HS256'], audience: 'accesso' })
      req.utente = { id: payload.sub, ruolo: payload.ruolo, nome: payload.nome }
      next()
    } catch {
      next(new ErroreHttp(401, 'token_non_valido', 'Sessione scaduta'))
    }
  }
}

export function richiediAccesso(req, res, next) {
  if (!req.utente) return next(new ErroreHttp(401, 'accesso_richiesto', 'Serve effettuare l\'accesso'))
  next()
}

/**
 * Consente l'accesso solo a chi ha uno dei ruoli indicati (RNF-S03).
 * Il ruolo si rilegge dal database: una revoca vale dalla richiesta successiva (UC-09).
 */
export function richiediRuolo(db, ...ruoli) {
  return async (req, res, next) => {
    if (!req.utente) return next(new ErroreHttp(401, 'accesso_richiesto', 'Serve effettuare l\'accesso'))
    const [riga] = await db.query('SELECT ruolo FROM utenti WHERE id = $1', [req.utente.id])
    if (!riga || !ruoli.includes(riga.ruolo)) {
      return next(new ErroreHttp(403, 'ruolo_insufficiente', 'Non hai i permessi per questa funzione'))
    }
    req.utente.ruolo = riga.ruolo
    next()
  }
}
