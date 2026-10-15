import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Avviso from '../components/Avviso.jsx'
import Campo from '../components/Campo.jsx'
import Finestra from '../components/Finestra.jsx'
import FotoProtetta from '../components/FotoProtetta.jsx'
import Icona from '../components/Icona.jsx'
import SceltaLingua from '../components/SceltaLingua.jsx'
import { URL_GEOJSON, URL_ITINERARI_JSON, cambiaNome, eliminaAccount, getProfilo, scaricaMieiDati } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { messaggioErrore } from '../lib/errori.js'
import { eAmministratore, puoModerare, useSessione } from '../lib/sessione.jsx'
import { useSviluppo } from '../lib/sviluppo.js'

const REPOSITORY = 'https://github.com/bulla06/Ing-software-prog-test-v1'
const TEAM = ['Manuel Bulla', 'Marco Buffa', 'Pietro Crea']

// S-09 Profilo (UC-08): contributi con il loro stato, preferiti, impostazioni,
// eliminazione dell'account e accesso alle aree riservate per ruolo.
export default function Profilo({ onRivediBenvenuto }) {
  const { t, lingua } = useT()
  const { utente, pronta, esci } = useSessione()
  const sviluppo = useSviluppo()
  const [profilo, setProfilo] = useState(null)
  const [eliminazione, setEliminazione] = useState(false)
  const [modificaNome, setModificaNome] = useState(false)
  const [avviso, setAvviso] = useState(null)
  const chiudiAvviso = useCallback(() => setAvviso(null), [])

  useEffect(() => {
    if (!utente) {
      setProfilo(null)
      return
    }
    getProfilo().then(setProfilo, () => setProfilo(null))
  }, [utente, lingua])

  // Diritto di accesso e portabilità (RNF-S04)
  const scaricaDati = () => scaricaMieiDati().catch((err) => setAvviso(messaggioErrore(t, err)))

  return (
    <div className="pagina">
      <header className="intestazione-pagina">
        <h1>{t('profilo.titolo')}</h1>
      </header>

      {!pronta ? (
        <div aria-busy="true" />
      ) : utente ? (
        <section className="riquadro profilo-utente">
          <div className="profilo-utente__nome">
            <span className="avatar" aria-hidden="true">{utente.nome.slice(0, 1).toUpperCase()}</span>
            <div>
              <h2>{utente.nome}</h2>
              <p className="nota">{utente.email} · {t(`ruolo.${utente.ruolo}`)}</p>
            </div>
          </div>
          {(puoModerare(utente) || eAmministratore(utente)) && (
            <ul className="elenco-semplice">
              {puoModerare(utente) && (
                <li>
                  <Link to="/moderazione" className="riga-link">
                    <Icona nome="segnala" size={18} />
                    <span>{t('profilo.moderazione')}</span>
                    <Icona nome="avanti" size={16} />
                  </Link>
                </li>
              )}
              {eAmministratore(utente) && (
                <li>
                  <Link to="/amministrazione" className="riga-link">
                    <Icona nome="mappa" size={18} />
                    <span>{t('profilo.amministrazione')}</span>
                    <Icona nome="avanti" size={16} />
                  </Link>
                </li>
              )}
            </ul>
          )}
          <div className="riga-pulsanti">
            <button type="button" className="pulsante" onClick={() => setModificaNome(true)}>
              <Icona nome="modifica" size={18} />
              {t('profilo.cambiaNome')}
            </button>
            <button type="button" className="pulsante" onClick={esci}>{t('profilo.esci')}</button>
          </div>
        </section>
      ) : (
        <section className="riquadro">
          <h2>{t('profilo.account')}</h2>
          <p>{t('profilo.ospite')}</p>
          <div className="riga-pulsanti">
            <Link className="pulsante pulsante--primario" to="/accesso">{t('accesso.accedi')}</Link>
            <Link className="pulsante" to="/accesso?scheda=registrati">{t('accesso.registrati')}</Link>
          </div>
        </section>
      )}

      {profilo && (
        <>
          <section>
            <h2>{t('profilo.contributi')}</h2>
            {profilo.contributi.length === 0 ? (
              <p className="vuoto">{t('profilo.nessunContributo')}</p>
            ) : (
              <ul className="elenco-schede">
                {profilo.contributi.map((c) => (
                  <li key={c.id} className="contributo">
                    {c.foto && <FotoProtetta id={c.foto} className="contributo__foto" />}
                    <div>
                      <p className={`stato stato--${c.stato}`}>{t(`stato.${c.stato}`)}</p>
                      <Link to={`/poi/${c.poi.id}`} className="contributo__luogo">{c.poi.nome}</Link>
                      {c.testo && <p className="contributo__testo">{c.testo}</p>}
                      <p className="nota">{new Date(c.creato_il).toLocaleDateString(lingua)}{c.anno && ` · ${c.anno}`}</p>
                      {c.stato === 'rifiutato' && c.motivazione && (
                        <p className="messaggio messaggio--errore">{t('profilo.motivazione', { testo: c.motivazione })}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2>{t('profilo.preferiti')}</h2>
            {profilo.preferiti.length === 0 ? (
              <p className="vuoto">{t('profilo.nessunPreferito')}</p>
            ) : (
              <ul className="elenco-semplice">
                {profilo.preferiti.map((p) => (
                  <li key={`${p.tipo}-${p.riferimento}`}>
                    <Link to={p.tipo === 'poi' ? `/poi/${p.riferimento}` : `/itinerari/${p.riferimento}`} className="riga-link">
                      {p.tipo === 'poi' ? (
                        <span className={`riga-poi__punto riga-poi__punto--${p.categoria}`} aria-hidden="true" />
                      ) : (
                        <Icona nome="itinerari" size={18} />
                      )}
                      <span>{p.nome}</span>
                      <Icona nome="avanti" size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section>
        <h2>{t('profilo.lingua')}</h2>
        <SceltaLingua />
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
            <a className="riga-link" href={URL_GEOJSON} download="discover-tridentum-luoghi.geojson">
              <Icona nome="scarica" size={18} />
              <span>{t('profilo.esporta')}</span>
            </a>
          </li>
          <li>
            <a className="riga-link" href={URL_ITINERARI_JSON} download="discover-tridentum-itinerari.json">
              <Icona nome="scarica" size={18} />
              <span>{t('profilo.esportaItinerari')}</span>
            </a>
          </li>
          <li>
            <Link className="riga-link" to="/privacy">
              <Icona nome="privacy" size={18} />
              <span>{t('profilo.privacy')}</span>
            </Link>
          </li>
          <li>
            <button type="button" className="riga-link" onClick={onRivediBenvenuto}>
              <Icona nome="info" size={18} />
              <span>{t('profilo.benvenuto')}</span>
            </button>
          </li>
          {sviluppo && (
            <li>
              <Link className="riga-link" to="/dev/posta">
                <Icona nome="ricordo" size={18} />
                <span>{t('profilo.postaDiProva')}</span>
              </Link>
            </li>
          )}
        </ul>
        <p className="nota">{t('profilo.mappa')}</p>
      </section>

      {utente && (
        <section>
          <h2>{t('profilo.tuoiDati')}</h2>
          <div className="riga-pulsanti">
            <button type="button" className="pulsante" onClick={scaricaDati}>
              <Icona nome="scarica" size={18} />
              {t('profilo.scaricaDati')}
            </button>
            <button type="button" className="collegamento collegamento--pericolo" onClick={() => setEliminazione(true)}>
              {t('profilo.elimina')}
            </button>
          </div>
        </section>
      )}

      <EliminaAccount aperta={eliminazione} onChiudi={() => setEliminazione(false)} />
      <CambiaNome
        aperta={modificaNome}
        onChiudi={() => setModificaNome(false)}
        onCambiato={() => {
          setModificaNome(false)
          setAvviso(t('profilo.nomeCambiato'))
        }}
      />
      <Avviso testo={avviso} onChiudi={chiudiAvviso} />
    </div>
  )
}

// Diritto di rettifica (RNF-S04): il nome visualizzato accanto ai ricordi e in classifica
function CambiaNome({ aperta, onChiudi, onCambiato }) {
  const { t } = useT()
  const { utente, aggiorna } = useSessione()
  const [nome, setNome] = useState('')
  const [errore, setErrore] = useState(null)
  const [occupato, setOccupato] = useState(false)

  useEffect(() => {
    if (aperta) {
      setNome(utente?.nome ?? '')
      setErrore(null)
    }
  }, [aperta, utente])

  const salva = async (e) => {
    e.preventDefault()
    setOccupato(true)
    try {
      const { utente: aggiornato } = await cambiaNome(nome.trim())
      aggiorna(aggiornato)
      onCambiato()
    } catch (err) {
      setErrore(err.campi?.nome ?? messaggioErrore(t, err))
    } finally {
      setOccupato(false)
    }
  }

  return (
    <Finestra titolo={t('profilo.cambiaNome')} aperta={aperta} onChiudi={onChiudi}>
      <form className="modulo" onSubmit={salva}>
        <Campo etichetta={t('accesso.nome')} aiuto={t('accesso.nomeAiuto')} errore={errore}>
          {(p) => <input {...p} type="text" autoComplete="nickname" minLength={2} maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} required />}
        </Campo>
        <div className="modulo__azioni">
          <button type="button" className="pulsante" onClick={onChiudi}>{t('comune.annulla')}</button>
          <button type="submit" className="pulsante pulsante--primario" disabled={occupato || nome.trim().length < 2}>
            {t('comune.salva')}
          </button>
        </div>
      </form>
    </Finestra>
  )
}

// UC-08 passi 3–7: conseguenze, scelta sui contributi e conferma con la password
function EliminaAccount({ aperta, onChiudi }) {
  const { t } = useT()
  const navigate = useNavigate()
  const { dimentica } = useSessione()
  const [password, setPassword] = useState('')
  const [contributi, setContributi] = useState('anonimi')
  const [errore, setErrore] = useState(null)
  const [occupato, setOccupato] = useState(false)

  const conferma = async (e) => {
    e.preventDefault()
    setOccupato(true)
    setErrore(null)
    try {
      await eliminaAccount(password, contributi)
      dimentica()
      onChiudi()
      navigate('/', { replace: true })
    } catch (err) {
      setErrore(messaggioErrore(t, err))
    } finally {
      setOccupato(false)
    }
  }

  return (
    <Finestra titolo={t('elimina.titolo')} aperta={aperta} onChiudi={onChiudi}>
      <form className="modulo" onSubmit={conferma}>
        <p>{t('elimina.spiega')}</p>
        <fieldset className="scelte">
          <legend className="campo__etichetta">{t('elimina.contributi')}</legend>
          {['anonimi', 'rimuovi'].map((s) => (
            <label key={s} className="scelta">
              <input type="radio" name="contributi" checked={contributi === s} onChange={() => setContributi(s)} />
              <span>{t(`elimina.${s}`)}</span>
            </label>
          ))}
        </fieldset>
        <Campo etichetta={t('elimina.password')} errore={errore}>
          {(p) => <input {...p} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
        </Campo>
        <div className="modulo__azioni">
          <button type="button" className="pulsante" onClick={onChiudi}>{t('comune.annulla')}</button>
          <button type="submit" className="pulsante pulsante--pericolo" disabled={occupato || !password}>
            {t('elimina.conferma')}
          </button>
        </div>
      </form>
    </Finestra>
  )
}
