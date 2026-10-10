import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icona from '../components/Icona.jsx'
import { getInformazioni } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import TESTI from '../i18n/informativa.js'

// Tempi usati finché il server non risponde: gli stessi di backend/src/servizi/pulizia.js
const CONSERVAZIONE_PREDEFINITA = { account_non_confermati_giorni: 30, contenuti_non_pubblicati_giorni: 90, sessione_giorni: 30 }

/** Testo con **grassetto** e segnaposti {nome} sostituiti */
function Testo({ testo, valori }) {
  const pieno = testo.replace(/\{(\w+)\}/g, (_, k) => valori[k] ?? '')
  return pieno.split(/\*\*(.+?)\*\*/).map((parte, i) => (i % 2 ? <strong key={i}>{parte}</strong> : <Fragment key={i}>{parte}</Fragment>))
}

// Informativa privacy (RNF-S04): raggiungibile da registrazione e profilo, anche senza account
export default function Informativa() {
  const { t, lingua } = useT()
  const [informazioni, setInformazioni] = useState(null)
  const testi = TESTI[lingua] ?? TESTI.it

  useEffect(() => {
    getInformazioni().then(setInformazioni, () => setInformazioni(null))
  }, [])

  const conservazione = informazioni?.conservazione ?? CONSERVAZIONE_PREDEFINITA
  const valori = {
    contatto: informazioni?.contatto_privacy ?? testi.contattoMancante,
    account: conservazione.account_non_confermati_giorni,
    contenuti: conservazione.contenuti_non_pubblicati_giorni,
    sessione: conservazione.sessione_giorni,
  }

  return (
    <article className="pagina pagina--testo">
      <header className="intestazione-pagina">
        <Link className="collegamento" to="/profilo">
          <Icona nome="indietro" size={16} />
          {t('profilo.titolo')}
        </Link>
        <h1>{testi.titolo}</h1>
        <p className="nota nota--senza-margine">{testi.aggiornata}</p>
      </header>
      <p>{testi.intro}</p>
      {testi.sezioni.map((s) => (
        <section key={s.titolo} className="testo">
          <h2>{s.titolo}</h2>
          {s.testi?.map((p) => (
            <p key={p}>
              <Testo testo={p} valori={valori} />
            </p>
          ))}
          {s.elenco && (
            <ul className="elenco-puntato">
              {s.elenco.map((p) => (
                <li key={p}>
                  <Testo testo={p} valori={valori} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  )
}
