import { useEffect, useRef } from 'react'
import Icona from '../components/Icona.jsx'
import SceltaLingua from '../components/SceltaLingua.jsx'
import { useT } from '../i18n/index.jsx'

// S-00 — mostrata solo al primo accesso: lingua, cosa offre l'app e perché chiederemo la posizione.
export default function Benvenuto({ onInizia }) {
  const { t } = useT()
  const pulsante = useRef(null)

  useEffect(() => {
    pulsante.current?.focus()
  }, [])

  return (
    <div className="benvenuto" role="dialog" aria-modal="true" aria-labelledby="benvenuto-titolo">
      <div className="benvenuto__corpo">
        <img className="benvenuto__logo" src="./icon.svg" alt="" width="56" height="56" />
        <p className="benvenuto__marchio">Discover Tridentum</p>
        <h1 id="benvenuto-titolo">{t('benvenuto.titolo')}</h1>
        <p className="benvenuto__testo">{t('benvenuto.testo')}</p>

        <SceltaLingua />

        <ul className="benvenuto__schede">
          <li>
            <Icona nome="mappa" />
            <div>
              <h2>{t('benvenuto.c1.titolo')}</h2>
              <p>{t('benvenuto.c1.testo')}</p>
            </div>
          </li>
          <li>
            <Icona nome="itinerari" />
            <div>
              <h2>{t('benvenuto.c2.titolo')}</h2>
              <p>{t('benvenuto.c2.testo')}</p>
            </div>
          </li>
        </ul>

        <p className="benvenuto__posizione">
          <Icona nome="posizione" size={18} />
          {t('benvenuto.posizione')}
        </p>

        <button ref={pulsante} type="button" className="pulsante pulsante--primario pulsante--largo" onClick={onInizia}>
          {t('benvenuto.inizia')}
        </button>
      </div>
    </div>
  )
}
