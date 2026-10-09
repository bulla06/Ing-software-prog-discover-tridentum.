import { useState } from 'react'
import Campo from './Campo.jsx'
import Finestra from './Finestra.jsx'
import { segnalaPoi, segnalaRicordo } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { messaggioErrore } from '../lib/errori.js'

const MOTIVI = ['errato', 'inappropriato', 'altro']

/** Segnalare un errore nella scheda o un ricordo inappropriato (RF-18): non serve l'account */
export default function ModuloSegnalazione({ bersaglio, onChiudi, onInviata }) {
  const { t } = useT()
  const [motivo, setMotivo] = useState('errato')
  const [nota, setNota] = useState('')
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState(null)

  const invia = async (e) => {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    try {
      if (bersaglio.tipo === 'ricordo') await segnalaRicordo(bersaglio.id, { motivo, nota })
      else await segnalaPoi(bersaglio.id, { motivo, nota })
      onInviata()
    } catch (err) {
      setErrore(messaggioErrore(t, err))
    } finally {
      setInvio(false)
    }
  }

  return (
    <Finestra titolo={t('segnala.titolo')} aperta={Boolean(bersaglio)} onChiudi={onChiudi}>
      <form onSubmit={invia} className="modulo">
        <fieldset className="scelte">
          <legend className="campo__etichetta">{t('segnala.motivo')}</legend>
          {MOTIVI.map((m) => (
            <label key={m} className="scelta">
              <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} />
              <span>{t(`segnala.${m}`)}</span>
            </label>
          ))}
        </fieldset>
        <Campo etichetta={t('segnala.nota')}>
          {(props) => <textarea {...props} rows={3} maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} />}
        </Campo>
        {errore && <p className="messaggio messaggio--errore" role="alert">{errore}</p>}
        <div className="modulo__azioni">
          <button type="button" className="pulsante" onClick={onChiudi}>
            {t('comune.annulla')}
          </button>
          <button type="submit" className="pulsante pulsante--primario" disabled={invio}>
            {t('comune.invia')}
          </button>
        </div>
      </form>
    </Finestra>
  )
}
