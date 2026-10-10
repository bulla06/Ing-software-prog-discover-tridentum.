import { useT } from '../i18n/index.jsx'
import { messaggioErrore } from '../lib/errori.js'
import { erroreDiConnessione } from '../lib/http.js'
import Icona from './Icona.jsx'

/**
 * Dati non arrivati (UC-01 E2, UC-02 E2): se manca la connessione lo dice chiaramente,
 * altrimenti mostra l'errore; in tutti e due i casi propone di riprovare.
 * `riga` lo mostra come banner sopra la mappa invece che al centro della pagina.
 */
export default function ErroreCaricamento({ errore, onRiprova, riga = false }) {
  const { t } = useT()
  const connessione = erroreDiConnessione(errore)
  const testo = connessione ? t('errore.connessione') : messaggioErrore(t, errore)

  if (riga) {
    return (
      <div className="banner banner--errore" role="alert">
        <Icona nome={connessione ? 'offline' : 'attenzione'} size={18} />
        <span>{testo}</span>
        {onRiprova && (
          <button type="button" className="banner__azione" onClick={onRiprova}>
            {t('comune.riprova')}
          </button>
        )}
      </div>
    )
  }
  return (
    <div className="vuoto vuoto--errore" role="alert">
      <Icona nome={connessione ? 'offline' : 'attenzione'} size={32} />
      <p>{testo}</p>
      {onRiprova && (
        <button type="button" className="pulsante pulsante--primario" onClick={onRiprova}>
          {t('comune.riprova')}
        </button>
      )}
    </div>
  )
}
