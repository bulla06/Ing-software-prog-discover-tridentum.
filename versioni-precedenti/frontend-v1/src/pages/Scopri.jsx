import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icona from '../components/Icona.jsx'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import { getGusto, getTradizioni } from '../data/api.js'
import { useT } from '../i18n/index.jsx'

const SCHEDE = ['tradizioni', 'gusto']

// S-11 Scopri: "Tradizioni" per periodo dell'anno (RF-19) e "Mappa del gusto" (RF-20).
export default function Scopri() {
  const { t } = useT()
  const [params, setParams] = useSearchParams()
  const scheda = SCHEDE.includes(params.get('scheda')) ? params.get('scheda') : 'tradizioni'
  const [tradizioni, setTradizioni] = useState([])
  const [gusto, setGusto] = useState({ piatti: [], locali: [] })
  const navigate = useNavigate()

  useEffect(() => {
    getTradizioni().then(setTradizioni, () => {})
    getGusto().then(setGusto, () => {})
  }, [])

  // UC-10 3a: i locali sulla mappa, toccandone uno si apre la scheda
  const segnaposti = useMemo(
    () => gusto.locali.map((l) => ({ id: l.id, posizione: l.posizione, titolo: `${l.nome} — ${l.piatto_consigliato}`, colore: 'var(--c-gastronomia)' })),
    [gusto],
  )
  const inquadra = useMemo(() => (gusto.locali.length ? gusto.locali.map((l) => l.posizione) : null), [gusto])
  const vistaGusto = useMemo(() => ({ centro: [46.0675, 11.1215], zoom: 15 }), [])

  const meseAttuale = new Date().getMonth() + 1
  const adesso = tradizioni.filter((tr) => tr.mesi.includes(meseAttuale))
  const altre = tradizioni.filter((tr) => !tr.mesi.includes(meseAttuale))

  // Tastiera sulle schede: frecce sinistra/destra come nel pattern ARIA "tabs"
  const tastoSchede = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const prossima = SCHEDE[(SCHEDE.indexOf(scheda) + 1) % SCHEDE.length]
    setParams({ scheda: prossima }, { replace: true })
    document.getElementById(`tab-${prossima}`)?.focus()
  }

  return (
    <div className="pagina">
      <header className="intestazione-pagina">
        <h1>{t('scopri.titolo')}</h1>
      </header>

      <div className="schede-tab" role="tablist" onKeyDown={tastoSchede}>
        {SCHEDE.map((s) => (
          <button
            key={s}
            id={`tab-${s}`}
            type="button"
            role="tab"
            aria-selected={scheda === s}
            aria-controls={`pannello-${s}`}
            tabIndex={scheda === s ? 0 : -1}
            className="schede-tab__voce"
            onClick={() => setParams({ scheda: s }, { replace: true })}
          >
            {t(`scopri.${s}`)}
          </button>
        ))}
      </div>

      {scheda === 'tradizioni' ? (
        <div id="pannello-tradizioni" role="tabpanel" aria-labelledby="tab-tradizioni">
          {adesso.length > 0 && (
            <>
              <h2 className="etichetta-sezione">{t('scopri.adesso')}</h2>
              <ul className="elenco-schede">
                {adesso.map((tr) => (
                  <Tradizione key={tr.id} tradizione={tr} evidenza />
                ))}
              </ul>
            </>
          )}
          <ul className="elenco-schede">
            {altre.map((tr) => (
              <Tradizione key={tr.id} tradizione={tr} />
            ))}
          </ul>
        </div>
      ) : (
        <div id="pannello-gusto" role="tabpanel" aria-labelledby="tab-gusto">
          <p className="nota">
            <Icona nome="info" size={16} />
            {t('scopri.gustoNota')}
          </p>
          {gusto.locali.length > 0 && (
            <>
              <div className="mappa-gusto">
                <MappaLeaflet
                  etichetta={t('scopri.gusto')}
                  vista={vistaGusto}
                  segnaposti={segnaposti}
                  inquadra={inquadra}
                  onClickSegnaposto={(id) => navigate(`/poi/${id}`)}
                />
              </div>
              <h2 className="etichetta-sezione">{t('scopri.locali')}</h2>
              <ul className="elenco-semplice">
                {gusto.locali.map((l) => (
                  <li key={l.id}>
                    <Link to={`/poi/${l.id}`} className="riga-link">
                      <span className="riga-poi__punto riga-poi__punto--gastronomia" aria-hidden="true" />
                      <span>
                        <strong>{l.nome}</strong>
                        <br />
                        <small>{t('scopri.consigliato', { piatto: l.piatto_consigliato })}</small>
                      </span>
                      <Icona nome="avanti" size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h2 className="etichetta-sezione">{t('scopri.piatti')}</h2>
          <ul className="griglia-piatti">
            {gusto.piatti.map((piatto) => (
              <li key={piatto.id} className="piatto">
                <small>{piatto.tipo}</small>
                <h2>{piatto.nome}</h2>
                <p>{piatto.descrizione}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Tradizione({ tradizione, evidenza = false }) {
  const { t } = useT()
  return (
    <li className={`tradizione ${evidenza ? 'tradizione--evidenza' : ''}`}>
      <p className="tradizione__periodo">
        <Icona nome="calendario" size={16} />
        {tradizione.periodo}
      </p>
      <h2>{tradizione.nome}</h2>
      <p>{tradizione.descrizione}</p>
      {tradizione.luoghi.length > 0 && (
        <ul className="etichette" aria-label={t('scopri.dove')}>
          {tradizione.luoghi.map((poi) => (
            <li key={poi.id}>
              <Link className="chip chip--piccolo" to={`/poi/${poi.id}`}>
                <Icona nome="posizione" size={14} />
                {poi.nome}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
