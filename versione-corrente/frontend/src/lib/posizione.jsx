import { createContext, useCallback, useContext, useState } from 'react'
import { CENTRO_TRENTO, distanzaMetri } from './geo.js'

// Oltre questa distanza da Piazza Duomo l'utente non è a Trento: le distanze
// "da te" non avrebbero senso e si calcolano dal centro.
const RAGGIO_TRENTO_M = 15000

const PosizioneContext = createContext(null)

/**
 * Posizione dell'utente condivisa tra le pagine.
 * stato: 'sconosciuta' | 'attesa' | 'ok' | 'lontano' | 'negata'
 */
export function PosizioneProvider({ children }) {
  const [stato, setStato] = useState('sconosciuta')
  const [coordinate, setCoordinate] = useState(null)

  const richiedi = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStato('negata')
      return
    }
    setStato('attesa')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const punto = [coords.latitude, coords.longitude]
        setCoordinate(punto)
        setStato(distanzaMetri(punto, CENTRO_TRENTO) > RAGGIO_TRENTO_M ? 'lontano' : 'ok')
      },
      () => setStato('negata'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  // Punto da cui misurare le distanze: l'utente se è a Trento, altrimenti Piazza Duomo
  const origine = stato === 'ok' ? coordinate : CENTRO_TRENTO

  return (
    <PosizioneContext.Provider value={{ stato, coordinate, origine, richiedi }}>
      {children}
    </PosizioneContext.Provider>
  )
}

export function usePosizione() {
  return useContext(PosizioneContext)
}
