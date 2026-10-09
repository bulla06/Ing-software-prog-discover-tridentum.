import { LINGUE, useT } from '../i18n/index.jsx'

export default function SceltaLingua() {
  const { t, lingua, setLingua } = useT()
  return (
    <div className="segmentato" role="group" aria-label={t('benvenuto.lingua')}>
      {Object.entries(LINGUE).map(([codice, nome]) => (
        <button
          key={codice}
          type="button"
          className="segmentato__voce"
          aria-pressed={lingua === codice}
          onClick={() => setLingua(codice)}
        >
          {nome}
        </button>
      ))}
    </div>
  )
}
