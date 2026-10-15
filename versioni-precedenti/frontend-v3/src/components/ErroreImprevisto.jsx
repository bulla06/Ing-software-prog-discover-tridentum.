import { Component } from 'react'
import { useT } from '../i18n/index.jsx'
import { ricaricaUnaVolta } from '../lib/ricarica.js'
import Icona from './Icona.jsx'

/** Errore nel caricamento di un pezzo di codice del sito: succede dopo un aggiornamento o con la rete che cade */
const erroreDiCodice = (errore) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
    `${errore?.name} ${errore?.message}`,
  )

function Schermata() {
  const { t } = useT()
  return (
    <div className="vuoto vuoto--errore" role="alert">
      <Icona nome="attenzione" size={32} />
      <p>{t('errore.imprevisto')}</p>
      <button type="button" className="pulsante pulsante--primario" onClick={() => window.location.reload()}>
        {t('comune.ricarica')}
      </button>
    </div>
  )
}

/**
 * Evita lo schermo nero: se una pagina va in errore (o il suo codice non si scarica, per esempio
 * dopo un aggiornamento del sito) mostra un avviso con "Ricarica" invece di svuotare tutta l'app.
 * Per gli errori di caricamento del codice la pagina si ricarica da sola, una volta.
 */
export default class ErroreImprevisto extends Component {
  state = { errore: null }

  static getDerivedStateFromError(errore) {
    return { errore }
  }

  componentDidCatch(errore) {
    if (erroreDiCodice(errore)) ricaricaUnaVolta()
    else console.error(errore)
  }

  render() {
    return this.state.errore ? <Schermata /> : this.props.children
  }
}
