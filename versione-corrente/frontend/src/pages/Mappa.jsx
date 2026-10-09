import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import Copertina from '../components/Copertina.jsx'
import Icona from '../components/Icona.jsx'
import { getPoi } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { CENTRO_TRENTO, distanzaMetri, formattaDistanza } from '../lib/geo.js'
import { usePosizione } from '../lib/posizione.jsx'
import { useSchermoLargo } from '../lib/schermo.js'
import { useTrascinaPerChiudere } from '../lib/trascina.js'

// Gli avvisi informativi sulla posizione spariscono da soli: su telefono lo spazio sopra la mappa
// è poco. Gli errori (dati non caricati, mappa non disponibile) restano finché non si risolvono.
const DURATA_AVVISO_MS = 6000

// S-01 Mappa · S-01L Elenco · S-02 Anteprima · S-04 Ricerca e filtri (UC-01).
// Ricerca, filtri, vista e luogo selezionato stanno nell'URL: tornando indietro
// dalla scheda si ritrova la mappa com'era.
// Su smartphone mappa ed elenco si alternano; da 1024 px stanno affiancati e passando
// sopra un luogo dell'elenco il suo segnaposto si evidenzia.
export default function Mappa() {
  const { t, lingua } = useT()
  const { stato, coordinate, origine, richiedi } = usePosizione()
  const [params, setParams] = useSearchParams()

  const q = params.get('q') ?? ''
  const categoria = params.get('categoria')
  const tema = params.get('tema')
  const elenco = params.get('vista') === 'elenco'
  const selezionatoId = params.get('poi')

  const [luoghi, setLuoghi] = useState(null)
  const [tutti, setTutti] = useState([])
  const [errore, setErrore] = useState(false)
  const [tentativo, setTentativo] = useState(0)
  const [vista, setVista] = useState({ centro: CENTRO_TRENTO, zoom: 16 })
  const [mappaRotta, setMappaRotta] = useState(false)
  const [avvisoChiuso, setAvvisoChiuso] = useState(false)
  const [evidenziato, setEvidenziato] = useState(null)
  const trascina = useTrascinaPerChiudere(() => aggiorna({ poi: null }))
  const largo = useSchermoLargo()

  const aggiorna = (modifiche) => {
    const nuovi = new URLSearchParams(params)
    for (const [chiave, valore] of Object.entries(modifiche)) {
      if (valore) nuovi.set(chiave, valore)
      else nuovi.delete(chiave)
    }
    setParams(nuovi, { replace: true })
  }

  // Tutti i luoghi, per costruire i filtri con le categorie e i temi presenti
  useEffect(() => {
    getPoi().then(setTutti, () => setErrore(true))
  }, [tentativo])

  // Risultati filtrati dal server; la ricerca parte quando si smette di scrivere
  useEffect(() => {
    let attivo = true
    const timer = setTimeout(
      () =>
        getPoi({ q, categoria, tema }).then(
          (risultati) => {
            if (!attivo) return
            setLuoghi(risultati)
            setErrore(false)
          },
          () => attivo && setErrore(true),
        ),
      q ? 250 : 0,
    )
    return () => {
      attivo = false
      clearTimeout(timer)
    }
  }, [q, categoria, tema, tentativo])

  const categorie = useMemo(() => [...new Set(tutti.map((p) => p.categoria))], [tutti])
  const temi = useMemo(() => [...new Set(tutti.flatMap((p) => p.temi))].sort(), [tutti])

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
      (luoghi ?? [])
        .map((poi) => ({ poi, distanza: distanzaMetri(origine, poi.posizione) }))
        .sort((a, b) => (filtriAttivi && q ? 0 : a.distanza - b.distanza)),
    [luoghi, origine, filtriAttivi, q],
  )

  const selezionato = conDistanza.find((r) => r.poi.id === selezionatoId)

  // Il luogo selezionato deve restare visibile: su telefono sopra il pannello dell'anteprima
  // e sotto ricerca e filtri
  const mostra = useMemo(
    () => (selezionato ? { punto: selezionato.poi.posizione, margineAlto: largo ? 24 : 150, margineBasso: largo ? 24 : 270 } : null),
    [selezionato, largo],
  )

  const segnaposti = useMemo(
    () =>
      (luoghi ?? []).map((poi) => ({
        id: poi.id,
        posizione: poi.posizione,
        titolo: poi.nome,
        colore: `var(--c-${poi.categoria})`,
        icona: poi.categoria,
        categoria: poi.categoria,
        attivo: poi.id === selezionatoId || poi.id === evidenziato,
      })),
    [luoghi, selezionatoId, evidenziato],
  )

  // Con filtri o ricerca attivi la mappa inquadra i risultati
  const inquadra = useMemo(
    () => (filtriAttivi && luoghi?.length ? luoghi.map((p) => p.posizione) : null),
    [filtriAttivi, luoghi],
  )

  const distanzaTesto = (metri) =>
    t(stato === 'ok' ? 'mappa.daTe' : 'mappa.daDuomo', { d: formattaDistanza(metri, lingua) })

  const messaggio = errore
    ? t('mappa.erroreCaricamento')
    : mappaRotta && !elenco
      ? t('mappa.nonDisponibile')
      : stato === 'negata'
        ? t('mappa.posizioneNegata')
        : stato === 'lontano'
          ? t('mappa.lontano')
          : null

  const avvisoInformativo = Boolean(messaggio) && !errore && !(mappaRotta && !elenco)
  useEffect(() => {
    if (!avvisoInformativo || avvisoChiuso) return
    const timer = setTimeout(() => setAvvisoChiuso(true), DURATA_AVVISO_MS)
    return () => clearTimeout(timer)
  }, [avvisoInformativo, avvisoChiuso])

  return (
    <div className={`pagina-mappa ${elenco ? 'pagina-mappa--elenco' : ''}`}>
      <h1 className="nascosto">{t('mappa.titolo')}</h1>

      <aside className="pannello-luoghi">
        <div className="strumenti">
          <form className="ricerca" role="search" onSubmit={(e) => e.preventDefault()}>
            <Icona nome="cerca" size={20} />
            <input
              type="search"
              name="q"
              autoComplete="off"
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

          <div className="filtri" role="group" aria-label={t('mappa.filtri')}>
            <button type="button" className="chip" aria-pressed={!categoria} onClick={() => aggiorna({ categoria: null, poi: null })}>
              {t('mappa.tutte')}
            </button>
            {categorie.map((c) => (
              <button
                key={c}
                type="button"
                className="chip chip--categoria"
                style={{ '--tinta': `var(--c-${c})` }}
                aria-pressed={categoria === c}
                onClick={() => aggiorna({ categoria: categoria === c ? null : c, poi: null })}
              >
                <Icona nome={c} size={16} peso={categoria === c ? 'fill' : 'regular'} />
                {t(`categoria.${c}`)}
              </button>
            ))}
            <label className="chip chip--select">
              <span className="nascosto">{t('mappa.tema')}</span>
              <select name="tema" value={tema ?? ''} onChange={(e) => aggiorna({ tema: e.target.value, poi: null })}>
                <option value="">{t('mappa.tuttiTemi')}</option>
                {temi.map((tm) => (
                  <option key={tm} value={tm}>
                    {t(`tema.${tm}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {messaggio && (!avvisoChiuso || errore) && (
            <div className="banner" role="status">
              <Icona nome="info" size={18} />
              <span>{messaggio}</span>
              {errore ? (
                <button type="button" className="banner__azione" onClick={() => setTentativo((n) => n + 1)}>
                  {t('comune.riprova')}
                </button>
              ) : mappaRotta && !elenco ? (
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

        <section className="elenco-poi" aria-live="polite" aria-label={t('mappa.elencoLuoghi')}>
          {luoghi === null && !errore ? (
            <ul aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="riga-poi riga-poi--scheletro">
                  <span className="scheletro scheletro--icona" />
                  <span className="riga-poi__testo">
                    <span className="scheletro scheletro--riga" />
                    <span className="scheletro scheletro--riga scheletro--corta" />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="elenco-poi__conteggio">
                {conDistanza.length === 1 ? t('mappa.risultato') : t('mappa.risultati', { n: conDistanza.length })}
                {!filtriAttivi && conDistanza.length > 0 && ` · ${t(stato === 'ok' ? 'mappa.ordineTe' : 'mappa.ordineDuomo')}`}
              </p>
              {conDistanza.length === 0 && !errore && (
                <div className="vuoto">
                  <Icona nome="cerca" size={28} />
                  <p>{t('mappa.nessuno')}</p>
                  {filtriAttivi && (
                    <button type="button" className="pulsante" onClick={() => aggiorna({ q: null, categoria: null, tema: null })}>
                      {t('mappa.togliFiltri')}
                    </button>
                  )}
                </div>
              )}
              <ul>
                {conDistanza.map(({ poi, distanza }, i) => (
                  <li key={poi.id} style={{ '--i': Math.min(i, 8) }}>
                    <Link
                      to={`/poi/${poi.id}`}
                      className={`riga-poi ${poi.id === selezionatoId ? 'riga-poi--attiva' : ''}`}
                      style={{ '--tinta': `var(--c-${poi.categoria})` }}
                      onMouseEnter={() => setEvidenziato(poi.id)}
                      onMouseLeave={() => setEvidenziato(null)}
                      onFocus={() => setEvidenziato(poi.id)}
                      onBlur={() => setEvidenziato(null)}
                    >
                      <span className="riga-poi__icona" aria-hidden="true">
                        <Icona nome={poi.categoria} size={18} />
                      </span>
                      <span className="riga-poi__testo">
                        <strong>{poi.nome}</strong>
                        <span>{poi.sintesi}</span>
                        <small>
                          {t(`categoria.${poi.categoria}`)} · <span className="numero">{formattaDistanza(distanza, lingua)}</span>
                        </small>
                      </span>
                      <Icona nome="avanti" size={18} className="riga-poi__freccia" />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </aside>

      <div className="pagina-mappa__mappa">
        <MappaLeaflet
          etichetta={t('nav.mappa')}
          vista={vista}
          segnaposti={segnaposti}
          raggruppa
          inquadra={inquadra}
          mostra={mostra}
          pulsantiZoom={false}
          posizioneUtente={stato === 'ok' ? coordinate : null}
          onClickSegnaposto={(id) => aggiorna({ poi: id })}
          onClickMappa={() => selezionatoId && aggiorna({ poi: null })}
          onErroreMappa={() => setMappaRotta(true)}
        />
        {filtriAttivi && luoghi?.length === 0 && <p className="mappa-vuota">{t('mappa.nessuno')}</p>}

        <div className="comandi-mappa">
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
        </div>

        {selezionato && (
          <article className="anteprima" aria-labelledby="anteprima-titolo" {...trascina}>
            <span className="anteprima__maniglia" aria-hidden="true" />
            <Copertina poi={selezionato.poi} compatta />
            <div className="anteprima__corpo">
              <p className="etichetta-categoria" style={{ '--tinta': `var(--c-${selezionato.poi.categoria})` }}>
                <Icona nome={selezionato.poi.categoria} size={14} peso="bold" />
                {t(`categoria.${selezionato.poi.categoria}`)}
              </p>
              <h2 id="anteprima-titolo">{selezionato.poi.nome}</h2>
              <p className="anteprima__sintesi">{selezionato.poi.sintesi}</p>
              <div className="anteprima__piede">
                <span className="anteprima__meta">{distanzaTesto(selezionato.distanza)}</span>
                <Link className="pulsante pulsante--primario" to={`/poi/${selezionato.poi.id}`}>
                  {t('mappa.apri')}
                  <Icona nome="avanti" size={16} peso="bold" />
                </Link>
              </div>
            </div>
            <button type="button" className="anteprima__chiudi" aria-label={t('mappa.chiudi')} onClick={() => aggiorna({ poi: null })}>
              <Icona nome="chiudi" size={18} />
            </button>
          </article>
        )}
      </div>

      <button
        type="button"
        className="pulsante-tondo pulsante-tondo--testo interruttore-vista"
        onClick={() => aggiorna({ vista: elenco ? null : 'elenco', poi: null })}
      >
        <Icona nome={elenco ? 'mappa' : 'elenco'} size={18} />
        {elenco ? t('mappa.vistaMappa') : t('mappa.vistaElenco')}
      </button>
    </div>
  )
}
