import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ErroreCaricamento from '../components/ErroreCaricamento.jsx'
import EsitoFoto from '../components/EsitoFoto.jsx'
import Icona from '../components/Icona.jsx'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import { getPoi } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { CENTRO_TRENTO, formattaDistanza, luoghiInVista } from '../lib/geo.js'
import { leggiDatiFoto, valutaProvenienza } from '../lib/provenienza.js'

const ALTRI_IN_VISTA = 3

/** Direzione della bussola da un evento di orientamento, in gradi da nord (null se non disponibile) */
function direzioneDaEvento(e) {
  // iOS: direzione già riferita al nord
  if (typeof e.webkitCompassHeading === 'number') return e.webkitCompassHeading
  // Altri browser: "alpha" assoluto cresce in senso antiorario; si corregge con la rotazione dello schermo
  if (e.absolute && typeof e.alpha === 'number') {
    const rotazione = window.screen?.orientation?.angle ?? 0
    return (360 - e.alpha + rotazione) % 360
  }
  return null
}

// RF-06 "Cosa sto guardando?": il sito riconosce il luogo che hai davanti dalla tua posizione e dalla direzione
// in cui punta il telefono (bussola), e lo mostra sulla mappa con i luoghi della guida.
// Il calcolo si fa tutto nel browser: né le immagini né la posizione lasciano il dispositivo.
// Il riconoscimento dall'immagine (AI Service, Fase 3 §5.4) potrà aggiungersi senza cambiare questa pagina.
// Si può anche scattare una foto o sceglierla dalla galleria: si controlla da dove viene (scattata ora o dalla
// galleria, e dove: lib/provenienza.js) e si mostrano i luoghi vicini al punto in cui è stata scattata.
export default function Inquadra() {
  const { t, lingua } = useT()
  const navigate = useNavigate()
  const [luoghi, setLuoghi] = useState(null)
  const [errore, setErrore] = useState(null)
  const [tentativo, setTentativo] = useState(0)
  const [posizione, setPosizione] = useState(null)
  const [statoPosizione, setStatoPosizione] = useState('attesa') // attesa | ok | negata
  const [direzione, setDirezione] = useState(null)
  const [bussola, setBussola] = useState('attesa') // attesa | ok | permesso | assente
  const [foto, setFoto] = useState(null) // { anteprima, provenienza, vicini }
  const [erroreFoto, setErroreFoto] = useState(false)
  const inputLibreria = useRef(null)
  const inputTelefono = useRef(null)

  useEffect(() => {
    getPoi().then(setLuoghi, setErrore)
  }, [tentativo, lingua])

  // Posizione aggiornata mentre si cammina
  useEffect(() => {
    if (!('geolocation' in navigator)) return setStatoPosizione('negata')
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setPosizione([coords.latitude, coords.longitude])
        setStatoPosizione('ok')
      },
      () => setStatoPosizione('negata'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  // Bussola: su iOS serve il permesso, chiesto con un tocco (vedi attivaBussola)
  const ascoltaBussola = useCallback(() => {
    const gestore = (e) => {
      const d = direzioneDaEvento(e)
      if (d != null) {
        setDirezione(d)
        setBussola('ok')
      }
    }
    const evento = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation'
    window.addEventListener(evento, gestore)
    // Se entro due secondi non arriva nessuna direzione, il dispositivo non ha la bussola
    const timer = setTimeout(() => setBussola((b) => (b === 'ok' ? b : 'assente')), 2000)
    return () => {
      window.removeEventListener(evento, gestore)
      clearTimeout(timer)
    }
  }, [])

  const smetti = useRef(null)
  useEffect(() => {
    if (typeof window.DeviceOrientationEvent === 'undefined') {
      setBussola('assente')
      return
    }
    if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      setBussola('permesso')
      return
    }
    smetti.current = ascoltaBussola()
    return () => smetti.current?.()
  }, [ascoltaBussola])

  const attivaBussola = async () => {
    try {
      const esito = await window.DeviceOrientationEvent.requestPermission()
      if (esito !== 'granted') return setBussola('assente')
      setBussola('attesa')
      smetti.current?.()
      smetti.current = ascoltaBussola()
    } catch {
      setBussola('assente')
    }
  }

  // Le anteprime sono indirizzi temporanei: si liberano quando cambia la foto o si lascia la pagina
  useEffect(() => () => foto?.anteprima && URL.revokeObjectURL(foto.anteprima), [foto?.anteprima])

  const analizza = async (blob, origine) => {
    // Una foto appena scattata, senza posizione nel file, vale come scattata dove si è ora
    const dati = await leggiDatiFoto(blob)
    const gps = dati.gps ?? (origine === 'telefono' ? posizione : null)
    const origineFoto = origine === 'libreria' ? 'libreria' : 'fotocamera'
    setFoto({
      anteprima: URL.createObjectURL(blob),
      provenienza: valutaProvenienza({ origine: origineFoto, gps, posizioneAttuale: posizione }),
      vicini: gps && luoghi ? luoghiInVista(gps, null, luoghi).slice(0, ALTRI_IN_VISTA) : null,
    })
  }

  const scegli = (origine) => (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    setErroreFoto(false)
    if (file) analizza(file, origine)
  }

  const inVista = useMemo(
    () => (posizione && luoghi ? luoghiInVista(posizione, bussola === 'ok' ? direzione : null, luoghi) : []),
    [posizione, luoghi, direzione, bussola],
  )
  const [primo, ...altri] = inVista

  // La mappa vola sulla tua posizione quando arriva la prima, poi non si sposta più da sola
  const haPosizione = Boolean(posizione)
  const vista = useMemo(() => ({ centro: posizione ?? CENTRO_TRENTO, zoom: 16 }), [haPosizione]) // eslint-disable-line react-hooks/exhaustive-deps
  const segnaposti = useMemo(
    () =>
      (luoghi ?? []).map((p) => ({
        id: p.id,
        posizione: p.posizione,
        titolo: p.nome,
        colore: `var(--c-${p.categoria})`,
        icona: p.categoria,
        attivo: p.id === primo?.poi.id,
      })),
    [luoghi, primo?.poi.id],
  )

  return (
    <div className="inquadra">
      <div className="inquadra__mappa">
        <MappaLeaflet
          etichetta={t('inquadra.mappa')}
          vista={vista}
          segnaposti={segnaposti}
          posizioneUtente={posizione}
          pulsantiZoom={false}
          onClickSegnaposto={(id) => navigate(`/poi/${id}`)}
        />
        {bussola === 'ok' && direzione != null && (
          <span className="inquadra__bussola numero" aria-hidden="true">
            <Icona nome="direzione" size={14} />
            {Math.round(direzione)}°
          </span>
        )}
        <Link className="pulsante-tondo pulsante-tondo--su-mappa" to="/" aria-label={t('inquadra.chiudi')} title={t('inquadra.chiudi')}>
          <Icona nome="chiudi" />
        </Link>
      </div>

      <section className="inquadra__pannello" aria-live="polite">
        <h1>{t('inquadra.titolo')}</h1>

        <div className="inquadra__azioni">
          <button type="button" className="pulsante pulsante--primario" onClick={() => inputTelefono.current?.click()}>
            <Icona nome="ricordo" size={18} />
            {t('inquadra.scatta')}
          </button>
          <button type="button" className="pulsante" onClick={() => inputLibreria.current?.click()}>
            <Icona nome="foto" size={18} />
            {t('inquadra.libreria')}
          </button>
          <input ref={inputLibreria} type="file" accept="image/*" hidden onChange={scegli('libreria')} />
          <input ref={inputTelefono} type="file" accept="image/*" capture="environment" hidden onChange={scegli('telefono')} />
        </div>
        {erroreFoto && (
          <p className="messaggio messaggio--attenzione">
            <Icona nome="attenzione" size={18} />
            <span>{t('inquadra.erroreFoto')}</span>
          </p>
        )}
        {foto && (
          <EsitoFoto
            foto={foto}
            onChiudi={() => setFoto(null)}
            onErrore={() => {
              setFoto(null)
              setErroreFoto(true)
            }}
          />
        )}

        {errore ? (
          <ErroreCaricamento errore={errore} onRiprova={() => setTentativo((n) => n + 1)} />
        ) : statoPosizione === 'negata' ? (
          <p className="messaggio messaggio--attenzione">
            <Icona nome="attenzione" size={18} />
            <span>{t('inquadra.serveLaPosizione')}</span>
          </p>
        ) : !posizione || !luoghi ? (
          <p className="nota nota--senza-margine">{t('inquadra.cerco')}</p>
        ) : primo ? (
          <>
            <p className="etichetta-sezione">{bussola === 'ok' ? t('inquadra.davanti') : t('inquadra.vicino')}</p>
            <Link to={`/poi/${primo.poi.id}`} className="inquadra__risultato" style={{ '--tinta': `var(--c-${primo.poi.categoria})` }}>
              <span className="riga-poi__icona" aria-hidden="true">
                <Icona nome={primo.poi.categoria} size={20} />
              </span>
              <span>
                <strong>{primo.poi.nome}</strong>
                <small className="numero">{t('inquadra.distanza', { d: formattaDistanza(primo.distanza, lingua) })}</small>
              </span>
              <Icona nome="avanti" size={18} />
            </Link>
            {altri.length > 0 && (
              <>
                <p className="etichetta-sezione">{bussola === 'ok' ? t('inquadra.anche') : t('inquadra.altriVicini')}</p>
                <ul className="elenco-semplice">
                  {altri.slice(0, ALTRI_IN_VISTA).map(({ poi, distanza }) => (
                    <li key={poi.id}>
                      <Link to={`/poi/${poi.id}`} className="riga-link">
                        <span className={`riga-poi__punto riga-poi__punto--${poi.categoria}`} aria-hidden="true" />
                        <span>{poi.nome}</span>
                        <small className="numero">{formattaDistanza(distanza, lingua)}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <p className="nota nota--senza-margine">{bussola === 'ok' ? t('inquadra.nienteInVista') : t('inquadra.nienteVicino')}</p>
        )}

        {bussola === 'permesso' && (
          <button type="button" className="pulsante pulsante--primario" onClick={attivaBussola}>
            <Icona nome="direzione" size={18} />
            {t('inquadra.attivaBussola')}
          </button>
        )}
        {bussola === 'assente' && posizione && <p className="nota nota--senza-margine">{t('inquadra.senzaBussola')}</p>}
        <p className="nota nota--senza-margine">
          <Icona nome="privacy" size={16} />
          {t('inquadra.privacy')}
        </p>
      </section>
    </div>
  )
}
