import { NavLink } from 'react-router-dom'
import Icona from './Icona.jsx'
import { useT } from '../i18n/index.jsx'

// Barra fissa in basso con le 5 sezioni (Fase 3 §3.4), usabile con una mano sola (RNF-U01).
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
    <nav className="barra-nav" aria-label="Sezioni">
      {VOCI.map((v) => (
        <NavLink key={v.to} to={v.to} end={v.end} className="barra-nav__voce">
          <Icona nome={v.icona} />
          <span>{t(v.chiave)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
