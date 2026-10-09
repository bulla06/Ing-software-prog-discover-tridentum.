import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icona from '../components/Icona.jsx'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import { getClassifica, nuovaPartita, salvaPunteggio, verificaRisposta } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { messaggioErrore } from '../lib/errori.js'
import { CENTRO_TRENTO, PUNTEGGIO_MAX, formattaDistanza } from '../lib/geo.js'
import { urlFoto } from '../lib/http.js'
import { leggi, scrivi } from '../lib/memoria.js'
import { useSessione } from '../lib/sessione.jsx'

const VISTA_GIOCO = { centro: CENTRO_TRENTO, zoom: 15 }
const CHIAVE_PARTITA = 'tridentum:partita'
const CHIAVE_DA_SALVARE = 'tridentum:punteggio-da-salvare'

// La partita in corso resta nella sessione del browser: aprendo la scheda di un luogo
// il gioco va in pausa e riprende al ritorno (UC-06 4a)
const leggiSessione = (chiave) => {
  try {
    return JSON.parse(sessionStorage.getItem(chiave))
  } catch {
    return null
  }
}
const scriviSessione = (chiave, valore) => {
  try {
    if (valore == null) sessionStorage.removeItem(chiave)
    else sessionStorage.setItem(chiave, JSON.stringify(valore))
  } catch {
    // senza sessionStorage la partita non sopravvive alla navigazione
  }
}

const PARTITA_VUOTA = { fase: 'intro', partita: null, livelli: [], indice: 0, ipotesi: null, risultati: [] }

// S-10 Dov'era? (UC-06, RF-21…RF-23)
export default function Gioco() {
  const { t, lingua } = useT()
  const { utente } = useSessione()
  const [stato, setStato] = useState(() => leggiSessione(CHIAVE_PARTITA) ?? PARTITA_VUOTA)
  const [vista, setVista] = useState(VISTA_GIOCO)
  const [errore, setErrore] = useState(null)
  const [occupato, setOccupato] = useState(false)
  const [classifica, setClassifica] = useState(null)
  const [salvataggio, setSalvataggio] = useState(null) // esito del salvataggio del punteggio
  const [recordLocale, setRecordLocale] = useState(() => leggi('record-gioco', 0))
  const salvataggioAvviato = useRef(false)

  const { fase, livelli, indice, ipotesi, risultati } = stato
  const livello = livelli[indice]
  const risultato = risultati[indice]
  const confermato = Boolean(risultato)
  const totale = risultati.reduce((s, r) => s + r.punti, 0)

  useEffect(() => {
    scriviSessione(CHIAVE_PARTITA, fase === 'intro' ? null : stato)
  }, [stato, fase])

  useEffect(() => {
    if (fase === 'intro' || fase === 'fine') getClassifica().then(setClassifica, () => {})
  }, [fase, utente, salvataggio])

  // RF-22: chi finisce la partita senza account può accedere e il punteggio si salva al ritorno
  useEffect(() => {
    const daSalvare = leggiSessione(CHIAVE_DA_SALVARE)
    if (!utente || !daSalvare || salvataggioAvviato.current) return
    salvataggioAvviato.current = true
    scriviSessione(CHIAVE_DA_SALVARE, null)
    salvaPunteggio(daSalvare.partita, daSalvare.risposte).then(setSalvataggio, (err) => setErrore(messaggioErrore(t, err)))
  }, [utente, t])

  const aggiorna = (modifiche) => setStato((s) => ({ ...s, ...modifiche }))

  const inizia = async () => {
    setErrore(null)
    setSalvataggio(null)
    salvataggioAvviato.current = false
    try {
      const { partita, livelli: nuovi } = await nuovaPartita()
      setStato({ ...PARTITA_VUOTA, fase: 'gioca', partita, livelli: nuovi })
      setVista({ ...VISTA_GIOCO })
    } catch (err) {
      setErrore(messaggioErrore(t, err))
    }
  }

  const conferma = async () => {
    setOccupato(true)
    try {
      const esito = await verificaRisposta(stato.partita, indice, ipotesi)
      aggiorna({ risultati: [...risultati, { ...esito, ipotesi }] })
    } catch (err) {
      setErrore(messaggioErrore(t, err))
    } finally {
      setOccupato(false)
    }
  }

  const avanti = async () => {
    if (indice < livelli.length - 1) {
      aggiorna({ indice: indice + 1, ipotesi: null })
      setVista({ ...VISTA_GIOCO })
      return
    }
    // Fine partita
    const risposte = risultati.map((r) => r.ipotesi)
    if (totale > recordLocale) {
      setRecordLocale(totale)
      scrivi('record-gioco', totale)
    }
    if (utente) {
      salvataggioAvviato.current = true
      salvaPunteggio(stato.partita, risposte).then(setSalvataggio, (err) => setErrore(messaggioErrore(t, err)))
    } else {
      scriviSessione(CHIAVE_DA_SALVARE, { partita: stato.partita, risposte })
    }
    aggiorna({ fase: 'fine' })
  }

  const segnaposti = useMemo(() => {
    const s = []
    if (ipotesi) s.push({ id: 'ipotesi', posizione: ipotesi, tipo: 'ipotesi' })
    if (risultato?.poi) s.push({ id: 'esatto', posizione: risultato.poi.posizione, tipo: 'esatto', titolo: risultato.poi.nome })
    return s
  }, [ipotesi, risultato])

  const inquadra = useMemo(() => (risultato?.poi ? [ipotesi, risultato.poi.posizione] : null), [risultato, ipotesi])

  if (fase === 'intro') {
    return (
      <div className="pagina gioco-intro">
        <div className="pagina--centrata gioco-intro__testa">
          <Icona nome="gioco" size={48} />
          <h1>{t('gioco.titolo')}</h1>
          <p>{t('gioco.intro')}</p>
          {(classifica?.mia?.record ?? recordLocale) > 0 && (
            <p className="gioco-record">{t('gioco.record', { n: classifica?.mia?.record ?? recordLocale })}</p>
          )}
          <button type="button" className="pulsante pulsante--primario pulsante--largo" onClick={inizia}>
            {t('gioco.inizia')}
          </button>
          {errore && <p className="messaggio messaggio--errore" role="alert">{errore}</p>}
          <p className="nota">
            <Icona nome="info" size={16} />
            {t('gioco.fotoInArrivo')}
          </p>
        </div>
        <Classifica classifica={classifica} />
      </div>
    )
  }

  if (fase === 'fine') {
    return (
      <div className="pagina gioco-fine">
        <header className="intestazione-pagina">
          <h1>{t('gioco.totale')}</h1>
          <p className="gioco-fine__totale">
            <strong>{totale.toLocaleString(lingua)}</strong> / {(PUNTEGGIO_MAX * risultati.length).toLocaleString(lingua)}
          </p>
          {salvataggio && <p className="gioco-record">{t('gioco.salvato', { posizione: salvataggio.posizione })}</p>}
          {!utente && (
            <div className="messaggio messaggio--ok">
              <p>{t('gioco.accediPerSalvare')}</p>
              <Link className="pulsante pulsante--primario" to={`/accesso?da=${encodeURIComponent('/gioco')}`}>
                {t('accesso.accedi')}
              </Link>
            </div>
          )}
          {errore && <p className="messaggio messaggio--errore" role="alert">{errore}</p>}
        </header>
        <ol className="esiti">
          {risultati.map(({ poi, metri, punti }, i) => (
            <li key={i}>
              <span>
                <strong>{poi?.nome ?? '—'}</strong>
                {metri != null && <small>{t('gioco.esito', { d: formattaDistanza(metri, lingua) })}</small>}
              </span>
              <span className="esiti__punti">{t('gioco.punti', { n: punti })}</span>
              {poi && (
                <Link to={`/poi/${poi.id}`} className="collegamento">
                  {t('gioco.scopri')}
                </Link>
              )}
            </li>
          ))}
        </ol>
        <button type="button" className="pulsante pulsante--primario pulsante--largo" onClick={inizia}>
          {t('gioco.rigioca')}
        </button>
        <Classifica classifica={classifica} />
      </div>
    )
  }

  return (
    <div className="pagina-gioco">
      <section className="indizio" aria-live="polite">
        <p className="etichetta-sezione">
          {t('gioco.round', { i: indice + 1, n: livelli.length })}
          {livello.anno && ` · ${livello.anno}`}
        </p>
        {livello.foto ? (
          <figure className="indizio__foto">
            <img src={urlFoto(livello.foto, 'mini')} alt={t('gioco.fotoStorica')} />
            <figcaption>{t('gioco.fotoStorica')}</figcaption>
          </figure>
        ) : (
          <p className="indizio__testo">{livello.indizio}</p>
        )}
      </section>

      <div className="pagina-gioco__mappa">
        <MappaLeaflet
          etichetta={t('gioco.tocca')}
          vista={vista}
          segnaposti={segnaposti}
          percorso={risultato?.poi ? [ipotesi, risultato.poi.posizione] : null}
          inquadra={inquadra}
          onClickMappa={(punto) => !confermato && aggiorna({ ipotesi: punto })}
        />
      </div>

      <div className="pannello-gioco">
        {errore && <p className="messaggio messaggio--errore" role="alert">{errore}</p>}
        {confermato ? (
          <>
            <p>
              <strong>{risultato.poi?.nome}</strong>
              {risultato.metri != null && ` — ${t('gioco.esito', { d: formattaDistanza(risultato.metri, lingua) })}`}
            </p>
            <p className="pannello-gioco__punti">{t('gioco.punti', { n: risultato.punti })}</p>
            <div className="riga-pulsanti riga-pulsanti--larga">
              {risultato.poi && (
                <Link className="pulsante" to={`/poi/${risultato.poi.id}`}>
                  {t('gioco.scopri')}
                </Link>
              )}
              <button type="button" className="pulsante pulsante--primario" onClick={avanti}>
                {indice < livelli.length - 1 ? t('gioco.prossimo') : t('gioco.risultati')}
              </button>
            </div>
          </>
        ) : (
          <>
            {!ipotesi && <p className="pannello-gioco__aiuto">{t('gioco.tocca')}</p>}
            <button type="button" className="pulsante pulsante--primario pulsante--largo" disabled={!ipotesi || occupato} onClick={conferma}>
              {t('gioco.conferma')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Classifica({ classifica }) {
  const { t, lingua } = useT()
  if (!classifica) return null
  return (
    <section className="classifica">
      <h2>{t('gioco.classificaTitolo')}</h2>
      {classifica.classifica.length === 0 ? (
        <p className="vuoto">{t('gioco.classificaVuota')}</p>
      ) : (
        <ol>
          {classifica.classifica.map((r, i) => (
            <li key={i}>
              <span className="classifica__posizione">{i + 1}</span>
              <span>{r.nome}</span>
              <strong>{r.record.toLocaleString(lingua)}</strong>
            </li>
          ))}
        </ol>
      )}
      {classifica.mia?.posizione && (
        <p className="nota">{t('gioco.tuaPosizione', { posizione: classifica.mia.posizione, n: classifica.mia.record })}</p>
      )}
    </section>
  )
}
