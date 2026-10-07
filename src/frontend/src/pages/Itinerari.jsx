import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icona from '../components/Icona.jsx'
import { getItinerari, getItinerario } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { formattaDistanza, lunghezzaPercorso } from '../lib/geo.js'

// Filtro "ho … ore" della schermata S-05 (durata massima in minuti)
const TEMPI = [
  { chiave: 'itinerari.qualsiasi', valore: null },
  { chiave: 'itinerari.1h', valore: 60 },
  { chiave: 'itinerari.2h', valore: 120 },
  { chiave: 'itinerari.mezza', valore: 240 },
]

// S-05 Itinerari (RF-07)
export default function Itinerari() {
  const { t, lingua } = useT()
  const [params, setParams] = useSearchParams()
  const durataMax = params.get('tempo') ? Number(params.get('tempo')) : null
  const [itinerari, setItinerari] = useState([])

  useEffect(() => {
    getItinerari({ durataMax })
      .then((elenco) => Promise.all(elenco.map((it) => getItinerario(it.id))))
      .then(setItinerari)
  }, [durataMax])

  return (
    <div className="pagina">
      <header className="intestazione-pagina">
        <h1>{t('itinerari.titolo')}</h1>
        <p>{t('itinerari.sottotitolo')}</p>
      </header>

      <h2 className="etichetta-sezione">{t('itinerari.tempo')}</h2>
      <div className="filtri filtri--a-capo" role="group" aria-label={t('itinerari.tempo')}>
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

      {itinerari.length === 0 && <p className="vuoto">{t('itinerari.nessuno')}</p>}

      <ul className="elenco-schede">
        {itinerari.map((it) => (
          <li key={it.id}>
            <Link to={`/itinerari/${it.id}`} className="scheda-itinerario">
              <span className="chip chip--piccolo chip--statico">{t(`tema.${it.tema}`)}</span>
              <h2>{it.titolo}</h2>
              <p>{it.descrizione}</p>
              <ul className="scheda-itinerario__dati">
                <li>
                  <Icona nome="orologio" size={16} />
                  {t('itinerari.durata', { n: it.durata_minuti })}
                </li>
                <li>
                  <Icona nome="posizione" size={16} />
                  {t('itinerari.tappe', { n: it.tappe.length })}
                </li>
                <li>
                  <Icona nome="itinerari" size={16} />
                  {formattaDistanza(lunghezzaPercorso(it.tappe.map((p) => p.posizione)), lingua)}
                </li>
              </ul>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
