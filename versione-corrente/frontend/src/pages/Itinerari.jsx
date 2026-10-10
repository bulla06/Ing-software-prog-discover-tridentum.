import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import ErroreCaricamento from '../components/ErroreCaricamento.jsx'
import Icona from '../components/Icona.jsx'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import { getItinerari } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { CENTRO_TRENTO, formattaDistanza, lunghezzaPercorso } from '../lib/geo.js'
import { usePosizione } from '../lib/posizione.jsx'

// Filtro "ho ... ore" della schermata S-05 (durata massima in minuti)
const TEMPI = [
  { chiave: 'itinerari.qualsiasi', valore: null },
  { chiave: 'itinerari.1h', valore: 60 },
  { chiave: 'itinerari.2h', valore: 120 },
  { chiave: 'itinerari.mezza', valore: 240 },
]

// Tempi e temi tra cui scegliere per l'itinerario su misura (RF-08)
const TEMPI_SU_MISURA = [
  { chiave: 'suMisura.30', valore: 30 },
  { chiave: 'itinerari.1h', valore: 60 },
  { chiave: 'itinerari.2h', valore: 120 },
  { chiave: 'itinerari.mezza', valore: 240 },
]
const TEMI = ['tridentum', 'principi-vescovi', 'concilio', 'trento-austriaca', 'guerra', 'adige', 'arte', 'trento-contemporanea', 'gusto']

// S-05 Itinerari (RF-07): ogni itinerario mostra il suo percorso vero sulla mappa.
// In cima, "Crea il tuo itinerario" (RF-08): il tempo che hai e da dove parti.
export default function Itinerari() {
  const { t, lingua } = useT()
  const [params, setParams] = useSearchParams()
  const durataMax = params.get('tempo') ? Number(params.get('tempo')) : null
  const [itinerari, setItinerari] = useState(null)
  const [errore, setErrore] = useState(null)
  const [tentativo, setTentativo] = useState(0)

  useEffect(() => {
    setErrore(null)
    getItinerari({ durataMax }).then(setItinerari, (err) => {
      setErrore(err)
      setItinerari(null)
    })
  }, [durataMax, tentativo, lingua])

  return (
    <div className="pagina pagina--larga">
      <header className="intestazione-pagina">
        <h1>{t('itinerari.titolo')}</h1>
        <p>{t('itinerari.sottotitolo')}</p>
      </header>

      <SuMisura />

      <div className="gruppo-filtro">
        <h2 id="titolo-tempo">{t('itinerari.tempo')}</h2>
        <div className="filtri filtri--a-capo" role="group" aria-labelledby="titolo-tempo">
          {TEMPI.map(({ chiave, valore }) => (
            <button
              key={chiave}
              type="button"
              className="chip"
              aria-pressed={durataMax === valore}
              onClick={() => setParams(valore ? { tempo: String(valore) } : {}, { replace: true })}
            >
              {t(chiave)}
            </button>
          ))}
        </div>
      </div>

      {errore && <ErroreCaricamento errore={errore} onRiprova={() => setTentativo((n) => n + 1)} />}

      {itinerari?.length === 0 && (
        <div className="vuoto">
          <Icona nome="orologio" size={28} />
          <p>{t('itinerari.nessuno')}</p>
          {durataMax && (
            <button type="button" className="pulsante" onClick={() => setParams({}, { replace: true })}>
              {t('itinerari.mostraTutti')}
            </button>
          )}
        </div>
      )}

      {!errore && (
        <ul className="griglia-itinerari" aria-busy={itinerari === null}>
          {itinerari === null
            ? [0, 1, 2].map((i) => <li key={i} className="scheletro scheletro--scheda" />)
            : itinerari.map((it, i) => (
                <li key={it.id} style={{ '--i': Math.min(i, 8) }}>
                  <SchedaItinerario itinerario={it} />
                </li>
              ))}
        </ul>
      )}
    </div>
  )
}

/** RF-08, UC-02 3a: itinerario creato sul momento dal tempo disponibile e dal punto di partenza */
function SuMisura() {
  const { t } = useT()
  const navigate = useNavigate()
  const { stato, coordinate, origine, richiedi } = usePosizione()
  const [minuti, setMinuti] = useState(60)
  const [tema, setTema] = useState('')

  const crea = (e) => {
    e.preventDefault()
    const q = new URLSearchParams({ minuti: String(minuti), da: origine.map((n) => n.toFixed(5)).join(',') })
    if (tema) q.set('tema', tema)
    navigate(`/itinerari/su-misura?${q}`)
  }

  return (
    <form className="riquadro su-misura" onSubmit={crea} aria-labelledby="titolo-su-misura">
      <h2 id="titolo-su-misura">
        <Icona nome="suMisura" size={20} />
        {t('suMisura.titolo')}
      </h2>
      <p className="nota nota--senza-margine">{t('suMisura.spiega')}</p>

      <fieldset className="su-misura__gruppo">
        <legend className="campo__etichetta">{t('itinerari.tempo')}</legend>
        <div className="filtri filtri--a-capo">
          {TEMPI_SU_MISURA.map(({ chiave, valore }) => (
            <button key={valore} type="button" className="chip" aria-pressed={minuti === valore} onClick={() => setMinuti(valore)}>
              {t(chiave)}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="campo">
        <span className="campo__etichetta">{t('suMisura.tema')}</span>
        <select value={tema} onChange={(e) => setTema(e.target.value)}>
          <option value="">{t('suMisura.qualsiasiTema')}</option>
          {TEMI.map((tm) => (
            <option key={tm} value={tm}>
              {t(`tema.${tm}`)}
            </option>
          ))}
        </select>
      </label>

      <p className="su-misura__partenza">
        <Icona nome="posizione" size={18} />
        <span>{stato === 'ok' && coordinate ? t('suMisura.daTe') : t('suMisura.daDuomo')}</span>
        {stato !== 'ok' && stato !== 'attesa' && (
          <button type="button" className="collegamento" onClick={richiedi}>
            {t('suMisura.usaPosizione')}
          </button>
        )}
      </p>

      <button type="submit" className="pulsante pulsante--primario">
        {t('suMisura.crea')}
        <Icona nome="avanti" size={18} />
      </button>
    </form>
  )
}

function SchedaItinerario({ itinerario: it }) {
  const { t, lingua } = useT()
  const punti = useMemo(() => it.tappe.map((p) => p.posizione), [it])
  const vista = useMemo(() => ({ centro: punti[0] ?? CENTRO_TRENTO, zoom: 15 }), [punti])
  const segnaposti = useMemo(
    () => it.tappe.map((p, i) => ({ id: String(i), posizione: p.posizione, etichetta: i + 1, tipo: 'tappa' })),
    [it],
  )

  return (
    <Link to={`/itinerari/${it.id}`} className="scheda-itinerario">
      <div className="scheda-itinerario__mappa">
        <MappaLeaflet statica etichetta={t('itinerario.anteprima', { nome: it.titolo })} vista={vista} percorso={punti} inquadra={punti} segnaposti={segnaposti} />
      </div>
      <div className="scheda-itinerario__corpo">
        <p className="scheda-itinerario__tema">{t(`tema.${it.tema}`)}</p>
        <h2>{it.titolo}</h2>
        <p>{it.descrizione}</p>
        <ul className="dati-in-linea">
          <li>
            <Icona nome="orologio" size={16} />
            <span className="numero">{t('itinerari.durata', { n: it.durata_minuti })}</span>
          </li>
          <li>
            <Icona nome="luogo" size={16} />
            <span className="numero">{t('itinerari.tappe', { n: it.tappe.length })}</span>
          </li>
          <li>
            <Icona nome="piedi" size={16} />
            <span className="numero">{formattaDistanza(lunghezzaPercorso(punti), lingua)}</span>
          </li>
        </ul>
      </div>
    </Link>
  )
}
