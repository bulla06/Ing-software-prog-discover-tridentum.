import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Campo from '../components/Campo.jsx'
import Icona from '../components/Icona.jsx'
import { nuovoLinkConferma, passwordDimenticata, registrati } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { messaggioErrore } from '../lib/errori.js'
import { useSessione } from '../lib/sessione.jsx'
import { useSviluppo } from '../lib/sviluppo.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

/** Pagina a cui tornare dopo l'accesso: solo percorsi interni, mai indirizzi esterni */
export function destinazione(params) {
  const da = params.get('da')
  return da && da.startsWith('/') && !da.startsWith('//') ? da : '/profilo'
}

// S-07 Accedi / Registrati (UC-03, RF-10, RF-11). Il modulo di registrazione ha 4 campi.
export default function Accesso() {
  const { t } = useT()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { accedi } = useSessione()
  const sviluppo = useSviluppo()

  const scheda = ['registrati', 'dimenticata'].includes(params.get('scheda')) ? params.get('scheda') : 'accedi'
  const [campi, setCampi] = useState({ nome: '', email: '', password: '', privacy: false })
  const [errori, setErrori] = useState({})
  const [messaggio, setMessaggio] = useState(null)
  const [inviato, setInviato] = useState(null) // e-mail a cui è stato mandato il link di conferma
  const [occupato, setOccupato] = useState(false)

  const cambia = (campo) => (e) =>
    setCampi((c) => ({ ...c, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const vaiA = (nuova) => {
    setErrori({})
    setMessaggio(null)
    setParams((p) => {
      const n = new URLSearchParams(p)
      n.set('scheda', nuova)
      return n
    }, { replace: true })
  }

  /** Controlli fatti anche dal server, ripetuti qui per dare subito i messaggi nella lingua scelta */
  function controlla() {
    const e = {}
    if (!EMAIL.test(campi.email.trim())) e.email = t('validazione.email')
    if (scheda === 'registrati') {
      if (campi.nome.trim().length < 2 || campi.nome.trim().length > 40) e.nome = t('validazione.nome')
      if (!PASSWORD.test(campi.password)) e.password = t('validazione.password')
      if (!campi.privacy) e.privacy = t('validazione.privacy')
    } else if (scheda === 'accedi' && !campi.password) {
      e.password = t('validazione.obbligatorio')
    }
    setErrori(e)
    return Object.keys(e).length === 0
  }

  const esegui = (azione) => async (e) => {
    e.preventDefault()
    setMessaggio(null)
    if (!controlla()) return
    setOccupato(true)
    try {
      await azione()
    } catch (err) {
      setErrori(err.campi ?? {})
      setMessaggio({ tipo: 'errore', testo: messaggioErrore(t, err), codice: err.codice })
    } finally {
      setOccupato(false)
    }
  }

  const inviaAccesso = esegui(async () => {
    await accedi(campi.email.trim(), campi.password)
    navigate(destinazione(params), { replace: true })
  })

  const inviaRegistrazione = esegui(async () => {
    await registrati({ nome: campi.nome.trim(), email: campi.email.trim(), password: campi.password, privacy: campi.privacy })
    // Dopo la conferma dell'e-mail si torna alla pagina da cui si era partiti
    try {
      sessionStorage.setItem('tridentum:dopo-conferma', destinazione(params))
    } catch {
      // senza sessionStorage dopo la conferma si va al profilo
    }
    setInviato(campi.email.trim())
  })

  const inviaDimenticata = esegui(async () => {
    await passwordDimenticata(campi.email.trim())
    setMessaggio({ tipo: 'ok', testo: t('accesso.linkInviato') })
  })

  const reinviaConferma = async (email) => {
    await nuovoLinkConferma(email).catch(() => {})
    setMessaggio({ tipo: 'ok', testo: t('accesso.linkInviato') })
  }

  if (inviato) {
    return (
      <div className="pagina pagina--centrata">
        <Icona nome="info" size={44} />
        <h1>{t('accesso.controllaPosta')}</h1>
        <p>{t('accesso.registrato', { email: inviato })}</p>
        {sviluppo && <Link className="pulsante pulsante--primario" to="/dev/posta">{t('profilo.postaDiProva')}</Link>}
        <button type="button" className="collegamento" onClick={() => reinviaConferma(inviato)}>{t('accesso.nuovoLink')}</button>
        {messaggio && <p className="messaggio messaggio--ok" role="status">{messaggio.testo}</p>}
      </div>
    )
  }

  return (
    <div className="pagina pagina--stretta">
      <header className="intestazione-pagina">
        <h1>{scheda === 'dimenticata' ? t('accesso.recupero') : t('accesso.titolo')}</h1>
        <p>{t('accesso.perche')}</p>
      </header>

      {scheda !== 'dimenticata' && (
        <div className="schede-tab" role="tablist">
          {['accedi', 'registrati'].map((s) => (
            <button key={s} type="button" role="tab" aria-selected={scheda === s} className="schede-tab__voce" onClick={() => vaiA(s)}>
              {t(`accesso.${s}`)}
            </button>
          ))}
        </div>
      )}

      <form
        className="modulo"
        noValidate
        onSubmit={scheda === 'accedi' ? inviaAccesso : scheda === 'registrati' ? inviaRegistrazione : inviaDimenticata}
      >
        {scheda === 'registrati' && (
          <Campo etichetta={t('accesso.nome')} aiuto={t('accesso.nomeAiuto')} errore={errori.nome}>
            {(p) => <input {...p} type="text" autoComplete="nickname" maxLength={40} value={campi.nome} onChange={cambia('nome')} />}
          </Campo>
        )}

        <Campo etichetta={t('accesso.email')} errore={errori.email}>
          {(p) => <input {...p} type="email" autoComplete="email" value={campi.email} onChange={cambia('email')} />}
        </Campo>

        {scheda !== 'dimenticata' && (
          <Campo
            etichetta={t('accesso.password')}
            aiuto={scheda === 'registrati' ? t('accesso.passwordAiuto') : undefined}
            errore={errori.password}
          >
            {(p) => (
              <input
                {...p}
                type="password"
                autoComplete={scheda === 'registrati' ? 'new-password' : 'current-password'}
                value={campi.password}
                onChange={cambia('password')}
              />
            )}
          </Campo>
        )}

        {scheda === 'registrati' && (
          <div className={`campo ${errori.privacy ? 'campo--errore' : ''}`}>
            <details className="informativa">
              <summary>{t('accesso.informativa')}</summary>
              <p>{t('accesso.informativaTesto')}</p>
            </details>
            <label className="scelta">
              <input type="checkbox" checked={campi.privacy} onChange={cambia('privacy')} aria-invalid={errori.privacy ? true : undefined} />
              <span>{t('accesso.privacy')}</span>
            </label>
            {errori.privacy && <p className="campo__errore" role="alert">{errori.privacy}</p>}
          </div>
        )}

        {messaggio && (
          <div className={`messaggio messaggio--${messaggio.tipo}`} role={messaggio.tipo === 'errore' ? 'alert' : 'status'}>
            <p>{messaggio.testo}</p>
            {messaggio.codice === 'email_registrata' && (
              <p>
                <button type="button" className="collegamento" onClick={() => vaiA('accedi')}>{t('accesso.accedi')}</button>
                {' · '}
                <button type="button" className="collegamento" onClick={() => vaiA('dimenticata')}>{t('accesso.dimenticata')}</button>
              </p>
            )}
            {messaggio.codice === 'email_non_confermata' && (
              <button type="button" className="collegamento" onClick={() => reinviaConferma(campi.email.trim())}>
                {t('accesso.nuovoLink')}
              </button>
            )}
          </div>
        )}

        <button type="submit" className="pulsante pulsante--primario pulsante--largo" disabled={occupato}>
          {scheda === 'accedi' ? t('accesso.accedi') : scheda === 'registrati' ? t('accesso.crea') : t('accesso.inviaLink')}
        </button>

        {scheda === 'accedi' && (
          <button type="button" className="collegamento" onClick={() => vaiA('dimenticata')}>{t('accesso.dimenticata')}</button>
        )}
        {scheda === 'dimenticata' && (
          <button type="button" className="collegamento" onClick={() => vaiA('accedi')}>{t('accesso.tornaAccesso')}</button>
        )}
        {sviluppo && scheda === 'accedi' && <p className="nota"><Icona nome="info" size={16} />{t('accesso.provaSviluppo')}</p>}
      </form>
    </div>
  )
}
