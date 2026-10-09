// Client dell'API (Fase 3 §4.3: il frontend parla solo con il gateway, in HTTPS e JSON).
//
// Il token di accesso resta solo in memoria. Quando scade (401) il client ne chiede
// uno nuovo con il cookie di rinnovo e ripete la richiesta, senza che le pagine se ne accorgano.

let tokenAccesso = null
let rinnovoInCorso = null
const ascoltatori = new Set()

export class ErroreApi extends Error {
  constructor(stato, corpo = {}) {
    super(corpo.messaggio ?? 'Errore di comunicazione con il server')
    this.stato = stato
    this.codice = corpo.errore ?? (stato === 0 ? 'rete' : 'errore_interno')
    this.campi = corpo.campi ?? {}
    this.dettagli = corpo
  }
}

/** Avvisa chi è interessato (la sessione) quando l'utente cambia: accesso, rinnovo, uscita */
export function suCambioUtente(fn) {
  ascoltatori.add(fn)
  return () => ascoltatori.delete(fn)
}

export function impostaSessione(sessione) {
  tokenAccesso = sessione?.token ?? null
  for (const fn of ascoltatori) fn(sessione?.utente ?? null)
}

export const haToken = () => Boolean(tokenAccesso)

async function invia(metodo, percorso, { corpo, formData, conToken = true } = {}) {
  const intestazioni = {}
  if (conToken && tokenAccesso) intestazioni.Authorization = `Bearer ${tokenAccesso}`
  let body
  if (formData) body = formData
  else if (corpo !== undefined) {
    intestazioni['Content-Type'] = 'application/json'
    body = JSON.stringify(corpo)
  }
  try {
    return await fetch(`/api${percorso}`, { method: metodo, headers: intestazioni, body, credentials: 'same-origin' })
  } catch {
    throw new ErroreApi(0, { messaggio: 'Server non raggiungibile' })
  }
}

/** Chiede un nuovo token con il cookie di rinnovo. Una sola richiesta alla volta. */
export function rinnova() {
  rinnovoInCorso ??= (async () => {
    try {
      const risposta = await invia('POST', '/auth/rinnovo', { conToken: false })
      // 204: nessuna sessione da ripristinare (visitatore senza account)
      if (risposta.status === 204 || !risposta.ok) {
        impostaSessione(null)
        return null
      }
      const sessione = await risposta.json()
      impostaSessione(sessione)
      return sessione
    } finally {
      rinnovoInCorso = null
    }
  })()
  return rinnovoInCorso
}

export async function api(metodo, percorso, opzioni = {}) {
  let risposta = await invia(metodo, percorso, opzioni)

  if (risposta.status === 401 && tokenAccesso && !percorso.startsWith('/auth/')) {
    // Con il token rinnovato, oppure senza token se la sessione è scaduta: le richieste pubbliche funzionano comunque
    await rinnova()
    risposta = await invia(metodo, percorso, opzioni)
  }

  if (risposta.status === 204) return null
  const corpo = await risposta.json().catch(() => ({}))
  if (!risposta.ok) throw new ErroreApi(risposta.status, corpo)
  return corpo
}

/** Scarica un file protetto (es. foto in attesa di moderazione) come URL locale da usare in <img> */
export async function scaricaBlob(percorso) {
  let risposta = await invia('GET', percorso)
  if (risposta.status === 401 && tokenAccesso) {
    await rinnova()
    risposta = await invia('GET', percorso)
  }
  if (!risposta.ok) throw new ErroreApi(risposta.status)
  return URL.createObjectURL(await risposta.blob())
}

export const urlFoto = (id, formato = 'standard') => `/api/foto/${id}${formato === 'mini' ? '?formato=mini' : ''}`
