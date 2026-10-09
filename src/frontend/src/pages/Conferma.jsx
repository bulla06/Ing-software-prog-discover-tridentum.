import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icona from '../components/Icona.jsx'
import { useT } from '../i18n/index.jsx'
import { messaggioErrore } from '../lib/errori.js'
import { useSessione } from '../lib/sessione.jsx'

// UC-03 passi 6–7: il link nell'e-mail attiva l'account ed effettua l'accesso
export default function Conferma() {
  const { t } = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { confermaEmail } = useSessione()
  const [errore, setErrore] = useState(null)
  const avviata = useRef(false)

  useEffect(() => {
    // Il token vale una volta sola: in sviluppo React esegue gli effetti due volte
    if (avviata.current) return
    avviata.current = true
    confermaEmail(params.get('token') ?? '').then(
      () => {
        let dopo = '/profilo'
        try {
          dopo = sessionStorage.getItem('tridentum:dopo-conferma') || dopo
          sessionStorage.removeItem('tridentum:dopo-conferma')
        } catch {
          // si va al profilo
        }
        navigate(dopo, { replace: true })
      },
      (err) => setErrore(err),
    )
  }, [confermaEmail, navigate, params])

  if (!errore) return <div className="pagina pagina--centrata" aria-busy="true"><p>{t('conferma.inCorso')}</p></div>

  return (
    <div className="pagina pagina--centrata">
      <Icona nome="info" size={44} />
      <p>{messaggioErrore(t, errore)}</p>
      <Link className="pulsante pulsante--primario" to="/accesso">{t('conferma.richiedi')}</Link>
    </div>
  )
}
