import { useEffect } from 'react'

/** Messaggio temporaneo in basso, letto anche dagli screen reader. */
export default function Avviso({ testo, onChiudi, durata = 3500 }) {
  useEffect(() => {
    if (!testo) return
    const timer = setTimeout(onChiudi, durata)
    return () => clearTimeout(timer)
  }, [testo, onChiudi, durata])

  return (
    <div className="avviso-area" role="status" aria-live="polite">
      {testo && <div className="avviso">{testo}</div>}
    </div>
  )
}
