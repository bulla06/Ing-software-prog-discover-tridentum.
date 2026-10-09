import { useT } from '../i18n/index.jsx'

/** Autore, licenza e fonte di una foto: le licenze libere (CC BY, CC BY-SA) obbligano a citarli */
export default function CreditiFoto({ foto, className = '' }) {
  const { t } = useT()
  return (
    <p className={`crediti-foto ${className}`}>
      {t('scheda.fotoDi', { autore: foto.autore })}
      {' · '}
      {foto.url_licenza ? (
        <a href={foto.url_licenza} target="_blank" rel="noreferrer license">{foto.licenza}</a>
      ) : (
        foto.licenza
      )}
      {foto.fonte && (
        <>
          {' · '}
          <a href={foto.fonte} target="_blank" rel="noreferrer">{t('scheda.fonte')}</a>
        </>
      )}
    </p>
  )
}
