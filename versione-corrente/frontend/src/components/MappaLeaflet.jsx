import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import L from '../lib/leaflet.js'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import { ICONE } from './Icona.jsx'

// Sfondo: tile standard di OpenStreetMap (D-07), che non richiedono chiavi. Un filtro CSS
// sui soli tile (classe "sfondo-mappa") li rende più sobri e nel tema scuro li inverte,
// così i segnaposti colorati dell'app si leggono meglio.
const TILE_OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUZIONE = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// Da questo zoom in su accanto ai segnaposti compare il nome del luogo
const ZOOM_ETICHETTE = 17
const CATEGORIE = ['storia', 'arte', 'tradizioni', 'gastronomia']

// I segnaposti di Leaflet sono HTML, non componenti React: l'SVG di ogni icona di categoria
// si disegna una volta sola, al caricamento del modulo, e se ne copia il markup.
function disegna(nome) {
  const Componente = ICONE[nome]
  const div = document.createElement('div')
  const radice = createRoot(div)
  flushSync(() => radice.render(<Componente size={16} weight="bold" aria-hidden="true" />))
  const markup = div.innerHTML
  radice.unmount()
  return markup
}
const SVG_CATEGORIE = Object.fromEntries(CATEGORIE.map((n) => [n, disegna(n)]))

// I nomi dei luoghi arrivano dal database (pannello di amministrazione): vanno "disinnescati"
// prima di finire nell'HTML dei segnaposti
const escape = (testo = '') =>
  String(testo).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function iconaSegnaposto({ colore, etichetta, icona, titolo, tipo = 'poi', attivo = false }) {
  const classi = ['pin', `pin--${tipo}`, attivo ? 'pin--attivo' : ''].join(' ')
  const contenuto = etichetta != null ? escape(etichetta) : (SVG_CATEGORIE[icona] ?? '')
  const nome = tipo === 'poi' && titolo ? `<span class="pin__nome">${escape(titolo)}</span>` : ''
  return L.divIcon({
    className: 'pin-contenitore',
    html: `<span class="${classi}" style="--pin:${colore ?? 'var(--primario)'}">${contenuto}</span>${nome}`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

// Gruppo di luoghi vicini: il numero al centro e un anello diviso tra i colori delle categorie
function iconaGruppo(gruppo) {
  const conteggi = Object.fromEntries(CATEGORIE.map((c) => [c, 0]))
  for (const m of gruppo.getAllChildMarkers()) conteggi[m.options.categoria] = (conteggi[m.options.categoria] ?? 0) + 1
  const totale = gruppo.getChildCount()
  let inizio = 0
  const fette = CATEGORIE.filter((c) => conteggi[c]).map((c) => {
    const fine = inizio + (conteggi[c] / totale) * 360
    const fetta = `var(--c-${c}) ${inizio}deg ${fine}deg`
    inizio = fine
    return fetta
  })
  const dimensione = totale < 5 ? 40 : totale < 15 ? 48 : 56
  return L.divIcon({
    className: 'pin-contenitore',
    html: `<span class="gruppo" style="--anello:conic-gradient(${fette.join(',')});--d:${dimensione}px"><span>${totale}</span></span>`,
    iconSize: [dimensione, dimensione],
    iconAnchor: [dimensione / 2, dimensione / 2],
  })
}

/**
 * Mappa Leaflet riutilizzata da mappa, itinerari, benvenuto e gioco (D-07).
 *
 * - `segnaposti`: [{ id, posizione, titolo, colore, etichetta, icona, categoria, tipo, attivo }]
 * - `raggruppa`: unisce i segnaposti vicini in gruppi con il numero (mappa dei luoghi)
 * - `percorso`: elenco di punti da unire con una linea
 * - `vista`: { centro, zoom }; la mappa ci vola quando l'oggetto cambia
 * - `inquadra`: punti da far entrare nella vista; la mappa li inquadra quando l'elenco cambia
 * - `pulsantiZoom`: mostra i pulsanti + e - (su smartphone basta il pizzico)
 * - `statica`: mappa non interattiva, usata come immagine
 * - `mostra`: { punto, margineAlto, margineBasso }; la mappa si sposta perché il punto sia visibile
 *   fuori dai margini (pannelli sopra la mappa)
 * - `onPronta(mappa)`: riceve l'oggetto Leaflet, per esempio per leggerne il centro
 */
export default function MappaLeaflet({
  vista,
  segnaposti = [],
  raggruppa = false,
  percorso = null,
  posizioneUtente = null,
  inquadra = null,
  mostra = null,
  pulsantiZoom = true,
  statica = false,
  onClickSegnaposto,
  onClickMappa,
  onErroreMappa,
  onPronta,
  etichetta,
  className = '',
}) {
  const contenitore = useRef(null)
  const mappa = useRef(null)
  const livelli = useRef(null)
  const gruppi = useRef(null)
  // I gestori stanno in un ref: la mappa si crea una volta sola ma usa sempre quelli aggiornati
  const gestori = useRef({})
  gestori.current = { onClickSegnaposto, onClickMappa, onErroreMappa }

  // Creazione della mappa
  useEffect(() => {
    const m = L.map(contenitore.current, {
      zoomControl: false,
      attributionControl: !statica,
      dragging: !statica,
      touchZoom: !statica,
      scrollWheelZoom: !statica,
      doubleClickZoom: !statica,
      boxZoom: !statica,
      keyboard: !statica,
    }).setView(vista.centro, vista.zoom)
    if (pulsantiZoom && !statica) L.control.zoom({ position: 'topright' }).addTo(m)

    let errori = 0
    L.tileLayer(TILE_OSM, { maxZoom: 19, attribution: ATTRIBUZIONE, className: 'sfondo-mappa' })
      .on('tileerror', () => {
        errori += 1
        if (errori === 4) gestori.current.onErroreMappa?.()
      })
      .addTo(m)

    m.on('click', (e) => gestori.current.onClickMappa?.([e.latlng.lat, e.latlng.lng]))
    livelli.current = L.layerGroup().addTo(m)
    if (raggruppa) {
      gruppi.current = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 44,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 18,
        iconCreateFunction: iconaGruppo,
        // Con "riduci movimento" niente animazioni di apertura e chiusura dei gruppi
        animate: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
      }).addTo(m)
    }

    // Etichette con il nome dei luoghi solo quando la mappa è abbastanza ingrandita
    const aggiornaEtichette = () => contenitore.current?.classList.toggle('mappa--etichette', m.getZoom() >= ZOOM_ETICHETTE)
    m.on('zoomend', aggiornaEtichette)
    aggiornaEtichette()

    mappa.current = m
    onPronta?.(m)

    // La mappa deve ricalcolare le dimensioni quando il contenitore cambia (es. rotazione)
    const osservatore = new ResizeObserver(() => m.invalidateSize())
    osservatore.observe(contenitore.current)

    return () => {
      osservatore.disconnect()
      // Le animazioni (flyTo, fitBounds) vanno fermate prima: chiudere la mappa a metà
      // di un'animazione fa scattare un errore interno di Leaflet
      m.stop()
      m.off()
      m.remove()
      mappa.current = null
    }
  }, [])

  // Spostamento della vista (la prima vista è già quella di creazione)
  const vistaIniziale = useRef(vista)
  useEffect(() => {
    if (!mappa.current || !vista || vista === vistaIniziale.current) return
    const riduci = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (statica || riduci) mappa.current.setView(vista.centro, vista.zoom)
    else mappa.current.flyTo(vista.centro, vista.zoom, { duration: 0.6 })
  }, [vista, statica])

  // Segnaposti, percorso e posizione dell'utente
  useEffect(() => {
    const m = mappa.current
    if (!m) return
    const gruppo = livelli.current
    gruppo.clearLayers()
    gruppi.current?.clearLayers()

    if (percorso?.length > 1) {
      L.polyline(percorso, { className: 'percorso', weight: 4, dashArray: '1 9', lineCap: 'round', interactive: false }).addTo(gruppo)
    }

    let attivo = null
    const daRaggruppare = []
    for (const s of segnaposti) {
      const cliccabile = Boolean(s.titolo) && !statica
      const marker = L.marker(s.posizione, {
        icon: iconaSegnaposto(s),
        title: s.titolo,
        alt: s.titolo,
        keyboard: cliccabile,
        interactive: cliccabile,
        zIndexOffset: s.attivo ? 1000 : 0,
        categoria: s.categoria ?? s.icona,
      }).on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        gestori.current.onClickSegnaposto?.(s.id)
      })
      if (gruppi.current && s.tipo !== 'ipotesi' && s.tipo !== 'esatto') daRaggruppare.push(marker)
      else marker.addTo(gruppo)
      if (s.attivo) attivo = marker
    }
    gruppi.current?.addLayers(daRaggruppare)

    // Se il luogo selezionato è dentro un gruppo, la mappa si avvicina quanto basta per mostrarlo
    if (attivo && gruppi.current?.hasLayer(attivo)) {
      const visibile = gruppi.current.getVisibleParent(attivo)
      if (visibile && visibile !== attivo) gruppi.current.zoomToShowLayer(attivo)
    }

    if (posizioneUtente) {
      L.circleMarker(posizioneUtente, {
        className: 'posizione-utente', radius: 8, weight: 3, fillOpacity: 1, interactive: false,
      }).addTo(gruppo)
    }
  }, [segnaposti, percorso, posizioneUtente, statica])

  // Luogo selezionato: se non si vede (o finisce sotto i pannelli in alto e in basso, come
  // l'anteprima su telefono) la mappa si sposta quanto basta per mostrarlo
  const chiaveMostra = mostra ? mostra.punto.join(',') : null
  useEffect(() => {
    const m = mappa.current
    if (!m || !mostra) return
    const alto = mostra.margineAlto ?? 24
    const basso = mostra.margineBasso ?? 24
    // Un attimo dopo gli altri aggiornamenti della mappa (segnaposti, gruppi), che altrimenti
    // interromperebbero lo spostamento
    const timer = setTimeout(() => {
      const { x, y } = m.getSize()
      const p = m.latLngToContainerPoint(mostra.punto)
      if (p.x >= 24 && p.x <= x - 24 && p.y >= alto && p.y <= y - basso) return
      // Il punto va al centro dello spazio libero tra i pannelli
      const centroLibero = L.point(x / 2, alto + (y - alto - basso) / 2)
      const nuovoCentro = m.containerPointToLatLng(m.getSize().divideBy(2).add(p.subtract(centroLibero)))
      m.panTo(nuovoCentro, { animate: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches })
    }, 50)
    return () => clearTimeout(timer)
  }, [chiaveMostra])

  // Inquadratura di un gruppo di punti (risultati di una ricerca, tappe di un itinerario...)
  useEffect(() => {
    if (!mappa.current || !inquadra?.length) return
    mappa.current.fitBounds(L.latLngBounds(inquadra), { padding: [56, 56], maxZoom: 17, animate: !statica })
  }, [inquadra, statica])

  return (
    <div
      ref={contenitore}
      className={`mappa ${statica ? 'mappa--statica' : ''} ${className}`}
      role={statica ? 'img' : 'region'}
      aria-label={etichetta}
    />
  )
}
