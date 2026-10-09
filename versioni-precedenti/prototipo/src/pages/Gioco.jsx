import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icona from '../components/Icona.jsx'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import { getPartita } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { CENTRO_TRENTO, PUNTEGGIO_MAX, distanzaMetri, formattaDistanza, punteggio } from '../lib/geo.js'
import { leggi, scrivi } from '../lib/memoria.js'

const LIVELLI_PER_PARTITA = 5
const VISTA_GIOCO = { centro: CENTRO_TRENTO, zoom: 15 }

// S-10 Dov'era? (RF-21). Senza account il record resta su questo dispositivo;
// salvataggio dei punteggi e classifica (RF-22) arriveranno con il backend.
export default function Gioco() {
  const { t, lingua } = useT()
  const [fase, setFase] = useState('intro') // intro | gioca | fine
  const [livelli, setLivelli] = useState([])
  const [indice, setIndice] = useState(0)
  const [ipotesi, setIpotesi] = useState(null)
  const [risultati, setRisultati] = useState([])
  const [record, setRecord] = useState(() => leggi('record-gioco', 0))
  const [nuovoRecord, setNuovoRecord] = useState(false)
  const [vista, setVista] = useState(VISTA_GIOCO)

  const livello = livelli[indice]
  const risultato = risultati[indice]
  const confermato = Boolean(risultato)

  const inizia = async () => {
    setLivelli(await getPartita(LIVELLI_PER_PARTITA))
    setIndice(0)
    setIpotesi(null)
    setRisultati([])
    setNuovoRecord(false)
    setFase('gioca')
  }

  const conferma = () => {
    const metri = distanzaMetri(ipotesi, livello.poi.posizione)
    setRisultati((r) => [...r, { livello, metri, punti: punteggio(metri) }])
  }

  const avanti = () => {
    if (indice < livelli.length - 1) {
      setIndice(indice + 1)
      setIpotesi(null)
      setVista({ ...VISTA_GIOCO })
      return
    }
    const totale = risultati.reduce((s, r) => s + r.punti, 0)
    if (totale > record) {
      setRecord(totale)
      scrivi('record-gioco', totale)
      setNuovoRecord(true)
    }
    setFase('fine')
  }

  const segnaposti = useMemo(() => {
    const s = []
    if (ipotesi) s.push({ id: 'ipotesi', posizione: ipotesi, tipo: 'ipotesi' })
    if (confermato) s.push({ id: 'esatto', posizione: livello.poi.posizione, tipo: 'esatto', titolo: livello.poi.nome })
    return s
  }, [ipotesi, confermato, livello])

  const inquadra = useMemo(
    () => (confermato ? [ipotesi, livello.poi.posizione] : null),
    [confermato, ipotesi, livello],
  )

  if (fase === 'intro') {
    return (
      <div className="pagina pagina--centrata gioco-intro">
        <Icona nome="gioco" size={48} />
        <h1>{t('gioco.titolo')}</h1>
        <p>{t('gioco.intro')}</p>
        {record > 0 && <p className="gioco-record">{t('gioco.record', { n: record })}</p>}
        <button type="button" className="pulsante pulsante--primario pulsante--largo" onClick={inizia}>
          {t('gioco.inizia')}
        </button>
        <p className="nota">
          <Icona nome="info" size={16} />
          {t('gioco.fotoInArrivo')}
        </p>
      </div>
    )
  }

  if (fase === 'fine') {
    const totale = risultati.reduce((s, r) => s + r.punti, 0)
    return (
      <div className="pagina gioco-fine">
        <header className="intestazione-pagina">
          <h1>{t('gioco.totale')}</h1>
          <p className="gioco-fine__totale">
            <strong>{totale.toLocaleString(lingua)}</strong> / {(PUNTEGGIO_MAX * risultati.length).toLocaleString(lingua)}
          </p>
          <p className="gioco-record">{nuovoRecord ? t('gioco.nuovoRecord') : t('gioco.record', { n: record })}</p>
        </header>
        <ol className="esiti">
          {risultati.map(({ livello: l, metri, punti }) => (
            <li key={l.id}>
              <span>
                <strong>{l.poi.nome}</strong>
                <small>{t('gioco.esito', { d: formattaDistanza(metri, lingua) })}</small>
              </span>
              <span className="esiti__punti">{t('gioco.punti', { n: punti })}</span>
              <Link to={`/poi/${l.poi.id}`} className="collegamento">
                {t('gioco.scopri')}
              </Link>
            </li>
          ))}
        </ol>
        <button type="button" className="pulsante pulsante--primario pulsante--largo" onClick={inizia}>
          {t('gioco.rigioca')}
        </button>
        <p className="nota">
          <Icona nome="info" size={16} />
          {t('gioco.classifica')}
        </p>
      </div>
    )
  }

  return (
    <div className="pagina-gioco">
      <section className="indizio" aria-live="polite">
        <p className="etichetta-sezione">
          {t('gioco.round', { i: indice + 1, n: livelli.length })} · {livello.anno}
        </p>
        <p className="indizio__testo">{livello.indizio}</p>
      </section>

      <div className="pagina-gioco__mappa">
        <MappaLeaflet
          etichetta={t('gioco.tocca')}
          vista={vista}
          segnaposti={segnaposti}
          percorso={confermato ? [ipotesi, livello.poi.posizione] : null}
          inquadra={inquadra}
          onClickMappa={(punto) => !confermato && setIpotesi(punto)}
        />
      </div>

      <div className="pannello-gioco">
        {confermato ? (
          <>
            <p>
              <strong>{livello.poi.nome}</strong> — {t('gioco.esito', { d: formattaDistanza(risultato.metri, lingua) })}
            </p>
            <p className="pannello-gioco__punti">{t('gioco.punti', { n: risultato.punti })}</p>
            <button type="button" className="pulsante pulsante--primario pulsante--largo" onClick={avanti}>
              {indice < livelli.length - 1 ? t('gioco.prossimo') : t('gioco.risultati')}
            </button>
          </>
        ) : (
          <>
            {!ipotesi && <p className="pannello-gioco__aiuto">{t('gioco.tocca')}</p>}
            <button
              type="button"
              className="pulsante pulsante--primario pulsante--largo"
              disabled={!ipotesi}
              onClick={conferma}
            >
              {t('gioco.conferma')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
