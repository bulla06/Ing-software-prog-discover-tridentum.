import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Campo from '../components/Campo.jsx'
import Icona from '../components/Icona.jsx'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import { getPoiById, inviaRicordo } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { messaggioErrore } from '../lib/errori.js'
import { DIMENSIONE_MASSIMA, FORMATI_AMMESSI, comprimiFoto } from '../lib/immagini.js'
import { useSessione } from '../lib/sessione.jsx'

const LICENZE = ['cc-by', 'cc-by-nc', 'riservata']

// S-08 Aggiungi un ricordo (UC-04, RF-14, RF-15): dalla scheda all'invio in tre passaggi (RNF-U02).
export default function AggiungiRicordo() {
  const { id } = useParams()
  const { t } = useT()
  const { utente, pronta } = useSessione()

  const [poi, setPoi] = useState(null)
  const [foto, setFoto] = useState(null) // { file, anteprima }
  const [testo, setTesto] = useState('')
  const [anno, setAnno] = useState('')
  const [licenza, setLicenza] = useState('cc-by')
  const [consensoGioco, setConsensoGioco] = useState(false)
  // RF-23: punto in cui è stata scattata la foto, facoltativo, solo per il gioco
  const [scatto, setScatto] = useState(null)
  const vistaScatto = useMemo(() => (poi ? { centro: poi.posizione, zoom: 17 } : null), [poi])
  const segnapostoScatto = useMemo(() => (scatto ? [{ id: 'scatto', posizione: scatto, tipo: 'ipotesi' }] : []), [scatto])
  const [errori, setErrori] = useState({})
  const [stato, setStato] = useState('modulo') // modulo | compressione | invio | inviato
  const [erroreInvio, setErroreInvio] = useState(null)

  useEffect(() => {
    getPoiById(id).then(setPoi, () => setPoi(false))
  }, [id])

  // L'anteprima è un URL locale da liberare quando cambia la foto
  useEffect(() => () => foto && URL.revokeObjectURL(foto.anteprima), [foto])

  const da = encodeURIComponent(`/poi/${id}/ricordo`)

  if (!pronta || poi === null) return <div className="pagina" aria-busy="true" />
  if (poi === false) {
    return (
      <div className="pagina pagina--centrata">
        <p>{t('scheda.nonTrovato')}</p>
        <Link className="pulsante pulsante--primario" to="/">{t('scheda.tornaMappa')}</Link>
      </div>
    )
  }

  // 1a: senza accesso si passa da S-07 e poi si torna qui
  if (!utente) {
    return (
      <div className="pagina pagina--centrata">
        <Icona nome="ricordo" size={44} />
        <h1>{t('ricordo.titolo')}</h1>
        <p className="vuoto">{t('ricordo.serveAccesso')}</p>
        <Link className="pulsante pulsante--primario pulsante--largo" to={`/accesso?da=${da}`}>
          {t('profilo.accedi')}
        </Link>
        <Link className="collegamento" to={`/poi/${id}`}>{t('ricordo.torna')}</Link>
      </div>
    )
  }

  if (stato === 'inviato') {
    return (
      <div className="pagina pagina--centrata">
        <Icona nome="ricordo" size={44} />
        <h1>{t('ricordo.grazie')}</h1>
        <p>{t('ricordo.inviato')}</p>
        <Link className="pulsante pulsante--primario pulsante--largo" to={`/poi/${id}`}>{t('ricordo.torna')}</Link>
        <Link className="collegamento" to="/profilo">{t('ricordo.vediProfilo')}</Link>
      </div>
    )
  }

  const scegliFoto = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // E1: formato o dimensione non ammessi
    if (!FORMATI_AMMESSI.includes(file.type)) return setErrori({ foto: t('errore.foto_non_valida') })
    if (file.size > DIMENSIONE_MASSIMA) return setErrori({ foto: t('errore.foto_troppo_grande') })
    setErrori({})
    setFoto({ file, anteprima: URL.createObjectURL(file) })
  }

  const invia = async (e) => {
    e.preventDefault()
    // E2: servono la foto o il testo
    if (!foto && !testo.trim()) return setErrori({ testo: t('ricordo.serveTestoOFoto') })
    setErrori({})
    setErroreInvio(null)
    try {
      const dati = new FormData()
      if (foto) {
        setStato('compressione')
        dati.append('foto', await comprimiFoto(foto.file), 'foto.jpg')
      }
      dati.append('testo', testo.trim())
      dati.append('anno', anno.trim())
      dati.append('licenza', licenza)
      dati.append('consenso_gioco', String(Boolean(foto) && consensoGioco))
      if (foto && consensoGioco && scatto) {
        dati.append('lat', String(scatto[0]))
        dati.append('lng', String(scatto[1]))
      }
      setStato('invio')
      await inviaRicordo(id, dati)
      setStato('inviato')
    } catch (err) {
      // E4: i dati restano nel modulo e si può riprovare
      setStato('modulo')
      setErrori(err.campi ?? {})
      setErroreInvio(messaggioErrore(t, err))
    }
  }

  const occupato = stato !== 'modulo'

  return (
    <div className="pagina">
      <header className="intestazione-pagina">
        <Link className="collegamento" to={`/poi/${id}`}>
          <Icona nome="indietro" size={16} />
          {poi.nome}
        </Link>
        <h1>{t('ricordo.titolo')}</h1>
        <p>{t('ricordo.intro')}</p>
      </header>

      <form className="modulo" onSubmit={invia} noValidate>
        <div className={`campo ${errori.foto ? 'campo--errore' : ''}`}>
          <span className="campo__etichetta">{t('ricordo.foto')}</span>
          {foto ? (
            <div className="anteprima-foto">
              <img src={foto.anteprima} alt="" />
              <div className="anteprima-foto__azioni">
                <label className="pulsante">
                  <input type="file" accept={FORMATI_AMMESSI.join(',')} onChange={scegliFoto} className="nascosto" />
                  {t('ricordo.cambiaFoto')}
                </label>
                <button type="button" className="pulsante" onClick={() => setFoto(null)}>{t('ricordo.togliFoto')}</button>
              </div>
            </div>
          ) : (
            <label className="scegli-foto">
              <input type="file" accept={FORMATI_AMMESSI.join(',')} onChange={scegliFoto} className="nascosto" />
              <Icona nome="ricordo" size={28} />
              <span>{t('ricordo.scegliFoto')}</span>
            </label>
          )}
          <p className="campo__aiuto">{t('ricordo.fotoAiuto')}</p>
          {errori.foto && <p className="campo__errore" role="alert">{errori.foto}</p>}
        </div>

        <Campo etichetta={t('ricordo.testo')} aiuto={t('ricordo.testoAiuto')} errore={errori.testo}>
          {(props) => <textarea {...props} name="testo" rows={5} maxLength={2000} value={testo} onChange={(e) => setTesto(e.target.value)} />}
        </Campo>

        <Campo etichetta={t('ricordo.anno')} aiuto={t('ricordo.annoEsempio')} errore={errori.anno}>
          {(props) => <input {...props} type="text" name="anno" autoComplete="off" maxLength={30} value={anno} onChange={(e) => setAnno(e.target.value)} />}
        </Campo>

        <fieldset className="scelte">
          <legend className="campo__etichetta">{t('ricordo.licenza')}</legend>
          {LICENZE.map((l) => (
            <label key={l} className="scelta scelta--descritta">
              <input type="radio" name="licenza" value={l} checked={licenza === l} onChange={() => setLicenza(l)} />
              <span>
                <strong>{t(`licenza.${l}`)}</strong>
                <small>{t(`licenza.${l}.spiega`)}</small>
              </span>
            </label>
          ))}
        </fieldset>

        {foto && (
          <label className="scelta">
            <input type="checkbox" checked={consensoGioco} onChange={(e) => setConsensoGioco(e.target.checked)} />
            <span>{t('ricordo.gioco')}</span>
          </label>
        )}

        {foto && consensoGioco && (
          <div className="campo">
            <span className="campo__etichetta" id="titolo-scatto">{t('ricordo.scatto')}</span>
            <p className="campo__aiuto">{t('ricordo.scattoAiuto')}</p>
            <div className="mappa-scatto" aria-labelledby="titolo-scatto">
              <MappaLeaflet etichetta={t('ricordo.scatto')} vista={vistaScatto} segnaposti={segnapostoScatto} onClickMappa={setScatto} />
            </div>
            {scatto && (
              <button type="button" className="collegamento" onClick={() => setScatto(null)}>
                {t('ricordo.togliScatto')}
              </button>
            )}
          </div>
        )}

        {erroreInvio && <p className="messaggio messaggio--errore" role="alert">{erroreInvio}</p>}

        <button type="submit" className="pulsante pulsante--primario pulsante--largo" disabled={occupato}>
          {stato === 'compressione' ? t('ricordo.compressione') : stato === 'invio' ? t('ricordo.invio') : t('ricordo.invia')}
        </button>
        <p className="nota">
          <Icona nome="info" size={16} />
          {t('ricordo.moderazione')}
        </p>
      </form>
    </div>
  )
}
