import { useT } from '../i18n/index.jsx'
import { urlFoto } from '../lib/http.js'

// Testata della scheda: la prima foto pubblicata dalla community (Fase 3 §5.6),
// altrimenti un'illustrazione con il colore della categoria.
export default function Copertina({ poi, compatta = false }) {
  const { t } = useT()
  const foto = poi.copertina ? { backgroundImage: `url(${urlFoto(poi.copertina, compatta ? 'mini' : 'standard')})` } : undefined
  return (
    <div
      className={`copertina copertina--${poi.categoria} ${compatta ? 'copertina--compatta' : ''} ${foto ? 'copertina--foto' : ''}`}
      style={foto}
    >
      <span className="copertina__categoria">{t(`categoria.${poi.categoria}`)}</span>
      {!compatta && poi.epoca && <span className="copertina__epoca">{poi.epoca}</span>}
    </div>
  )
}
