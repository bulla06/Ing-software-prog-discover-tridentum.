import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icona from '../components/Icona.jsx'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import { getItinerari } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { formattaDistanza, lunghezzaPercorso } from '../lib/geo.js'

// Filtro "ho ... ore" della schermata S-05 (durata massima in minuti)
const TEMPI = [
  { chiave: 'itinerari.qualsiasi', valore: null },
  { chiave: 'itinerari.1h', valore: 60 },
  { chiave: 'itinerari.2h', valore: 120 },
  { chiave: 'itinerari.mezza', valore: 240 },
]

// S-05 Itinerari (RF-07): ogni itinerario mostra il suo percorso vero sulla mappa
export default function Itinerari() {
  const { t } = useT()
  const [params, setParams] = useSearchParams()
  const durataMax = params.get('tempo') ? Number(params.get('tempo')) : null
  const [itinerari, setItinerari] = useState(null)

  useEffect(() => {
    getItinerari({ durataMax }).then(setItinerari, () => setItinerari([]))
  }, [durataMax])

  return (
    <div className="pagina pagina--larga">
      <header className="intestazione-pagina">
        <h1>{t('itinerari.titolo')}</h1>
        <p>{t('itinerari.sottotitolo')}</p>
      </header>

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

      <ul className="griglia-itinerari" aria-busy={itinerari === null}>
        {itinerari === null
          ? [0, 1, 2].map((i) => <li key={i} className="scheletro scheletro--scheda" />)
          : itinerari.map((it, i) => (
              <li key={it.id} style={{ '--i': Math.min(i, 8) }}>
                <SchedaItinerario itinerario={it} />
              </li>
            ))}
      </ul>
    </div>
  )
}

function SchedaItinerario({ itinerario: it }) {
  const { t, lingua } = useT()
  const punti = useMemo(() => it.tappe.map((p) => p.posizione), [it])
  const vista = useMemo(() => ({ centro: punti[0], zoom: 15 }), [punti])
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
