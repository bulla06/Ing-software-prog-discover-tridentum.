import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Avviso from '../components/Avviso.jsx'
import Copertina from '../components/Copertina.jsx'
import CreditiFoto from '../components/CreditiFoto.jsx'
import Finestra from '../components/Finestra.jsx'
import Icona from '../components/Icona.jsx'
import ModuloSegnalazione from '../components/ModuloSegnalazione.jsx'
import { getPoiById } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { distanzaMetri, formattaDistanza } from '../lib/geo.js'
import { urlFoto } from '../lib/http.js'
import { usePosizione } from '../lib/posizione.jsx'
import { usePreferiti } from '../lib/preferiti.js'
import { useSessione } from '../lib/sessione.jsx'

// S-03 Scheda POI (RF-02, RF-03, RF-15, RF-18): il centro dell'app, raggiungibile da ogni sezione.
export default function Scheda() {
  const { id } = useParams()
  const { t, lingua } = useT()
  const navigate = useNavigate()
  const { stato, origine } = usePosizione()
  const { utente } = useSessione()
  const { salvato, alterna } = usePreferiti()

  const [poi, setPoi] = useState(undefined)
  const [avviso, setAvviso] = useState(null)
  const [segnalazione, setSegnalazione] = useState(null)
  const [fotoAperta, setFotoAperta] = useState(null)
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

  const indietro = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))
  const vaiAdAccesso = () => navigate(`/accesso?da=${encodeURIComponent(`/poi/${id}`)}`)

  if (poi === undefined) return <div className="pagina" aria-busy="true" />

  if (poi === null || poi === 'errore') {
    return (
      <div className="pagina pagina--centrata">
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
  const copertinaUfficiale = poi.foto.find((f) => f.id === poi.copertina)

  const salva = async () => {
    if (!utente) return vaiAdAccesso()
    try {
      await alterna('poi', poi.id)
    } catch {
      setAvviso(t('comune.errore'))
    }
  }

  return (
    <article className="scheda">
      <div className="scheda__testata">
        <button type="button" className="pulsante-tondo pulsante-tondo--su-copertina" aria-label={t('scheda.indietro')} onClick={indietro}>
          <Icona nome="indietro" />
        </button>
        <Copertina poi={poi} />
        {copertinaUfficiale && <CreditiFoto foto={copertinaUfficiale} className="crediti-foto--copertina" />}
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
          <button type="button" className="azione" aria-pressed={eSalvato} onClick={salva} title={utente ? undefined : t('scheda.accediPerSalvare')}>
            <Icona nome="salva" />
            {eSalvato ? t('scheda.salvato') : t('scheda.salva')}
          </button>
          <a className="azione" href={comeArrivare} target="_blank" rel="noreferrer">
            <Icona nome="esterno" />
            {t('scheda.arrivare')}
          </a>
          <Link className="azione" to={`/poi/${poi.id}/ricordo`}>
            <Icona nome="ricordo" />
            {t('scheda.ricordo')}
          </Link>
        </div>

        {poi.piatto_consigliato && (
          <section className="riquadro riquadro--gusto">
            <h2>{t('scheda.piatto')}</h2>
            <p className="riquadro__evidenza">{poi.piatto_consigliato}</p>
          </section>
        )}

        {poi.foto.length > 0 && (
          <section>
            <h2>{t('scheda.foto')}</h2>
            <ul className="galleria">
              {poi.foto.map((f) => (
                <li key={f.id}>
                  <button type="button" className="galleria__voce" onClick={() => setFotoAperta(f)} aria-label={t('scheda.ingrandisci')}>
                    <img src={urlFoto(f.id, 'mini')} alt={f.didascalia || poi.nome} width={f.larghezza} height={f.altezza} loading="lazy" />
                  </button>
                  {f.didascalia && <p className="galleria__didascalia">{f.didascalia}</p>}
                  <CreditiFoto foto={f} />
                </li>
              ))}
            </ul>
          </section>
        )}

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
          <button type="button" className="collegamento" onClick={() => setSegnalazione({ tipo: 'poi', id: poi.id })}>
            <Icona nome="segnala" size={16} />
            {t('scheda.segnala')}
          </button>
        </section>

        <section>
          <h2>{t('scheda.ricordi')}</h2>
          {poi.ricordi.length === 0 ? (
            <div className="vuoto vuoto--riquadro">
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

        {poi.tradizioni.length > 0 && (
          <section>
            <h2>{t('scheda.tradizioni')}</h2>
            <ul className="elenco-semplice">
              {poi.tradizioni.map((tr) => (
                <li key={tr.id}>
                  <Link to="/scopri" className="riga-link">
                    <Icona nome="calendario" size={18} />
                    <span>{tr.nome}</span>
                    <small>{tr.periodo}</small>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {poi.itinerari.length > 0 && (
          <section>
            <h2>{t('scheda.itinerari')}</h2>
            <ul className="elenco-semplice">
              {poi.itinerari.map((it) => (
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
            {poi.vicini.map((v) => (
              <li key={v.id}>
                <Link to={`/poi/${v.id}`} className="scheda-mini">
                  <Copertina poi={v} compatta />
                  <strong>{v.nome}</strong>
                  <small>{formattaDistanza(v.distanza, lingua)}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Finestra titolo={fotoAperta?.didascalia || poi.nome} aperta={Boolean(fotoAperta)} onChiudi={() => setFotoAperta(null)}>
        {fotoAperta && (
          <figure className="foto-grande">
            <img src={urlFoto(fotoAperta.id)} alt={fotoAperta.didascalia || poi.nome} width={fotoAperta.larghezza} height={fotoAperta.altezza} />
            <figcaption>
              <CreditiFoto foto={fotoAperta} />
            </figcaption>
          </figure>
        )}
      </Finestra>
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
