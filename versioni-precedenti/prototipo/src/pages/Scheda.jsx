import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Avviso from '../components/Avviso.jsx'
import Copertina from '../components/Copertina.jsx'
import Icona from '../components/Icona.jsx'
import { getItinerariConPoi, getPoi, getPoiById } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { distanzaMetri, formattaDistanza } from '../lib/geo.js'
import { usePosizione } from '../lib/posizione.jsx'
import { usePreferiti } from '../lib/preferiti.js'

const NUMERO_VICINI = 3

// S-03 Scheda POI (RF-02, RF-03): il centro dell'app, raggiungibile da ogni sezione.
export default function Scheda() {
  const { id } = useParams()
  const { t, lingua } = useT()
  const navigate = useNavigate()
  const { stato, origine } = usePosizione()
  const { salvato, alterna } = usePreferiti()

  const [poi, setPoi] = useState(undefined)
  const [vicini, setVicini] = useState([])
  const [itinerari, setItinerari] = useState([])
  const [avviso, setAvviso] = useState(null)
  const chiudiAvviso = useCallback(() => setAvviso(null), [])

  useEffect(() => {
    window.scrollTo(0, 0)
    let attivo = true
    Promise.all([getPoiById(id), getPoi(), getItinerariConPoi(id)]).then(([trovato, tutti, its]) => {
      if (!attivo) return
      setPoi(trovato)
      setItinerari(its)
      if (trovato) {
        setVicini(
          tutti
            .filter((p) => p.id !== trovato.id)
            .map((p) => ({ poi: p, distanza: distanzaMetri(trovato.posizione, p.posizione) }))
            .sort((a, b) => a.distanza - b.distanza)
            .slice(0, NUMERO_VICINI),
        )
      }
    })
    return () => {
      attivo = false
    }
  }, [id])

  const indietro = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))

  if (poi === undefined) return <div className="pagina" aria-busy="true" />

  if (poi === null) {
    return (
      <div className="pagina pagina--centrata">
        <p>{t('scheda.nonTrovato')}</p>
        <Link className="pulsante pulsante--primario" to="/">
          {t('scheda.tornaMappa')}
        </Link>
      </div>
    )
  }

  const [lat, lng] = poi.posizione
  const comeArrivare = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`
  const distanza = distanzaMetri(origine, poi.posizione)
  const eSalvato = salvato(poi.id)

  return (
    <article className="scheda">
      <div className="scheda__testata">
        <button type="button" className="pulsante-tondo pulsante-tondo--su-copertina" aria-label={t('scheda.indietro')} onClick={indietro}>
          <Icona nome="indietro" />
        </button>
        <Copertina poi={poi} />
      </div>

      <div className="pagina scheda__corpo">
        <header className="scheda__intestazione">
          <h1>{poi.nome}</h1>
          <p className="scheda__sintesi">{poi.sintesi}</p>
          <p className="scheda__meta">
            <Icona nome="posizione" size={16} />
            <span>
              {poi.indirizzo} ·{' '}
              {t(stato === 'ok' ? 'mappa.daTe' : 'mappa.daDuomo', { d: formattaDistanza(distanza, lingua) })}
            </span>
          </p>
          <ul className="etichette">
            {poi.temi.map((tm) => (
              <li key={tm}>
                <Link className="chip chip--piccolo" to={`/?tema=${tm}`}>
                  {t(`tema.${tm}`)}
                </Link>
              </li>
            ))}
          </ul>
        </header>

        <div className="azioni">
          <button type="button" className="azione" aria-pressed={eSalvato} onClick={() => alterna(poi.id)}>
            <Icona nome="salva" />
            {eSalvato ? t('scheda.salvato') : t('scheda.salva')}
          </button>
          <a className="azione" href={comeArrivare} target="_blank" rel="noreferrer">
            <Icona nome="esterno" />
            {t('scheda.arrivare')}
          </a>
          <button type="button" className="azione" onClick={() => setAvviso(t('scheda.serveAccount'))}>
            <Icona nome="ricordo" />
            {t('scheda.ricordo')}
          </button>
        </div>

        {poi.affresco && (
          <section className="riquadro riquadro--affresco">
            <h2>{t('scheda.affresco')}</h2>
            <dl>
              <dt>{t('scheda.autore')}</dt>
              <dd>{poi.affresco.autore}</dd>
              <dt>{t('scheda.epoca')}</dt>
              <dd>{poi.affresco.epoca}</dd>
            </dl>
          </section>
        )}

        <section className="testo">
          <h2>{t('scheda.storia')}</h2>
          {poi.descrizione.map((paragrafo, i) => (
            <p key={i}>{paragrafo}</p>
          ))}
          <dl className="dati">
            <dt>{t('scheda.indirizzo')}</dt>
            <dd>{poi.indirizzo}</dd>
            <dt>{t('scheda.epoca')}</dt>
            <dd>{poi.epoca}</dd>
          </dl>
        </section>

        <section>
          <h2>{t('scheda.fonti')}</h2>
          <ul className="fonti">
            {poi.fonti.map((f) => (
              <li key={f.url + f.titolo}>
                <a href={f.url} target="_blank" rel="noreferrer">
                  {f.titolo}
                  <Icona nome="esterno" size={14} />
                </a>
              </li>
            ))}
          </ul>
          <p className="nota">
            <Icona nome="info" size={16} />
            {t('scheda.bozza')}
          </p>
        </section>

        <section>
          <h2>{t('scheda.ricordi')}</h2>
          <div className="vuoto vuoto--riquadro">
            <p>{t('scheda.nessunRicordo')}</p>
          </div>
          <button type="button" className="collegamento" onClick={() => setAvviso(t('scheda.serveAccount'))}>
            <Icona nome="segnala" size={16} />
            {t('scheda.segnala')}
          </button>
        </section>

        {itinerari.length > 0 && (
          <section>
            <h2>{t('scheda.itinerari')}</h2>
            <ul className="elenco-semplice">
              {itinerari.map((it) => (
                <li key={it.id}>
                  <Link to={`/itinerari/${it.id}`} className="riga-link">
                    <Icona nome="itinerari" size={18} />
                    <span>{it.titolo}</span>
                    <small>{t('itinerari.durata', { n: it.durata_minuti })}</small>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2>{t('scheda.vicini')}</h2>
          <ul className="griglia-vicini">
            {vicini.map(({ poi: v, distanza: d }) => (
              <li key={v.id}>
                <Link to={`/poi/${v.id}`} className="scheda-mini">
                  <Copertina poi={v} compatta />
                  <strong>{v.nome}</strong>
                  <small>{formattaDistanza(d, lingua)}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Avviso testo={avviso} onChiudi={chiudiAvviso} />
    </article>
  )
}
