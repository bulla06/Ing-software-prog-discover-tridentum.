import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Icona from '../components/Icona.jsx'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import { getItinerario } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { formattaDistanza, lunghezzaPercorso } from '../lib/geo.js'
import { usePreferiti } from '../lib/preferiti.js'
import { useSessione } from '../lib/sessione.jsx'

// S-06 Itinerario (RF-07): percorso sulla mappa, tappe numerate e "Prossima tappa".
// La tappa attuale sta nell'URL (?tappa=2): il link si può condividere e "indietro" la ritrova.
// Da 1024 px la mappa resta fissa a sinistra e le tappe scorrono a destra.
export default function Itinerario() {
  const { id } = useParams()
  const { t, lingua } = useT()
  const navigate = useNavigate()
  const [itinerario, setItinerario] = useState(undefined)
  const [params, setParams] = useSearchParams()
  const [vista, setVista] = useState(null)
  const { utente } = useSessione()
  const { salvato, alterna } = usePreferiti()

  useEffect(() => {
    getItinerario(id).then(
      (it) => {
        setItinerario(it)
        setVista(null)
      },
      () => setItinerario(null),
    )
  }, [id])

  const totaleTappe = itinerario?.tappe.length ?? 1
  const attuale = Math.min(Math.max((Number(params.get('tappa')) || 1) - 1, 0), totaleTappe - 1)

  const punti = useMemo(() => itinerario?.tappe.map((p) => p.posizione) ?? [], [itinerario])
  const vistaIniziale = useMemo(() => ({ centro: punti[0], zoom: 16 }), [punti])

  const segnaposti = useMemo(
    () =>
      itinerario?.tappe.map((p, i) => ({
        id: String(i),
        posizione: p.posizione,
        titolo: `${i + 1}. ${p.nome}`,
        etichetta: i + 1,
        tipo: 'tappa',
        attivo: i === attuale,
      })) ?? [],
    [itinerario, attuale],
  )

  if (itinerario === undefined) return <div className="pagina" aria-busy="true" />
  if (itinerario === null) {
    return (
      <div className="pagina pagina--centrata">
        <p>{t('itinerario.nonTrovato')}</p>
        <Link className="pulsante pulsante--primario" to="/itinerari">
          {t('itinerari.titolo')}
        </Link>
      </div>
    )
  }

  const tappa = itinerario.tappe[attuale]
  const totale = itinerario.tappe.length
  const vaiA = (i) => {
    setParams({ tappa: String(i + 1) }, { replace: true })
    setVista({ centro: itinerario.tappe[i].posizione, zoom: 17 })
  }

  return (
    <div className="pagina-itinerario">
      <div className="pagina-itinerario__mappa">
        <Link className="pulsante-tondo pulsante-tondo--su-mappa" aria-label={t('itinerari.titolo')} title={t('itinerari.titolo')} to="/itinerari">
          <Icona nome="indietro" />
        </Link>
        <MappaLeaflet
          etichetta={itinerario.titolo}
          vista={vista ?? vistaIniziale}
          segnaposti={segnaposti}
          percorso={punti}
          inquadra={punti}
          onClickSegnaposto={(i) => vaiA(Number(i))}
        />
      </div>

      <div className="pagina pagina-itinerario__corpo">
        <header className="intestazione-pagina">
          <h1>{itinerario.titolo}</h1>
          <p>{itinerario.descrizione}</p>
          <p className="scheda__meta">
            <Icona nome="orologio" size={16} />
            <span>
              {t('itinerari.durata', { n: itinerario.durata_minuti })} ·{' '}
              {t('itinerario.km', { d: formattaDistanza(lunghezzaPercorso(punti), lingua) })}
            </span>
          </p>
          <button
            type="button"
            className="pulsante"
            aria-pressed={salvato('itinerario', itinerario.id)}
            onClick={() => (utente ? alterna('itinerario', itinerario.id).catch(() => {}) : navigate(`/accesso?da=${encodeURIComponent(`/itinerari/${itinerario.id}`)}`))}
          >
            <Icona nome="salva" size={18} />
            {salvato('itinerario', itinerario.id) ? t('scheda.salvato') : t('scheda.salva')}
          </button>
        </header>

        <section className="tappa-attuale" aria-live="polite">
          <p className="etichetta-sezione">{t('itinerario.tappa', { i: attuale + 1, n: totale })}</p>
          <h2>{tappa.nome}</h2>
          <p>{tappa.sintesi}</p>
          <Link className="collegamento" to={`/poi/${tappa.id}`}>
            {t('itinerario.apri')}
            <Icona nome="avanti" size={16} />
          </Link>
          <div className="tappa-attuale__comandi">
            <button
              type="button"
              className="pulsante pulsante--icona"
              aria-label={t('itinerario.precedente')}
              title={t('itinerario.precedente')}
              disabled={attuale === 0}
              onClick={() => vaiA(attuale - 1)}
            >
              <Icona nome="precedente" size={20} />
            </button>
            <button
              type="button"
              className="pulsante pulsante--primario"
              disabled={attuale === totale - 1}
              onClick={() => vaiA(attuale + 1)}
            >
              {attuale === totale - 1 ? t('itinerario.fine') : t('itinerario.prossima')}
              {attuale < totale - 1 && <Icona nome="avanti" size={18} />}
            </button>
          </div>
        </section>

        <h2 className="etichetta-sezione">{t('itinerario.percorso')}</h2>
        <ol className="tappe">
          {itinerario.tappe.map((p, i) => (
            <li key={p.id + i}>
              <button type="button" className="tappe__voce" aria-current={i === attuale ? 'step' : undefined} onClick={() => vaiA(i)}>
                <span className="tappe__numero">{i + 1}</span>
                <span>
                  <strong>{p.nome}</strong>
                  <small>{t(`categoria.${p.categoria}`)}</small>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
