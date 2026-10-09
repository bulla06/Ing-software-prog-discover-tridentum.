import { useEffect, useMemo, useRef, useState } from 'react'
import Icona from '../components/Icona.jsx'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import SceltaLingua from '../components/SceltaLingua.jsx'
import { getPoi } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { CENTRO_TRENTO } from '../lib/geo.js'

// S-00: mostrata solo al primo accesso. Lingua, cosa offre l'app e perché chiederemo
// la posizione. L'immagine è la mappa vera del centro con tutti i luoghi dell'app.
export default function Benvenuto({ onInizia }) {
  const { t } = useT()
  const pulsante = useRef(null)
  const [luoghi, setLuoghi] = useState([])

  useEffect(() => {
    pulsante.current?.focus()
    getPoi().then(setLuoghi, () => {})
  }, [])

  const segnaposti = useMemo(
    () => luoghi.map((p) => ({ id: p.id, posizione: p.posizione, colore: `var(--c-${p.categoria})`, icona: p.categoria })),
    [luoghi],
  )
  // Vista centrata sul baricentro dei luoghi: tutti visibili anche nella fascia stretta del telefono
  const vista = useMemo(() => {
    if (!luoghi.length) return { centro: CENTRO_TRENTO, zoom: 15 }
    const media = (i) => luoghi.reduce((s, p) => s + p.posizione[i], 0) / luoghi.length
    return { centro: [media(0), media(1)], zoom: 15 }
  }, [luoghi])

  return (
    <div className="benvenuto" role="dialog" aria-modal="true" aria-labelledby="benvenuto-titolo">
      <div className="benvenuto__mappa">
        <MappaLeaflet statica etichetta={t('benvenuto.mappa')} vista={vista} segnaposti={segnaposti} />
      </div>

      <div className="benvenuto__corpo">
        <p className="benvenuto__marchio">
          <img src="./icon.svg" alt="" width="28" height="28" />
          <span translate="no">Discover Tridentum</span>
        </p>
        <h1 id="benvenuto-titolo">{t('benvenuto.titolo')}</h1>
        <p className="benvenuto__testo">{t('benvenuto.testo')}</p>

        <ul className="benvenuto__punti">
          <li>
            <Icona nome="mappa" size={24} />
            <div>
              <h2>{t('benvenuto.c1.titolo')}</h2>
              <p>{t('benvenuto.c1.testo')}</p>
            </div>
          </li>
          <li>
            <Icona nome="itinerari" size={24} />
            <div>
              <h2>{t('benvenuto.c2.titolo')}</h2>
              <p>{t('benvenuto.c2.testo')}</p>
            </div>
          </li>
        </ul>

        <div className="benvenuto__lingua">
          <span>{t('benvenuto.lingua')}</span>
          <SceltaLingua />
        </div>

        <button ref={pulsante} type="button" className="pulsante pulsante--primario pulsante--grande" onClick={onInizia}>
          {t('benvenuto.inizia')}
          <Icona nome="avanti" size={18} peso="bold" />
        </button>

        <p className="benvenuto__posizione">
          <Icona nome="posizione" size={18} />
          {t('benvenuto.posizione')}
        </p>
      </div>
    </div>
  )
}
