import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import Copertina from '../components/Copertina.jsx'
import Icona from '../components/Icona.jsx'
import { getFacette, getPoi } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { CENTRO_TRENTO, distanzaMetri, formattaDistanza } from '../lib/geo.js'
import { usePosizione } from '../lib/posizione.jsx'

const { categorie, temi } = getFacette()

// S-01 Mappa · S-01L Elenco · S-02 Anteprima · S-04 Ricerca e filtri (UC-01).
// Ricerca, filtri, vista e luogo selezionato stanno nell'URL: tornando indietro
// dalla scheda si ritrova la mappa com'era.
export default function Mappa() {
  const { t, lingua } = useT()
  const navigate = useNavigate()
  const { stato, coordinate, origine, richiedi } = usePosizione()
  const [params, setParams] = useSearchParams()

  const q = params.get('q') ?? ''
  const categoria = params.get('categoria')
  const tema = params.get('tema')
  const elenco = params.get('vista') === 'elenco'
  const selezionatoId = params.get('poi')

  const [luoghi, setLuoghi] = useState([])
  const [vista, setVista] = useState({ centro: CENTRO_TRENTO, zoom: 16 })
  const [mappaRotta, setMappaRotta] = useState(false)
  const [avvisoChiuso, setAvvisoChiuso] = useState(false)

  const aggiorna = (modifiche) => {
    const nuovi = new URLSearchParams(params)
    for (const [chiave, valore] of Object.entries(modifiche)) {
      if (valore) nuovi.set(chiave, valore)
      else nuovi.delete(chiave)
    }
    setParams(nuovi, { replace: true })
  }

  useEffect(() => {
    getPoi({ q, categoria, tema }).then(setLuoghi)
  }, [q, categoria, tema])

  // La posizione si chiede la prima volta che si apre la mappa (dopo il benvenuto)
  useEffect(() => {
    if (stato === 'sconosciuta') richiedi()
  }, [stato, richiedi])

  useEffect(() => {
    if (stato === 'ok') setVista({ centro: coordinate, zoom: 16 })
  }, [stato, coordinate])

  const filtriAttivi = Boolean(q || categoria || tema)
  const conDistanza = useMemo(
    () =>
      luoghi
        .map((poi) => ({ poi, distanza: distanzaMetri(origine, poi.posizione) }))
        .sort((a, b) => (filtriAttivi && q ? 0 : a.distanza - b.distanza)),
    [luoghi, origine, filtriAttivi, q],
  )

  const selezionato = conDistanza.find((r) => r.poi.id === selezionatoId)

  const segnaposti = useMemo(
    () =>
      luoghi.map((poi) => ({
        id: poi.id,
        posizione: poi.posizione,
        titolo: poi.nome,
        colore: `var(--c-${poi.categoria})`,
        attivo: poi.id === selezionatoId,
      })),
    [luoghi, selezionatoId],
  )

  // Con filtri o ricerca attivi la mappa inquadra i risultati
  const inquadra = useMemo(
    () => (filtriAttivi && luoghi.length ? luoghi.map((p) => p.posizione) : null),
    [filtriAttivi, luoghi],
  )

  const distanzaTesto = (metri) =>
    t(stato === 'ok' ? 'mappa.daTe' : 'mappa.daDuomo', { d: formattaDistanza(metri, lingua) })

  const messaggio =
    mappaRotta && !elenco
      ? t('mappa.nonDisponibile')
      : stato === 'negata'
        ? t('mappa.posizioneNegata')
        : stato === 'lontano'
          ? t('mappa.lontano')
          : null

  return (
    <div className={`pagina-mappa ${elenco ? 'pagina-mappa--elenco' : ''}`}>
      <div className="strumenti">
        <form className="ricerca" role="search" onSubmit={(e) => e.preventDefault()}>
          <Icona nome="cerca" size={20} />
          <input
            type="search"
            value={q}
            placeholder={t('mappa.cerca')}
            aria-label={t('mappa.cerca')}
            onChange={(e) => aggiorna({ q: e.target.value, poi: null })}
          />
          {q && (
            <button type="button" className="ricerca__svuota" aria-label={t('mappa.svuota')} onClick={() => aggiorna({ q: null })}>
              <Icona nome="chiudi" size={18} />
            </button>
          )}
        </form>

        <div className="filtri" role="group" aria-label="Filtri">
          <button type="button" className="chip" aria-pressed={!categoria} onClick={() => aggiorna({ categoria: null, poi: null })}>
            {t('mappa.tutte')}
          </button>
          {categorie.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip chip--${c}`}
              aria-pressed={categoria === c}
              onClick={() => aggiorna({ categoria: categoria === c ? null : c, poi: null })}
            >
              {t(`categoria.${c}`)}
            </button>
          ))}
          <label className="chip chip--select">
            <span className="nascosto">{t('mappa.tema')}</span>
            <select value={tema ?? ''} onChange={(e) => aggiorna({ tema: e.target.value, poi: null })}>
              <option value="">{t('mappa.tuttiTemi')}</option>
              {temi.map((tm) => (
                <option key={tm} value={tm}>
                  {t(`tema.${tm}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {messaggio && !avvisoChiuso && (
          <div className="banner" role="status">
            <Icona nome="info" size={18} />
            <span>{messaggio}</span>
            {mappaRotta && !elenco ? (
              <button type="button" className="banner__azione" onClick={() => aggiorna({ vista: 'elenco' })}>
                {t('mappa.vistaElenco')}
              </button>
            ) : (
              <button type="button" className="banner__chiudi" aria-label={t('mappa.chiudi')} onClick={() => setAvvisoChiuso(true)}>
                <Icona nome="chiudi" size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {elenco ? (
        <section className="elenco-poi" aria-live="polite">
          <p className="elenco-poi__conteggio">
            {conDistanza.length === 1 ? t('mappa.risultato') : t('mappa.risultati', { n: conDistanza.length })}
          </p>
          {conDistanza.length === 0 && <p className="vuoto">{t('mappa.nessuno')}</p>}
          <ul>
            {conDistanza.map(({ poi, distanza }) => (
              <li key={poi.id}>
                <Link to={`/poi/${poi.id}`} className="riga-poi">
                  <span className={`riga-poi__punto riga-poi__punto--${poi.categoria}`} aria-hidden="true" />
                  <span className="riga-poi__testo">
                    <strong>{poi.nome}</strong>
                    <span>{poi.sintesi}</span>
                    <small>
                      {t(`categoria.${poi.categoria}`)} · {distanzaTesto(distanza)}
                    </small>
                  </span>
                  <Icona nome="avanti" size={18} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="pagina-mappa__mappa">
          <MappaLeaflet
            etichetta={t('nav.mappa')}
            vista={vista}
            segnaposti={segnaposti}
            inquadra={inquadra}
            pulsantiZoom={false}
            posizioneUtente={stato === 'ok' ? coordinate : null}
            onClickSegnaposto={(id) => aggiorna({ poi: id })}
            onClickMappa={() => selezionatoId && aggiorna({ poi: null })}
            onErroreMappa={() => setMappaRotta(true)}
          />
          {filtriAttivi && luoghi.length === 0 && <p className="mappa-vuota">{t('mappa.nessuno')}</p>}
        </div>
      )}

      <div className="comandi-mappa">
        {!elenco && (
          <button
            type="button"
            className="pulsante-tondo"
            aria-label={t('mappa.posizione')}
            title={t('mappa.posizione')}
            onClick={() => {
              setAvvisoChiuso(false)
              if (stato === 'ok') setVista({ centro: coordinate, zoom: 17 })
              else richiedi()
            }}
          >
            <Icona nome="posizione" />
          </button>
        )}
        <button
          type="button"
          className="pulsante-tondo pulsante-tondo--testo"
          onClick={() => aggiorna({ vista: elenco ? null : 'elenco', poi: null })}
        >
          <Icona nome={elenco ? 'mappa' : 'elenco'} size={18} />
          {elenco ? t('mappa.vistaMappa') : t('mappa.vistaElenco')}
        </button>
      </div>

      {selezionato && !elenco && (
        <article className="anteprima" aria-label={selezionato.poi.nome}>
          <button type="button" className="anteprima__chiudi" aria-label={t('mappa.chiudi')} onClick={() => aggiorna({ poi: null })}>
            <Icona nome="chiudi" size={18} />
          </button>
          <Copertina poi={selezionato.poi} compatta />
          <div className="anteprima__corpo">
            <h2>{selezionato.poi.nome}</h2>
            <p>{selezionato.poi.sintesi}</p>
            <p className="anteprima__meta">{distanzaTesto(selezionato.distanza)}</p>
            <button type="button" className="pulsante pulsante--primario" onClick={() => navigate(`/poi/${selezionato.poi.id}`)}>
              {t('mappa.apri')}
            </button>
          </div>
        </article>
      )}
    </div>
  )
}
