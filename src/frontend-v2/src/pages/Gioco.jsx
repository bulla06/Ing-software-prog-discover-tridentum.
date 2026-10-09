import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Finestra from '../components/Finestra.jsx'
import Icona from '../components/Icona.jsx'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import { getClassifica, nuovaPartita, salvaPunteggio, verificaRisposta } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { messaggioErrore } from '../lib/errori.js'
import { CENTRO_TRENTO, PUNTEGGIO_MAX, formattaDistanza } from '../lib/geo.js'
import { leggi, scrivi } from '../lib/memoria.js'
import { useSessione } from '../lib/sessione.jsx'

const VISTA_GIOCO = { centro: CENTRO_TRENTO, zoom: 14 }
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

// S-10 Dov'era? (UC-06, RF-21…RF-23), in stile GeoGuessr: una foto storica, una mappa,
// un segnaposto. Più ci si avvicina al punto in cui è stata scattata, più punti si fanno.
// RF-21 è un requisito Could: il gioco è l'ultimo blocco del piano (Fase 4 §2.3).
export default function Gioco() {
  const { t } = useT()
  const { utente } = useSessione()
  const [stato, setStato] = useState(() => leggiSessione(CHIAVE_PARTITA) ?? PARTITA_VUOTA)
  const [errore, setErrore] = useState(null)
  const [occupato, setOccupato] = useState(false)
  const [classifica, setClassifica] = useState(null)
  const [salvataggio, setSalvataggio] = useState(null) // esito del salvataggio del punteggio
  const [recordLocale, setRecordLocale] = useState(() => leggi('record-gioco', 0))
  const salvataggioAvviato = useRef(false)

  const { fase, livelli, indice, risultati } = stato
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
    setOccupato(true)
    salvataggioAvviato.current = false
    try {
      const { partita, livelli: nuovi } = await nuovaPartita()
      setStato({ ...PARTITA_VUOTA, fase: 'gioca', partita, livelli: nuovi })
    } catch (err) {
      setErrore(messaggioErrore(t, err))
    } finally {
      setOccupato(false)
    }
  }

  const conferma = async () => {
    setOccupato(true)
    setErrore(null)
    try {
      const esito = await verificaRisposta(stato.partita, indice, stato.ipotesi)
      aggiorna({ risultati: [...risultati, { ...esito, ipotesi: stato.ipotesi, foto_url: livelli[indice].foto_url, anno: livelli[indice].anno }] })
    } catch (err) {
      setErrore(messaggioErrore(t, err))
    } finally {
      setOccupato(false)
    }
  }

  const avanti = () => {
    if (indice < livelli.length - 1) {
      aggiorna({ indice: indice + 1, ipotesi: null })
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

  if (fase === 'intro') {
    return (
      <Introduzione
        record={classifica?.mia?.record ?? recordLocale}
        classifica={classifica}
        errore={errore}
        occupato={occupato}
        onInizia={inizia}
      />
    )
  }

  if (fase === 'fine') {
    return (
      <Riepilogo
        risultati={risultati}
        totale={totale}
        classifica={classifica}
        salvataggio={salvataggio}
        errore={errore}
        utente={utente}
        onRigioca={inizia}
      />
    )
  }

  return (
    <Livello
      // Chiave sull'indice: ogni foto riparte con la mappa nella vista iniziale
      key={indice}
      stato={stato}
      totale={totale}
      errore={errore}
      occupato={occupato}
      onIpotesi={(punto) => aggiorna({ ipotesi: punto })}
      onConferma={conferma}
      onAvanti={avanti}
    />
  )
}

function Introduzione({ record, classifica, errore, occupato, onInizia }) {
  const { t, lingua } = useT()
  return (
    <div className="pagina pagina--larga dovera-intro">
      <div className="dovera-intro__testa">
        <div className="dovera-intro__testo">
          <h1>{t('gioco.titolo')}</h1>
          <p className="dovera-intro__sottotitolo">{t('gioco.intro')}</p>
          <ol className="dovera-intro__passi">
            <li>
              <Icona nome="foto" size={22} />
              <span>{t('gioco.passo1')}</span>
            </li>
            <li>
              <Icona nome="luogo" size={22} />
              <span>{t('gioco.passo2')}</span>
            </li>
            <li>
              <Icona nome="record" size={22} />
              <span>{t('gioco.passo3')}</span>
            </li>
          </ol>
          <div className="dovera-intro__azioni">
            <button type="button" className="pulsante pulsante--primario pulsante--grande" onClick={onInizia} disabled={occupato}>
              {occupato ? t('gioco.caricamento') : t('gioco.inizia')}
            </button>
            {record > 0 && (
              <p className="gioco-record">
                <Icona nome="record" size={18} />
                {t('gioco.record', { n: record.toLocaleString(lingua) })}
              </p>
            )}
          </div>
          {errore && (
            <p className="messaggio messaggio--errore" role="alert">
              {errore}
            </p>
          )}
        </div>
        <figure className="dovera-intro__foto">
          <img src="./dovera-copertina.webp" alt={t('gioco.copertinaAlt')} width="720" height="1083" fetchPriority="high" />
          <figcaption>{t('gioco.copertinaCredito')}</figcaption>
        </figure>
      </div>
      <p className="nota">
        <Icona nome="info" size={16} />
        {t('gioco.fotoInArrivo')}
      </p>
      <Classifica classifica={classifica} />
    </div>
  )
}

function Livello({ stato, totale, errore, occupato, onIpotesi, onConferma, onAvanti }) {
  const { t, lingua } = useT()
  const { livelli, indice, ipotesi, risultati } = stato
  const livello = livelli[indice]
  const risultato = risultati[indice]
  const confermato = Boolean(risultato)
  const [ingrandita, setIngrandita] = useState(false)
  const mappa = useRef(null)

  const segnaposti = useMemo(() => {
    const s = []
    if (ipotesi) s.push({ id: 'ipotesi', posizione: ipotesi, tipo: 'ipotesi' })
    if (risultato?.poi) s.push({ id: 'esatto', posizione: risultato.poi.posizione, tipo: 'esatto', titolo: risultato.poi.nome })
    return s
  }, [ipotesi, risultato])

  const inquadra = useMemo(() => (risultato?.poi ? [ipotesi, risultato.poi.posizione] : null), [risultato, ipotesi])

  // Alternativa alla tastiera e al tocco preciso: si sposta la mappa e si segna il suo centro
  const segnaCentro = () => {
    const c = mappa.current?.getCenter()
    if (c) onIpotesi([c.lat, c.lng])
  }

  return (
    <div className={`dovera ${confermato ? 'dovera--esito' : ''}`}>
      <h1 className="nascosto">{t('gioco.titolo')}</h1>

      <section className="dovera__scena" aria-label={t('gioco.foto', { i: indice + 1, n: livelli.length })}>
        <figure className="dovera__foto">
          <img src={livello.foto_url} alt={t('gioco.fotoAlt', { i: indice + 1 })} />
        </figure>
        <div className="dovera__hud">
          <p className="dovera__contatore numero" aria-live="polite">
            {t('gioco.foto', { i: indice + 1, n: livelli.length })}
            {livello.anno && <span className="dovera__anno">{livello.anno}</span>}
          </p>
          <p className="dovera__parziale numero">{t('gioco.parziale', { n: totale.toLocaleString(lingua) })}</p>
        </div>
        <button type="button" className="pulsante-tondo dovera__ingrandisci" aria-label={t('gioco.ingrandisci')} title={t('gioco.ingrandisci')} onClick={() => setIngrandita(true)}>
          <Icona nome="ingrandisci" size={20} />
        </button>
      </section>

      <section className={`dovera__mappa ${ipotesi ? 'dovera__mappa--ipotesi' : ''}`} aria-label={t('gioco.mappaEtichetta')}>
        <div className="dovera__mappa-area">
          <MappaLeaflet
            etichetta={t('gioco.mappaEtichetta')}
            vista={VISTA_GIOCO}
            segnaposti={segnaposti}
            percorso={risultato?.poi ? [ipotesi, risultato.poi.posizione] : null}
            inquadra={inquadra}
            onPronta={(m) => (mappa.current = m)}
            onClickMappa={(punto) => !confermato && onIpotesi(punto)}
          />
          {!confermato && <span className="dovera__mirino" aria-hidden="true" />}
        </div>

        <div className="dovera__comandi">
          {errore && (
            <p className="messaggio messaggio--errore" role="alert">
              {errore}
            </p>
          )}
          {confermato ? (
            <Esito risultato={risultato} ultimo={indice === livelli.length - 1} onAvanti={onAvanti} />
          ) : (
            <>
              <p className="dovera__aiuto">{ipotesi ? t('gioco.spostaPerCorreggere') : t('gioco.tocca')}</p>
              <div className="riga-pulsanti">
                <button type="button" className="pulsante" onClick={segnaCentro}>
                  <Icona nome="posizione" size={18} />
                  {t('gioco.segnaCentro')}
                </button>
                <button type="button" className="pulsante pulsante--primario" disabled={!ipotesi || occupato} onClick={onConferma}>
                  {occupato ? t('gioco.verifica') : t('gioco.conferma')}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <Finestra titolo={t('gioco.foto', { i: indice + 1, n: livelli.length })} aperta={ingrandita} onChiudi={() => setIngrandita(false)}>
        <img className="dovera__foto-grande" src={livello.foto_url} alt={t('gioco.fotoAlt', { i: indice + 1 })} />
      </Finestra>
    </div>
  )
}

function Esito({ risultato, ultimo, onAvanti }) {
  const { t, lingua } = useT()
  const { poi, metri, punti, credito } = risultato
  return (
    <div className="esito" aria-live="polite">
      <p className="esito__punti numero">
        <strong>{punti.toLocaleString(lingua)}</strong>
        <span>{t('gioco.puntiSu', { n: PUNTEGGIO_MAX.toLocaleString(lingua) })}</span>
      </p>
      <p className="esito__luogo">
        <strong>{poi?.nome ?? t('gioco.luogoRimosso')}</strong>
        {metri != null && <span className="numero">{t('gioco.esito', { d: formattaDistanza(metri, lingua) })}</span>}
      </p>
      {credito && (
        <p className="esito__credito">
          {t('gioco.credito', { autore: credito.autore, licenza: credito.licenza })}
          {credito.fonte && (
            <>
              {' · '}
              <a href={credito.fonte} target="_blank" rel="noreferrer">
                {t('gioco.fonte')}
              </a>
            </>
          )}
        </p>
      )}
      <div className="riga-pulsanti">
        {poi && (
          <Link className="pulsante" to={`/poi/${poi.id}`}>
            {t('gioco.scopri')}
          </Link>
        )}
        <button type="button" className="pulsante pulsante--primario" onClick={onAvanti}>
          {ultimo ? t('gioco.risultati') : t('gioco.prossimo')}
          <Icona nome="avanti" size={16} peso="bold" />
        </button>
      </div>
    </div>
  )
}

function Riepilogo({ risultati, totale, classifica, salvataggio, errore, utente, onRigioca }) {
  const { t, lingua } = useT()
  return (
    <div className="pagina pagina--larga dovera-fine">
      <header className="dovera-fine__testa">
        <h1>{t('gioco.totale')}</h1>
        <p className="dovera-fine__totale numero">
          <strong>{totale.toLocaleString(lingua)}</strong>
          <span>/ {(PUNTEGGIO_MAX * risultati.length).toLocaleString(lingua)}</span>
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
        {errore && (
          <p className="messaggio messaggio--errore" role="alert">
            {errore}
          </p>
        )}
      </header>

      <ol className="dovera-fine__foto">
        {risultati.map(({ poi, metri, punti, foto_url, anno }, i) => (
          <li key={i} style={{ '--i': i }}>
            <img src={foto_url} alt={t('gioco.fotoAlt', { i: i + 1 })} width="320" height="220" loading="lazy" />
            <div className="dovera-fine__dati">
              <strong>{poi?.nome ?? t('gioco.luogoRimosso')}</strong>
              <small className="numero">
                {anno}
                {metri != null && ` · ${formattaDistanza(metri, lingua)}`}
              </small>
              <span className="dovera-fine__punti numero">{t('gioco.punti', { n: punti.toLocaleString(lingua) })}</span>
              {poi && (
                <Link to={`/poi/${poi.id}`} className="collegamento">
                  {t('gioco.scopri')}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      <button type="button" className="pulsante pulsante--primario pulsante--grande" onClick={onRigioca}>
        {t('gioco.rigioca')}
      </button>
      <Classifica classifica={classifica} />
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
              <span className="classifica__posizione numero">{i + 1}</span>
              <span>{r.nome}</span>
              <strong className="numero">{r.record.toLocaleString(lingua)}</strong>
            </li>
          ))}
        </ol>
      )}
      {classifica.mia?.posizione && (
        <p className="nota">{t('gioco.tuaPosizione', { posizione: classifica.mia.posizione, n: classifica.mia.record.toLocaleString(lingua) })}</p>
      )}
    </section>
  )
}
