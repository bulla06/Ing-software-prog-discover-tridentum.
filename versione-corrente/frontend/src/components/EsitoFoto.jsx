import { Link } from 'react-router-dom'
import { useT } from '../i18n/index.jsx'
import { formattaDistanza } from '../lib/geo.js'
import Icona from './Icona.jsx'

const ICONE = { adesso: 'fatto', qui: 'fatto', altrove: 'attenzione', senzaPosizione: 'info', senzaTua: 'info' }

/** La foto scelta o scattata in "Cosa sto guardando?": da dove viene e quali luoghi ci sono dove è stata scattata */
export default function EsitoFoto({ foto, onChiudi, onErrore }) {
  const { t, lingua } = useT()
  const { anteprima, provenienza, vicini } = foto
  const origine = t(provenienza.origine === 'libreria' ? 'inquadra.origineLibreria' : 'inquadra.origineFotocamera')

  return (
    <div className="esito-foto">
      <img className="esito-foto__anteprima" src={anteprima} alt={t('inquadra.fotoScelta')} onError={onErrore} />
      <div className="esito-foto__corpo">
        <p className={`esito-foto__provenienza esito-foto__provenienza--${provenienza.tipo}`}>
          <Icona nome={ICONE[provenienza.tipo]} size={16} />
          <span>
            {t(`inquadra.prov${provenienza.tipo[0].toUpperCase()}${provenienza.tipo.slice(1)}`, {
              origine,
              d: provenienza.distanza != null ? formattaDistanza(provenienza.distanza, lingua) : '',
            })}
          </span>
        </p>
        {vicini && (
          <>
            <p className="etichetta-sezione">{t('inquadra.luoghiFoto')}</p>
            {vicini.length ? (
              <ul className="elenco-semplice">
                {vicini.map(({ poi, distanza }) => (
                  <li key={poi.id}>
                    <Link to={`/poi/${poi.id}`} className="riga-link">
                      <span className={`riga-poi__punto riga-poi__punto--${poi.categoria}`} aria-hidden="true" />
                      <span>{poi.nome}</span>
                      <small className="numero">{formattaDistanza(distanza, lingua)}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="nota nota--senza-margine">{t('inquadra.nessunLuogoFoto')}</p>
            )}
          </>
        )}
      </div>
      <button type="button" className="esito-foto__chiudi" onClick={onChiudi} aria-label={t('inquadra.chiudiEsito')} title={t('inquadra.chiudiEsito')}>
        <Icona nome="chiudi" size={18} />
      </button>
    </div>
  )
}
