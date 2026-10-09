import { useEffect, useState } from 'react'
import { getStato } from '../data/api.js'

let promessa = null

/** true se il backend gira in modalità sviluppo (posta di prova, account dimostrativi) */
export function useSviluppo() {
  const [sviluppo, setSviluppo] = useState(false)
  useEffect(() => {
    promessa ??= getStato().then((s) => s.sviluppo, () => false)
    promessa.then(setSviluppo)
  }, [])
  return sviluppo
}
