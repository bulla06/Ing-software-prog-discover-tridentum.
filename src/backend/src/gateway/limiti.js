// Protezione dagli abusi (RNF-S06): limiti al numero di richieste.
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { ErroreHttp } from './errori.js'

const risposta = (codice, messaggio) => (req, res, next) => next(new ErroreHttp(429, codice, messaggio))

export function creaLimiti() {
  return {
    generale: rateLimit({
      windowMs: 60 * 1000,
      limit: 600,
      handler: risposta('troppe_richieste', 'Troppe richieste: riprova tra poco'),
    }),

    // UC-03 E3: dopo 5 tentativi falliti in un minuto sulla stessa e-mail, blocco temporaneo
    accesso: rateLimit({
      windowMs: 60 * 1000,
      limit: 5,
      skipSuccessfulRequests: true,
      keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${String(req.body?.email ?? '').toLowerCase()}`,
      handler: risposta('troppi_tentativi', 'Troppi tentativi di accesso: riprova tra un minuto'),
    }),

    registrazione: rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 10,
      handler: risposta('troppe_richieste', 'Troppe richieste: riprova più tardi'),
    }),

    // UC-04 E3: numero massimo di ricordi per utente in un giorno
    caricamenti: rateLimit({
      windowMs: 24 * 60 * 60 * 1000,
      limit: 10,
      keyGenerator: (req) => req.utente?.id ?? ipKeyGenerator(req.ip),
      handler: risposta('limite_caricamenti', 'Hai raggiunto il limite di ricordi per oggi: riprova domani'),
    }),

    segnalazioni: rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 20,
      handler: risposta('troppe_richieste', 'Troppe segnalazioni: riprova più tardi'),
    }),
  }
}
