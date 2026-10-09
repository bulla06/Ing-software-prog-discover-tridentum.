import { useCallback, useState } from 'react'
import { leggi, scrivi } from './memoria.js'

/**
 * Luoghi salvati (RF-09). Senza account restano solo su questo dispositivo;
 * con il backend passeranno su GET/POST /api/me/preferiti.
 */
export function usePreferiti() {
  const [preferiti, setPreferiti] = useState(() => leggi('preferiti', []))

  const alterna = useCallback((id) => {
    setPreferiti((attuali) => {
      const nuovi = attuali.includes(id) ? attuali.filter((p) => p !== id) : [...attuali, id]
      scrivi('preferiti', nuovi)
      return nuovi
    })
  }, [])

  return { preferiti, alterna, salvato: (id) => preferiti.includes(id) }
}
