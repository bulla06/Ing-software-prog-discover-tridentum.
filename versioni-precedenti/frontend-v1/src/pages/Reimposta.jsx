import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Campo from '../components/Campo.jsx'
import { reimpostaPassword } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { messaggioErrore } from '../lib/errori.js'

// UC-03 1b: scelta della nuova password dal link ricevuto per e-mail
export default function Reimposta() {
  const { t } = useT()
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState(null)
  const [fatto, setFatto] = useState(false)

  const invia = async (e) => {
    e.preventDefault()
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) return setErrore(t('validazione.password'))
    try {
      await reimpostaPassword(params.get('token') ?? '', password)
      setFatto(true)
    } catch (err) {
      setErrore(messaggioErrore(t, err))
    }
  }

  if (fatto) {
    return (
      <div className="pagina pagina--centrata">
        <p>{t('reimposta.ok')}</p>
        <Link className="pulsante pulsante--primario" to="/accesso">{t('accesso.accedi')}</Link>
      </div>
    )
  }

  return (
    <div className="pagina pagina--stretta">
      <h1>{t('reimposta.titolo')}</h1>
      <form className="modulo" onSubmit={invia} noValidate>
        <Campo etichetta={t('reimposta.nuova')} aiuto={t('accesso.passwordAiuto')} errore={errore}>
          {(p) => <input {...p} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Campo>
        <button type="submit" className="pulsante pulsante--primario pulsante--largo">{t('comune.salva')}</button>
      </form>
    </div>
  )
}
