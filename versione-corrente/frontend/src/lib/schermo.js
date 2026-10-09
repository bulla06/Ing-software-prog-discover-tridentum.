import { useEffect, useState } from 'react'

const LARGO = '(min-width: 1024px)'

/**
 * true da 1024 px in su (layout desktop a due colonne). Serve quando su telefono un blocco
 * deve stare in un punto diverso della pagina: lo si mostra una volta sola, nel posto giusto,
 * invece di duplicarlo e nasconderlo con il CSS.
 */
export function useSchermoLargo() {
  const [largo, setLargo] = useState(() => window.matchMedia?.(LARGO).matches ?? false)
  useEffect(() => {
    const media = window.matchMedia?.(LARGO)
    if (!media) return
    const aggiorna = (e) => setLargo(e.matches)
    media.addEventListener('change', aggiorna)
    return () => media.removeEventListener('change', aggiorna)
  }, [])
  return largo
}

/** Condivide un indirizzo con il menu di condivisione del telefono; dove non c'è, copia il link. */
export async function condividi({ titolo, testo, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title: titolo, text: testo, url })
      return 'condiviso'
    } catch (err) {
      // L'utente ha chiuso il menu: non è un errore
      if (err?.name === 'AbortError') return 'annullato'
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copiato'
  } catch {
    return 'errore'
  }
}
