import { useEffect, useState } from 'react'
import foto from '../data/fotoBenvenuto.js'
import { useT } from '../i18n/index.jsx'
import Icona from './Icona.jsx'

const SECONDI = 5

/** Foto di Trento di ieri e di oggi, una alla volta a tutto riquadro, che cambiano da sole */
export default function GalleriaBenvenuto() {
  const { t, lingua } = useT()
  const [corrente, setCorrente] = useState(0)
  const [ferma, setFerma] = useState(false)

  // Chi ha chiesto di ridurre il movimento parte con la presentazione ferma
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setFerma(true)
  }, [])

  useEffect(() => {
    if (ferma) return undefined
    const id = setInterval(() => setCorrente((c) => (c + 1) % foto.length), SECONDI * 1000)
    return () => clearInterval(id)
  }, [ferma])

  const f = foto[corrente]
  const anno = f.anno === null ? t('benvenuto.oggi') : typeof f.anno === 'string' ? f.anno : f.anno[lingua] ?? f.anno.it
  const autore = f.autore === 'Autore sconosciuto' ? t('benvenuto.autoreIgnoto') : f.autore

  return (
    <div className="vetrina" role="group" aria-roledescription="carousel" aria-label={t('benvenuto.foto')}>
      {foto.map((p, i) => (
        <img
          key={p.file}
          className={`vetrina__foto${i === corrente ? ' vetrina__foto--attiva' : ''}`}
          src={`./benvenuto/${p.file}`}
          alt={i === corrente ? `${f.luogo}, ${anno}` : ''}
          aria-hidden={i === corrente ? undefined : 'true'}
          width="960"
          height="720"
          decoding="async"
          draggable="false"
        />
      ))}
      <p className="vetrina__credito" aria-live="off">
        <strong>{f.luogo}</strong> · {anno} · {t('scheda.fotoDi', { autore })} · {f.licenza}
      </p>
      <button
        type="button"
        className="vetrina__pausa"
        onClick={() => setFerma((v) => !v)}
        aria-label={t(ferma ? 'benvenuto.riprendi' : 'benvenuto.pausa')}
        aria-pressed={ferma}
      >
        <Icona nome={ferma ? 'riproduci' : 'pausa'} size={16} peso="bold" />
      </button>
    </div>
  )
}
