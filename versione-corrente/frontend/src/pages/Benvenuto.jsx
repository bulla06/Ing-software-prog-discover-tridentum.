import { useEffect, useRef } from 'react'
import Icona from '../components/Icona.jsx'
import GalleriaBenvenuto from '../components/GalleriaBenvenuto.jsx'
import SceltaLingua from '../components/SceltaLingua.jsx'
import { useT } from '../i18n/index.jsx'

// S-00: mostrata solo al primo accesso. Lingua, cosa offre l'app e perché chiederemo
// la posizione. Al posto della mappa, foto di Trento di ieri e di oggi che scorrono.
export default function Benvenuto({ onInizia }) {
  const { t } = useT()
  const pulsante = useRef(null)

  useEffect(() => {
    pulsante.current?.focus()
  }, [])

  return (
    <div className="benvenuto" role="dialog" aria-modal="true" aria-labelledby="benvenuto-titolo">
      <div className="benvenuto__foto">
        <GalleriaBenvenuto />
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
