import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ErroreCaricamento from '../components/ErroreCaricamento.jsx'
import Icona from '../components/Icona.jsx'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import { creaItinerarioSuMisura, getItinerari, getItinerario } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { CENTRO_TRENTO, distanzaMetri, formattaDistanza, lunghezzaPercorso } from '../lib/geo.js'
import { usePreferiti } from '../lib/preferiti.js'
import { useSchermoLargo } from '../lib/schermo.js'
import { useSessione } from '../lib/sessione.jsx'

const ALTRI_ITINERARI = 3

/** Link al servizio di mappe esterno, a piedi verso la tappa (UC-02 7a) */
const comeArrivare = ([lat, lng]) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`

/** Legge i parametri dell'itinerario su misura dall'URL: ?minuti=60&da=46.067,11.121&tema=arte */
function richiestaSuMisura(params) {
  const [lat, lng] = (params.get('da') ?? '').split(',').map(Number)
  return {
    minuti: Number(params.get('minuti')) || 60,
    partenza: Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : CENTRO_TRENTO,
    tema: params.get('tema') || undefined,
  }
}

// S-06 Itinerario (RF-07, RF-08): percorso sulla mappa, tappe numerate e "Prossima tappa".
// La tappa attuale sta nell'URL (?tappa=2): il link si può condividere e "indietro" la ritrova.
// Da 1024 px la mappa resta fissa a sinistra e le tappe scorrono a destra.
// Lo stesso schermo mostra l'itinerario su misura (/itinerari/su-misura?minuti=…&da=…).
export default function Itinerario() {
  const { id } = useParams()
  const suMisura = id === 'su-misura'
  const { t, lingua } = useT()
  const navigate = useNavigate()
  const [itinerario, setItinerario] = useState(undefined)
  const [errore, setErrore] = useState(null)
  const [tentativo, setTentativo] = useState(0)
  const [finito, setFinito] = useState(false)
  const [params, setParams] = useSearchParams()
  // Su telefono i comandi delle tappe stanno in una barra fissa sopra la navigazione:
  // chi cammina passa alla tappa successiva senza dover scorrere la pagina
  const largo = useSchermoLargo()
  const [vista, setVista] = useState(null)
  const { utente } = useSessione()
  const { salvato, alterna } = usePreferiti()
  const chiaveRichiesta = suMisura ? `${params.get('minuti')}|${params.get('da')}|${params.get('tema')}` : id

  useEffect(() => {
    window.scrollTo(0, 0)
    let attivo = true
    setErrore(null)
    setFinito(false)
    const richiesta = suMisura ? creaItinerarioSuMisura(richiestaSuMisura(params)) : getItinerario(id)
    richiesta.then(
      (it) => {
        if (!attivo) return
        setItinerario(it)
        setVista(null)
      },
      (err) => {
        if (!attivo) return
        if (err.stato === 404) setItinerario(null)
        else setErrore(err)
      },
    )
    return () => {
      attivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- i parametri contano solo tramite chiaveRichiesta
  }, [chiaveRichiesta, tentativo, lingua])

  const totaleTappe = itinerario?.tappe.length ?? 1
  const attuale = Math.min(Math.max((Number(params.get('tappa')) || 1) - 1, 0), Math.max(totaleTappe - 1, 0))

  const punti = useMemo(() => itinerario?.tappe.map((p) => p.posizione) ?? [], [itinerario])
  // L'itinerario su misura parte dal punto scelto: la linea comincia da lì
  const percorso = useMemo(() => (itinerario?.partenza ? [itinerario.partenza, ...punti] : punti), [itinerario, punti])
  const vistaIniziale = useMemo(() => ({ centro: punti[0] ?? CENTRO_TRENTO, zoom: 16 }), [punti])

  const segnaposti = useMemo(
    () =>
      itinerario?.tappe.map((p, i) => ({
        id: String(i),
        posizione: p.posizione,
        titolo: `${i + 1}. ${p.nome}`,
        etichetta: i + 1,
        tipo: 'tappa',
        attivo: i === attuale,
      })) ?? [],
    [itinerario, attuale],
  )

  if (errore) {
    return (
      <div className="pagina pagina--centrata">
        <ErroreCaricamento errore={errore} onRiprova={() => setTentativo((n) => n + 1)} />
        <Link className="collegamento" to="/itinerari">{t('itinerari.titolo')}</Link>
      </div>
    )
  }
  if (itinerario === undefined) return <div className="pagina" aria-busy="true" />
  if (itinerario === null || itinerario.tappe.length === 0) {
    return (
      <div className="pagina pagina--centrata">
        <Icona nome="itinerari" size={40} />
        <p>{suMisura ? t('suMisura.impossibile') : t('itinerario.nonTrovato')}</p>
        <Link className="pulsante pulsante--primario" to="/itinerari">
          {t('itinerari.titolo')}
        </Link>
      </div>
    )
  }

  const tappa = itinerario.tappe[attuale]
  const totale = itinerario.tappe.length
  const ultima = attuale === totale - 1
  const titolo = suMisura ? t('suMisura.risultato') : itinerario.titolo
  const vaiA = (i) => {
    setFinito(false)
    setParams(
      (p) => {
        const nuovi = new URLSearchParams(p)
        nuovi.set('tappa', String(i + 1))
        return nuovi
      },
      { replace: true },
    )
    setVista({ centro: itinerario.tappe[i].posizione, zoom: 17 })
  }

  const comandi = (
    <>
      <button
        type="button"
        className="pulsante pulsante--icona"
        aria-label={t('itinerario.precedente')}
        title={t('itinerario.precedente')}
        disabled={attuale === 0}
        onClick={() => vaiA(attuale - 1)}
      >
        <Icona nome="precedente" size={20} />
      </button>
      {ultima ? (
        // UC-02 passo 8: all'ultima tappa si conclude il percorso
        <button type="button" className="pulsante pulsante--primario" disabled={finito} onClick={() => setFinito(true)}>
          <Icona nome="fine" size={18} />
          {t('itinerario.concludi')}
        </button>
      ) : (
        <button type="button" className="pulsante pulsante--primario" onClick={() => vaiA(attuale + 1)}>
          {t('itinerario.prossima')}
          <Icona nome="avanti" size={18} />
        </button>
      )}
    </>
  )
  return (
    <div className="pagina-itinerario">
      <div className="pagina-itinerario__mappa">
        <Link className="pulsante-tondo pulsante-tondo--su-mappa" aria-label={t('itinerari.titolo')} title={t('itinerari.titolo')} to="/itinerari">
          <Icona nome="indietro" />
        </Link>
        <MappaLeaflet
          etichetta={titolo}
          vista={vista ?? vistaIniziale}
          segnaposti={segnaposti}
          percorso={percorso}
          inquadra={percorso}
          posizioneUtente={itinerario.partenza ?? null}
          onClickSegnaposto={(i) => vaiA(Number(i))}
        />
      </div>

      <div className="pagina pagina-itinerario__corpo">
        <header className="intestazione-pagina">
          <h1>{titolo}</h1>
          <p>
            {suMisura
              ? t(itinerario.tema ? 'suMisura.descrizioneTema' : 'suMisura.descrizione', {
                  tappe: totale,
                  tema: itinerario.tema ? t(`tema.${itinerario.tema}`) : '',
                })
              : itinerario.descrizione}
          </p>
          <p className="scheda__meta">
            <Icona nome="orologio" size={16} />
            <span>
              {t('itinerari.durata', { n: itinerario.durata_minuti })} ·{' '}
              {t('itinerario.km', { d: formattaDistanza(lunghezzaPercorso(percorso), lingua) })}
            </span>
          </p>
          {suMisura ? (
            <Link className="pulsante" to="/itinerari">
              <Icona nome="suMisura" size={18} />
              {t('suMisura.cambia')}
            </Link>
          ) : (
            <button
              type="button"
              className="pulsante"
              aria-pressed={salvato('itinerario', itinerario.id)}
              onClick={() => (utente ? alterna('itinerario', itinerario.id).catch(() => {}) : navigate(`/accesso?da=${encodeURIComponent(`/itinerari/${itinerario.id}`)}`))}
            >
              <Icona nome="salva" size={18} />
              {salvato('itinerario', itinerario.id) ? t('scheda.salvato') : t('scheda.salva')}
            </button>
          )}
        </header>

        {/* UC-02 E1: le tappe il cui luogo è stato eliminato si saltano, e lo si dice */}
        {itinerario.tappe_rimosse?.length > 0 && (
          <p className="messaggio messaggio--attenzione" role="note">
            <Icona nome="attenzione" size={18} />
            <span>
              {t(itinerario.tappe_rimosse.length === 1 ? 'itinerario.tappaRimossa' : 'itinerario.tappeRimosse', {
                nomi: itinerario.tappe_rimosse.map((r) => r.nome).join(', '),
              })}
            </span>
          </p>
        )}

        {finito ? (
          <FineItinerario itinerario={itinerario} onRicomincia={() => vaiA(0)} />
        ) : (
          <section className="tappa-attuale" aria-live="polite">
            <p className="etichetta-sezione">{t('itinerario.tappa', { i: attuale + 1, n: totale })}</p>
            <h2>{tappa.nome}</h2>
            <p>{tappa.sintesi}</p>
            <div className="tappa-attuale__collegamenti">
              <Link className="collegamento" to={`/poi/${tappa.id}`}>
                {t('itinerario.apri')}
                <Icona nome="avanti" size={16} />
              </Link>
              <a className="collegamento" href={comeArrivare(tappa.posizione)} target="_blank" rel="noreferrer">
                <Icona nome="piedi" size={16} />
                {t('scheda.arrivare')}
              </a>
            </div>
            {largo && <div className="tappa-attuale__comandi">{comandi}</div>}
          </section>
        )}

        <h2 className="etichetta-sezione">{t('itinerario.percorso')}</h2>
        <ol className="tappe">
          {itinerario.tappe.map((p, i) => (
            <li key={p.id + i}>
              <button type="button" className="tappe__voce" aria-current={i === attuale && !finito ? 'step' : undefined} onClick={() => vaiA(i)}>
                <span className="tappe__numero">{i + 1}</span>
                <span className="tappe__testo">
                  <strong>{p.nome}</strong>
                  <small>{t(`categoria.${p.categoria}`)}</small>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      {/* Fuori dal riquadro della tappa: la sua animazione d'ingresso renderebbe "fixed" relativo al riquadro */}
      {!largo && !finito && (
        <div className="barra-tappe">
          <span className="barra-tappe__stato numero" aria-hidden="true">
            {attuale + 1}/{totale}
          </span>
          {comandi}
        </div>
      )}
    </div>
  )
}

/**
 * UC-02 passo 8: fine dell'itinerario. Propone gli itinerari che cominciano più vicino
 * al punto in cui ci si trova (l'ultima tappa).
 */
function FineItinerario({ itinerario, onRicomincia }) {
  const { t, lingua } = useT()
  const [altri, setAltri] = useState(null)
  const arrivo = itinerario.tappe.at(-1).posizione

  useEffect(() => {
    getItinerari().then(
      (tutti) =>
        setAltri(
          tutti
            .filter((it) => it.id !== itinerario.id && it.tappe.length > 0)
            .map((it) => ({ ...it, distanza: Math.min(...it.tappe.map((p) => distanzaMetri(arrivo, p.posizione))) }))
            .sort((a, b) => a.distanza - b.distanza)
            .slice(0, ALTRI_ITINERARI),
        ),
      () => setAltri([]),
    )
  }, [itinerario.id, arrivo, lingua])

  return (
    <section className="fine-itinerario" aria-live="polite">
      <Icona nome="fine" size={36} />
      <h2>{t('itinerario.finito')}</h2>
      <p>{t('itinerario.finitoTesto', { n: itinerario.tappe.length })}</p>
      {altri?.length > 0 && (
        <>
          <h3 className="etichetta-sezione">{t('itinerario.altriVicini')}</h3>
          <ul className="elenco-collegamenti">
            {altri.map((it) => (
              <li key={it.id}>
                <Link to={`/itinerari/${it.id}`} className="riga-link">
                  <Icona nome="itinerari" size={20} />
                  <span>{it.titolo}</span>
                  <small className="numero">
                    {t('itinerari.durata', { n: it.durata_minuti })} · {t('itinerario.distaDaQui', { d: formattaDistanza(it.distanza, lingua) })}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="riga-pulsanti">
        <Link className="pulsante pulsante--primario" to="/itinerari">
          {t('itinerario.tuttiGliItinerari')}
        </Link>
        <button type="button" className="pulsante" onClick={onRicomincia}>
          {t('itinerario.ricomincia')}
        </button>
      </div>
    </section>
  )
}
