import { useEffect, useState } from 'react'
import { scaricaBlob, urlFoto } from '../lib/http.js'

/**
 * Foto che può essere ancora privata (in attesa di moderazione): si scarica con il token
 * di accesso, perché un normale <img> non lo invierebbe.
 */
export default function FotoProtetta({ id, formato = 'mini', alt = '', className }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    let url
    let attivo = true
    scaricaBlob(urlFoto(id, formato).replace(/^\/api/, '')).then(
      (u) => {
        url = u
        if (attivo) setSrc(u)
      },
      () => {},
    )
    return () => {
      attivo = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [id, formato])

  return src ? <img src={src} alt={alt} className={className} /> : <span className={`${className ?? ''} foto-segnaposto`} aria-hidden="true" />
}
