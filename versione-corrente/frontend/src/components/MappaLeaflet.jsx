import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TILE_OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUZIONE = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function iconaSegnaposto({ colore, etichetta, tipo = 'poi', attivo = false }) {
  const classi = ['pin', `pin--${tipo}`, attivo ? 'pin--attivo' : ''].join(' ')
  return L.divIcon({
    className: 'pin-contenitore',
    html: `<span class="${classi}" style="--pin:${colore ?? 'var(--primario)'}">${etichetta ?? ''}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

/**
 * Mappa Leaflet riutilizzata da mappa, itinerari e gioco (D-07).
 *
 * - `segnaposti`: [{ id, posizione, titolo, colore, etichetta, tipo, attivo }]
 * - `percorso`: elenco di punti da unire con una linea
 * - `vista`: { centro, zoom } — la mappa ci vola quando l'oggetto cambia
 * - `inquadra`: punti da far entrare nella vista; la mappa li inquadra quando l'elenco cambia
 * - `pulsantiZoom`: mostra i pulsanti + e − (su smartphone basta il pizzico)
 */
export default function MappaLeaflet({
  vista,
  segnaposti = [],
  percorso = null,
  posizioneUtente = null,
  inquadra = null,
  pulsantiZoom = true,
  onClickSegnaposto,
  onClickMappa,
  onErroreMappa,
  etichetta,
}) {
  const contenitore = useRef(null)
  const mappa = useRef(null)
  const livelli = useRef(null)
  // I gestori stanno in un ref: la mappa si crea una volta sola ma usa sempre quelli aggiornati
  const gestori = useRef({})
  gestori.current = { onClickSegnaposto, onClickMappa, onErroreMappa }

  // Creazione della mappa
  useEffect(() => {
    const m = L.map(contenitore.current, { zoomControl: false }).setView(vista.centro, vista.zoom)
    if (pulsantiZoom) L.control.zoom({ position: 'topright' }).addTo(m)

    let errori = 0
    L.tileLayer(TILE_OSM, { maxZoom: 19, attribution: ATTRIBUZIONE })
      .on('tileerror', () => {
        errori += 1
        if (errori === 4) gestori.current.onErroreMappa?.()
      })
      .addTo(m)

    m.on('click', (e) => gestori.current.onClickMappa?.([e.latlng.lat, e.latlng.lng]))
    livelli.current = L.layerGroup().addTo(m)
    mappa.current = m

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
    mappa.current.flyTo(vista.centro, vista.zoom, { duration: 0.6 })
  }, [vista])

  // Segnaposti, percorso e posizione dell'utente
  useEffect(() => {
    const m = mappa.current
    const gruppo = livelli.current
    if (!m) return
    gruppo.clearLayers()

    if (percorso?.length > 1) {
      L.polyline(percorso, { className: 'percorso', weight: 4, dashArray: '2 8', lineCap: 'round', interactive: false }).addTo(gruppo)
    }

    for (const s of segnaposti) {
      L.marker(s.posizione, {
        icon: iconaSegnaposto(s),
        title: s.titolo,
        alt: s.titolo,
        keyboard: Boolean(s.titolo),
        interactive: Boolean(s.titolo),
        zIndexOffset: s.attivo ? 1000 : 0,
      })
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          gestori.current.onClickSegnaposto?.(s.id)
        })
        .addTo(gruppo)
    }

    if (posizioneUtente) {
      L.circleMarker(posizioneUtente, {
        className: 'posizione-utente', radius: 8, weight: 3, fillOpacity: 1, interactive: false,
      }).addTo(gruppo)
    }
  }, [segnaposti, percorso, posizioneUtente])

  // Inquadratura di un gruppo di punti (risultati di una ricerca, tappe di un itinerario…)
  useEffect(() => {
    if (!mappa.current || !inquadra?.length) return
    mappa.current.fitBounds(L.latLngBounds(inquadra), { padding: [56, 56], maxZoom: 17 })
  }, [inquadra])

  return <div ref={contenitore} className="mappa" role="region" aria-label={etichetta} />
}
