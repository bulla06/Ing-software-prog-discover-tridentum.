import { useT } from '../i18n/index.jsx'

// Testata della scheda. Le foto dei luoghi arriveranno con lo storage (Fase 3 §5.6) e
// dopo la verifica dei diritti di riproduzione (RNF-V02): per ora un'illustrazione per categoria.
export default function Copertina({ poi, compatta = false }) {
  const { t } = useT()
  return (
    <div className={`copertina copertina--${poi.categoria} ${compatta ? 'copertina--compatta' : ''}`}>
      <span className="copertina__categoria">{t(`categoria.${poi.categoria}`)}</span>
      {!compatta && poi.epoca && <span className="copertina__epoca">{poi.epoca}</span>}
    </div>
  )
}
