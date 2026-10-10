import { useEffect, useRef } from 'react'
import Icona from './Icona.jsx'
import { useT } from '../i18n/index.jsx'

/** Finestra di dialogo modale, con <dialog>: Esc e il pulsante chiudi la chiudono, il focus resta dentro. */
export default function Finestra({ titolo, aperta, onChiudi, children }) {
  const { t } = useT()
  const dialogo = useRef(null)

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (aperta && !d.open) d.showModal()
    if (!aperta && d.open) d.close()
  }, [aperta])

  return (
    <dialog ref={dialogo} className="finestra" aria-labelledby="finestra-titolo" onClose={onChiudi} onCancel={onChiudi}>
      {aperta && (
        <div className="finestra__corpo">
          <header className="finestra__testata">
            <h2 id="finestra-titolo">{titolo}</h2>
            <button type="button" className="finestra__chiudi" aria-label={t('comune.chiudi')} onClick={onChiudi}>
              <Icona nome="chiudi" size={18} />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}
