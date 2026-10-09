// Accesso ai dati: una funzione per ogni endpoint dell'API Gateway (Fase 3 §5.2).
// Le pagine usano solo queste funzioni e non conoscono gli indirizzi dell'API.

import { api } from '../lib/http.js'

const parametri = (oggetto) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(oggetto)) if (v != null && v !== '') p.set(k, v)
  const s = p.toString()
  return s ? `?${s}` : ''
}

// ---------- Luoghi (UC-01, UC-02, UC-10) ----------
export const getPoi = ({ q, categoria, tema } = {}) => api('GET', `/poi${parametri({ q, categoria, tema })}`)
export const getPoiById = (id) => api('GET', `/poi/${encodeURIComponent(id)}`)
export const getItinerari = ({ durataMax } = {}) => api('GET', `/itinerari${parametri({ durata_max: durataMax })}`)
export const getItinerario = (id) => api('GET', `/itinerari/${encodeURIComponent(id)}`)
export const getTradizioni = () => api('GET', '/tradizioni')
export const getGusto = () => api('GET', '/gusto')
export const URL_GEOJSON = '/api/esporta/poi.geojson'

// ---------- Account (UC-03, UC-08) ----------
export const registrati = (dati) => api('POST', '/auth/registrazione', { corpo: dati })
export const nuovoLinkConferma = (email) => api('POST', '/auth/conferma/nuovo', { corpo: { email } })
export const passwordDimenticata = (email) => api('POST', '/auth/password-dimenticata', { corpo: { email } })
export const reimpostaPassword = (token, password) => api('POST', '/auth/reimposta', { corpo: { token, password } })
export const getProfilo = () => api('GET', '/me')
export const eliminaAccount = (password, contributi) => api('DELETE', '/me', { corpo: { password, contributi } })
export const salvaPreferito = (tipo, riferimento) => api('PUT', '/me/preferiti', { corpo: { tipo, riferimento } })
export const togliPreferito = (tipo, riferimento) =>
  api('DELETE', `/me/preferiti/${tipo}/${encodeURIComponent(riferimento)}`)

// ---------- Ricordi e segnalazioni (UC-04, RF-18) ----------
export const inviaRicordo = (poi, formData) => api('POST', `/poi/${encodeURIComponent(poi)}/contenuti`, { formData })
export const segnalaRicordo = (id, dati) => api('POST', `/contenuti/${id}/segnalazioni`, { corpo: dati })
export const segnalaPoi = (id, dati) => api('POST', `/poi/${encodeURIComponent(id)}/segnalazioni`, { corpo: dati })

// ---------- Moderazione (UC-05) ----------
export const getCodaModerazione = () => api('GET', '/moderazione/coda')
export const decidiContenuto = (id, esito, motivazione = '') =>
  api('POST', `/moderazione/contenuti/${id}/decisione`, { corpo: { esito, motivazione } })
export const decidiSegnalazione = (id, esito) => api('POST', `/moderazione/segnalazioni/${id}/decisione`, { corpo: { esito } })

// ---------- Gioco (UC-06) ----------
export const nuovaPartita = () => api('GET', '/gioco/partita')
export const verificaRisposta = (partita, indice, posizione) =>
  api('POST', '/gioco/verifica', { corpo: { partita, indice, posizione } })
export const salvaPunteggio = (partita, risposte) => api('POST', '/gioco/punteggi', { corpo: { partita, risposte } })
export const getClassifica = () => api('GET', '/gioco/classifica')

// ---------- Amministrazione (UC-07, UC-09) ----------
const conConferma = (conferma) => (conferma ? '?conferma=1' : '')
export const admin = {
  getPoi: () => api('GET', '/admin/poi'),
  creaPoi: (dati, conferma) => api('POST', `/admin/poi${conConferma(conferma)}`, { corpo: dati }),
  modificaPoi: (id, dati, conferma) => api('PUT', `/admin/poi/${id}${conConferma(conferma)}`, { corpo: dati }),
  eliminaPoi: (id, conferma) => api('DELETE', `/admin/poi/${id}${conConferma(conferma)}`),
  creaItinerario: (dati) => api('POST', '/admin/itinerari', { corpo: dati }),
  modificaItinerario: (id, dati) => api('PUT', `/admin/itinerari/${id}`, { corpo: dati }),
  eliminaItinerario: (id) => api('DELETE', `/admin/itinerari/${id}`),
  creaTradizione: (dati) => api('POST', '/admin/tradizioni', { corpo: dati }),
  modificaTradizione: (id, dati) => api('PUT', `/admin/tradizioni/${id}`, { corpo: dati }),
  eliminaTradizione: (id) => api('DELETE', `/admin/tradizioni/${id}`),
  getUtenti: (q) => api('GET', `/admin/utenti${parametri({ q })}`),
  cambiaRuolo: (id, ruolo) => api('PUT', `/admin/utenti/${id}/ruolo`, { corpo: { ruolo } }),
}

// ---------- Sviluppo ----------
export const getStato = () => api('GET', '/stato')
export const getPostaDiProva = () => api('GET', '/dev/posta')
