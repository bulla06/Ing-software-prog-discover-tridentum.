// Errori dell'API: ogni risposta di errore ha la forma { errore: codice, messaggio, ... }.
// Il codice è stabile (il frontend lo usa per tradurre), il messaggio è in italiano.

import { ZodError } from 'zod'
import multer from 'multer'

export class ErroreHttp extends Error {
  constructor(stato, codice, messaggio, dettagli = {}) {
    super(messaggio)
    this.stato = stato
    this.codice = codice
    this.dettagli = dettagli
  }
}

export const nonTrovato = (cosa = 'Risorsa') => new ErroreHttp(404, 'non_trovato', `${cosa} non trovato`)

/** Valida `dati` con uno schema zod; se non vanno bene risponde 400 indicando i campi da correggere (UC-03 E2). */
export function valida(schema, dati) {
  const esito = schema.safeParse(dati)
  if (esito.success) return esito.data
  throw daZod(esito.error)
}

function daZod(errore) {
  const campi = {}
  for (const problema of errore.issues) {
    const campo = problema.path.join('.') || '_'
    campi[campo] ??= problema.message
  }
  return new ErroreHttp(400, 'dati_non_validi', 'Alcuni campi non sono validi', { campi })
}

// Express riconosce un gestore di errori dai quattro parametri, anche se `next` non si usa
export function gestoreErrori(errore, req, res, next) {
  if (errore instanceof ZodError) errore = daZod(errore)

  if (errore instanceof multer.MulterError) {
    errore =
      errore.code === 'LIMIT_FILE_SIZE'
        ? new ErroreHttp(413, 'foto_troppo_grande', 'La foto supera i 10 MB')
        : new ErroreHttp(400, 'caricamento_non_valido', 'Caricamento non valido')
  }

  // JSON malformato nel corpo della richiesta
  if (errore.type === 'entity.parse.failed') errore = new ErroreHttp(400, 'json_non_valido', 'Corpo della richiesta non valido')
  if (errore.type === 'entity.too.large') errore = new ErroreHttp(413, 'richiesta_troppo_grande', 'Richiesta troppo grande')

  if (errore instanceof ErroreHttp) {
    res.status(errore.stato).json({ errore: errore.codice, messaggio: errore.message, ...errore.dettagli })
    return
  }

  console.error(errore)
  res.status(500).json({ errore: 'errore_interno', messaggio: 'Si è verificato un errore. Riprova più tardi.' })
}
