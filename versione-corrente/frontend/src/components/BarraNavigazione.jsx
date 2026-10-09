import { NavLink } from 'react-router-dom'
import Icona from './Icona.jsx'
import { useT } from '../i18n/index.jsx'

// Le 5 sezioni (Fase 3 §3.4). Su smartphone è la barra fissa in basso, usabile con una
// mano sola (RNF-U01); da 1024 px diventa una colonna a sinistra con il nome dell'app.
const VOCI = [
  { to: '/', chiave: 'nav.mappa', icona: 'mappa', end: true },
  { to: '/itinerari', chiave: 'nav.itinerari', icona: 'itinerari' },
  { to: '/scopri', chiave: 'nav.scopri', icona: 'scopri' },
  { to: '/gioco', chiave: 'nav.gioco', icona: 'gioco' },
  { to: '/profilo', chiave: 'nav.profilo', icona: 'profilo' },
]

export default function BarraNavigazione() {
  const { t } = useT()
  return (
    <nav className="barra-nav" aria-label={t('nav.sezioni')}>
      <div className="barra-nav__marchio">
        <img src="./icon.svg" alt="" width="32" height="32" />
        <span translate="no">Discover Tridentum</span>
      </div>
      {VOCI.map((v) => (
        <NavLink key={v.to} to={v.to} end={v.end} className="barra-nav__voce">
          {({ isActive }) => (
            <>
              <Icona nome={v.icona} size={24} peso={isActive ? 'fill' : 'regular'} />
              <span>{t(v.chiave)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
