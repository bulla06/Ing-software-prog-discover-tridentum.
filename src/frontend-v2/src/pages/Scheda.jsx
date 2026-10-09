import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Avviso from '../components/Avviso.jsx'
import Copertina from '../components/Copertina.jsx'
import Icona from '../components/Icona.jsx'
import ModuloSegnalazione from '../components/ModuloSegnalazione.jsx'
import { getPoiById } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { distanzaMetri, formattaDistanza } from '../lib/geo.js'
import { urlFoto } from '../lib/http.js'
import { usePosizione } from '../lib/posizione.jsx'
import { usePreferiti } from '../lib/preferiti.js'
import { condividi, useSchermoLargo } from '../lib/schermo.js'
import { useSessione } from '../lib/sessione.jsx'

// S-03 Scheda POI (RF-02, RF-03, RF-15, RF-18): il centro dell'app, raggiungibile da ogni sezione.
//
// Da 1024 px: storia e ricordi a sinistra, informazioni pratiche e collegamenti in una colonna a destra.
// Su telefono una colonna sola, nell'ordine che serve a chi è davanti al luogo: cosa è, cosa fare
// (salva, come arrivare), le informazioni pratiche, la storia, i ricordi, dove andare dopo, le fonti.
// Quando la copertina esce dallo schermo compare una barra in alto con "indietro" e "condividi".
export default function Scheda() {
  const { id } = useParams()
  const { t, lingua } = useT()
  const navigate = useNavigate()
  const { stato, origine } = usePosizione()
  const { utente } = useSessione()
  const { salvato, alterna } = usePreferiti()
  const largo = useSchermoLargo()

  const [poi, setPoi] = useState(undefined)
  const [avviso, setAvviso] = useState(null)
  const [segnalazione, setSegnalazione] = useState(null)
  const [testataFuori, setTestataFuori] = useState(false)
  const testata = useRef(null)
  const chiudiAvviso = useCallback(() => setAvviso(null), [])

  useEffect(() => {
    window.scrollTo(0, 0)
    let attivo = true
    setPoi(undefined)
    getPoiById(id).then(
      (trovato) => attivo && setPoi(trovato),
      (err) => attivo && setPoi(err.stato === 404 ? null : 'errore'),
    )
    return () => {
      attivo = false
    }
  }, [id])

  // La barra in alto compare quando la copertina non si vede più (niente ascolto dello scroll)
  const caricato = poi && typeof poi === 'object'
  useEffect(() => {
    if (!caricato || !testata.current) return
    const osservatore = new IntersectionObserver(([voce]) => setTestataFuori(!voce.isIntersecting), { threshold: 0 })
    osservatore.observe(testata.current)
    return () => osservatore.disconnect()
  }, [caricato])

  const indietro = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))
  const vaiAdAccesso = () => navigate(`/accesso?da=${encodeURIComponent(`/poi/${id}`)}`)

  // Scheletro con la stessa forma della scheda, mentre i dati arrivano
  if (poi === undefined) {
    return (
      <div className="scheda" aria-busy="true">
        <div className="scheletro scheletro--testata" />
        <div className="scheda__griglia">
          <div>
            <div className="scheletro scheletro--titolo" />
            <div className="scheletro scheletro--riga" />
            <div className="scheletro scheletro--riga scheletro--corta" />
          </div>
        </div>
      </div>
    )
  }

  if (poi === null || poi === 'errore') {
    return (
      <div className="pagina pagina--centrata">
        <Icona nome="luogo" size={40} />
        <p>{poi === null ? t('scheda.nonTrovato') : t('errore.rete')}</p>
        <Link className="pulsante pulsante--primario" to="/">
          {t('scheda.tornaMappa')}
        </Link>
      </div>
    )
  }

  const [lat, lng] = poi.posizione
  const comeArrivare = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`
  const distanza = distanzaMetri(origine, poi.posizione)
  const eSalvato = salvato('poi', poi.id)

  const salva = async () => {
    if (!utente) return vaiAdAccesso()
    try {
      await alterna('poi', poi.id)
    } catch {
      setAvviso(t('comune.errore'))
    }
  }

  const condividiLuogo = async () => {
    const esito = await condividi({ titolo: poi.nome, testo: poi.sintesi, url: window.location.href })
    if (esito === 'copiato') setAvviso(t('scheda.linkCopiato'))
    if (esito === 'errore') setAvviso(t('comune.errore'))
  }

  const info = <InfoLuogo poi={poi} />
  const collegamenti = <Collegamenti poi={poi} />

  return (
    <article className="scheda">
      <div className="scheda__barra" data-visibile={testataFuori} aria-hidden={!testataFuori}>
        <button type="button" className="pulsante-tondo pulsante-tondo--piccolo" aria-label={t('scheda.indietro')} onClick={indietro} tabIndex={testataFuori ? 0 : -1}>
          <Icona nome="indietro" size={20} />
        </button>
        <p className="scheda__barra-titolo">{poi.nome}</p>
        <button type="button" className="pulsante-tondo pulsante-tondo--piccolo" aria-label={t('scheda.condividi')} onClick={condividiLuogo} tabIndex={testataFuori ? 0 : -1}>
          <Icona nome="condividi" size={20} />
        </button>
      </div>

      <div className="scheda__testata" ref={testata}>
        <Copertina poi={poi} prioritaria />
        <button type="button" className="pulsante-tondo pulsante-tondo--su-copertina" aria-label={t('scheda.indietro')} onClick={indietro}>
          <Icona nome="indietro" />
        </button>
        <button type="button" className="pulsante-tondo pulsante-tondo--su-copertina pulsante-tondo--destra" aria-label={t('scheda.condividi')} onClick={condividiLuogo}>
          <Icona nome="condividi" />
        </button>
      </div>

      <div className="scheda__griglia">
        <div className="scheda__principale">
          <header className="scheda__intestazione">
            <p className="etichetta-categoria" style={{ '--tinta': `var(--c-${poi.categoria})` }}>
              <Icona nome={poi.categoria} size={16} peso="bold" />
              {t(`categoria.${poi.categoria}`)}
              {poi.epoca && <span className="etichetta-categoria__epoca">{poi.epoca}</span>}
            </p>
            <h1>{poi.nome}</h1>
            <p className="scheda__sintesi">{poi.sintesi}</p>
            <p className="scheda__meta">
              <Icona nome="luogo" size={16} />
              <span>
                {poi.indirizzo} · {t(stato === 'ok' ? 'mappa.daTe' : 'mappa.daDuomo', { d: formattaDistanza(distanza, lingua) })}
              </span>
            </p>
          </header>

          <div className="azioni">
            <button type="button" className="azione" aria-pressed={eSalvato} onClick={salva} title={utente ? undefined : t('scheda.accediPerSalvare')}>
              <Icona nome="salva" peso={eSalvato ? 'fill' : 'regular'} />
              {eSalvato ? t('scheda.salvato') : t('scheda.salva')}
            </button>
            <a className="azione" href={comeArrivare} target="_blank" rel="noreferrer">
              <Icona nome="piedi" />
              {t('scheda.arrivare')}
            </a>
            <Link className="azione" to={`/poi/${poi.id}/ricordo`}>
              <Icona nome="ricordo" />
              {t('scheda.ricordoBreve')}
            </Link>
          </div>

          {!largo && info}

          <section className="testo">
            <h2>{t('scheda.storia')}</h2>
            {poi.descrizione.map((paragrafo, i) => (
              <p key={i}>{paragrafo}</p>
            ))}
          </section>

          <section>
            <h2>{t('scheda.ricordi')}</h2>
            {poi.ricordi.length === 0 ? (
              <div className="vuoto vuoto--riquadro">
                <Icona nome="ricordo" size={28} />
                <p>{t('scheda.nessunRicordo')}</p>
              </div>
            ) : (
              <ul className="ricordi">
                {poi.ricordi.map((r) => (
                  <li key={r.id} className="ricordo">
                    {r.foto && (
                      <a href={urlFoto(r.foto)} target="_blank" rel="noreferrer" className="ricordo__foto">
                        <img
                          src={urlFoto(r.foto, 'mini')}
                          alt={r.testo ? r.testo.slice(0, 80) : t('scheda.ricordi')}
                          width={r.larghezza}
                          height={r.altezza}
                          loading="lazy"
                        />
                      </a>
                    )}
                    {r.testo && <p className="ricordo__testo">{r.testo}</p>}
                    <p className="ricordo__meta">
                      {r.anno && <strong>{r.anno}</strong>}
                      {r.anno && ' · '}
                      {r.autore ? t('scheda.di', { autore: r.autore }) : t('scheda.anonimo')}
                      {' · '}
                      <abbr title={t(`licenza.${r.licenza}.spiega`)}>{t(`licenza.${r.licenza}.breve`)}</abbr>
                    </p>
                    <button type="button" className="collegamento collegamento--piccolo" onClick={() => setSegnalazione({ tipo: 'ricordo', id: r.id })}>
                      <Icona nome="segnala" size={14} />
                      {t('scheda.segnalaRicordo')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Link className="pulsante" to={`/poi/${poi.id}/ricordo`}>
              <Icona nome="ricordo" size={18} />
              {t('scheda.ricordo')}
            </Link>
          </section>

          {!largo && collegamenti}

          <section className="fonti">
            <h2>{t('scheda.fonti')}</h2>
            <ul>
              {poi.fonti.map((f) => (
                <li key={f.url + f.titolo}>
                  <a href={f.url} target="_blank" rel="noreferrer">
                    <span>{f.titolo}</span>
                    <Icona nome="esterno" size={16} />
                  </a>
                </li>
              ))}
            </ul>
            <p className="nota">
              <Icona nome="info" size={16} />
              {t('scheda.bozza')}
            </p>
            <button type="button" className="collegamento" onClick={() => setSegnalazione({ tipo: 'poi', id: poi.id })}>
              <Icona nome="segnala" size={16} />
              {t('scheda.segnala')}
            </button>
          </section>
        </div>

        {largo && (
          <aside className="scheda__laterale" aria-label={t('scheda.informazioni')}>
            {info}
            {collegamenti}
          </aside>
        )}
      </div>

      <ModuloSegnalazione
        bersaglio={segnalazione}
        onChiudi={() => setSegnalazione(null)}
        onInviata={() => {
          setSegnalazione(null)
          setAvviso(t('segnala.inviata'))
        }}
      />
      <Avviso testo={avviso} onChiudi={chiudiAvviso} />
    </article>
  )
}

/** Informazioni pratiche: piatto consigliato, affresco, indirizzo, epoca e temi */
function InfoLuogo({ poi }) {
  const { t } = useT()
  return (
    <div className="scheda__info">
      {poi.piatto_consigliato && (
        <section className="riquadro riquadro--gusto">
          <h2>
            <Icona nome="gastronomia" size={18} />
            {t('scheda.piatto')}
          </h2>
          <p className="riquadro__evidenza">{poi.piatto_consigliato}</p>
        </section>
      )}

      {poi.affresco && (
        <section className="riquadro riquadro--affresco">
          <h2>
            <Icona nome="arte" size={18} />
            {t('scheda.affresco')}
          </h2>
          <dl className="dati">
            <dt>{t('scheda.autore')}</dt>
            <dd>{poi.affresco.autore}</dd>
            <dt>{t('scheda.epoca')}</dt>
            <dd>{poi.affresco.epoca}</dd>
          </dl>
        </section>
      )}

      <section className="riquadro">
        <dl className="dati">
          <dt>{t('scheda.indirizzo')}</dt>
          <dd>{poi.indirizzo}</dd>
          {poi.epoca && (
            <>
              <dt>{t('scheda.epoca')}</dt>
              <dd>{poi.epoca}</dd>
            </>
          )}
        </dl>
        {poi.temi.length > 0 && (
          <ul className="etichette" aria-label={t('scheda.temi')}>
            {poi.temi.map((tm) => (
              <li key={tm}>
                <Link className="chip chip--piccolo" to={`/?tema=${tm}`}>
                  {t(`tema.${tm}`)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/** Dove andare dopo: tradizioni del luogo, itinerari che ci passano, luoghi vicini */
function Collegamenti({ poi }) {
  const { t, lingua } = useT()
  return (
    <>
      {poi.vicini.length > 0 && (
        <section>
          <h2>{t('scheda.vicini')}</h2>
          <ul className="griglia-vicini">
            {poi.vicini.map((v) => (
              <li key={v.id}>
                <Link to={`/poi/${v.id}`} className="scheda-mini">
                  <Copertina poi={v} compatta />
                  <span className="scheda-mini__testo">
                    <strong>{v.nome}</strong>
                    <small className="numero">{formattaDistanza(v.distanza, lingua)}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {poi.itinerari.length > 0 && (
        <section>
          <h2>{t('scheda.itinerari')}</h2>
          <ul className="elenco-collegamenti">
            {poi.itinerari.map((it) => (
              <li key={it.id}>
                <Link to={`/itinerari/${it.id}`} className="riga-link">
                  <Icona nome="itinerari" size={20} />
                  <span>{it.titolo}</span>
                  <small className="numero">{t('itinerari.durata', { n: it.durata_minuti })}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {poi.tradizioni.length > 0 && (
        <section>
          <h2>{t('scheda.tradizioni')}</h2>
          <ul className="elenco-collegamenti">
            {poi.tradizioni.map((tr) => (
              <li key={tr.id}>
                <Link to="/scopri" className="riga-link">
                  <Icona nome="calendario" size={20} />
                  <span>{tr.nome}</span>
                  <small>{tr.periodo}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
