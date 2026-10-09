import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icona from '../components/Icona.jsx'
import SceltaLingua from '../components/SceltaLingua.jsx'
import { esportaGeoJson, getPoiById } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { usePreferiti } from '../lib/preferiti.js'

const REPOSITORY = 'https://github.com/bulla06/Ing-software-prog-test-v1'
const TEAM = ['Manuel Bulla', 'Marco Buffa', 'Pietro Crea']

function scaricaGeoJson() {
  const blob = new Blob([JSON.stringify(esportaGeoJson(), null, 2)], { type: 'application/geo+json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'discover-tridentum-luoghi.geojson'
  a.click()
  URL.revokeObjectURL(url)
}

// S-09 Profilo. Account, contributi e aree di ruolo arriveranno con il backend.
export default function Profilo({ onRivediBenvenuto }) {
  const { t } = useT()
  const { preferiti } = usePreferiti()
  const [luoghiSalvati, setLuoghiSalvati] = useState([])

  useEffect(() => {
    Promise.all(preferiti.map(getPoiById)).then((luoghi) => setLuoghiSalvati(luoghi.filter(Boolean)))
  }, [preferiti])

  return (
    <div className="pagina">
      <header className="intestazione-pagina">
        <h1>{t('profilo.titolo')}</h1>
      </header>

      <section className="riquadro">
        <h2>{t('profilo.account')}</h2>
        <p>{t('profilo.accountTesto')}</p>
        <button type="button" className="pulsante" disabled>
          <Icona nome="profilo" size={18} />
          {t('profilo.accedi')}
        </button>
      </section>

      <section>
        <h2>{t('profilo.lingua')}</h2>
        <SceltaLingua />
      </section>

      <section>
        <h2>{t('profilo.preferiti')}</h2>
        {luoghiSalvati.length === 0 ? (
          <p className="vuoto">{t('profilo.nessunPreferito')}</p>
        ) : (
          <>
            <ul className="elenco-semplice">
              {luoghiSalvati.map((poi) => (
                <li key={poi.id}>
                  <Link to={`/poi/${poi.id}`} className="riga-link">
                    <span className={`riga-poi__punto riga-poi__punto--${poi.categoria}`} aria-hidden="true" />
                    <span>{poi.nome}</span>
                    <Icona nome="avanti" size={16} />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="nota">{t('profilo.soloQui')}</p>
          </>
        )}
      </section>

      <section>
        <h2>{t('profilo.progetto')}</h2>
        <p>{t('profilo.progettoTesto')}</p>
        <p>
          <strong>{t('profilo.team')}:</strong> {TEAM.join(' · ')}
        </p>
        <ul className="elenco-semplice">
          <li>
            <a className="riga-link" href={REPOSITORY} target="_blank" rel="noreferrer">
              <Icona nome="esterno" size={18} />
              <span>{t('profilo.repository')}</span>
            </a>
          </li>
          <li>
            <button type="button" className="riga-link" onClick={scaricaGeoJson}>
              <Icona nome="scarica" size={18} />
              <span>{t('profilo.esporta')}</span>
            </button>
          </li>
          <li>
            <button type="button" className="riga-link" onClick={onRivediBenvenuto}>
              <Icona nome="info" size={18} />
              <span>{t('profilo.benvenuto')}</span>
            </button>
          </li>
        </ul>
        <p className="nota">{t('profilo.mappa')}</p>
      </section>
    </div>
  )
}
