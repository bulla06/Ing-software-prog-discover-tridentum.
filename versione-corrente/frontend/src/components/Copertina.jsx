import { useMemo } from 'react'
import Icona from './Icona.jsx'
import { urlFoto } from '../lib/http.js'
import { SFONDO_CON_CHIAVE, urlTessera } from '../lib/sfondo.js'

const ATTRIBUZIONE_BREVE = SFONDO_CON_CHIAVE ? '© MapTiler © OpenStreetMap' : '© OpenStreetMap'

// Testata di un luogo. Se la community ha pubblicato una foto (Fase 3 §5.6) si usa la prima;
// altrimenti un ritaglio della mappa centrato sul POI con il segnaposto della sua categoria:
// un'immagine vera del luogo invece di un riquadro decorativo.
//
// Il ritaglio non usa Leaflet: bastano poche immagini di tile affiancate, molto più leggere
// di una mappa interattiva quando in una pagina ci sono più copertine.

const TILE = 256

function tileDelPunto([lat, lng], zoom) {
  const n = 2 ** zoom
  const x = ((lng + 180) / 360) * n
  const rad = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n
  return { x, y }
}

export default function Copertina({ poi, compatta = false, prioritaria = false }) {
  const stile = { '--pin': `var(--c-${poi.categoria})` }

  if (poi.copertina) {
    return (
      <div className={`copertina copertina--foto ${compatta ? 'copertina--compatta' : ''}`} style={stile}>
        <img
          src={urlFoto(poi.copertina, compatta ? 'mini' : 'standard')}
          alt=""
          width={compatta ? 480 : 1600}
          height={compatta ? 320 : 1067}
          loading={prioritaria ? 'eager' : 'lazy'}
          fetchPriority={prioritaria ? 'high' : 'auto'}
          decoding="async"
        />
      </div>
    )
  }

  return <CopertinaMappa poi={poi} compatta={compatta} prioritaria={prioritaria} stile={stile} />
}

function CopertinaMappa({ poi, compatta, prioritaria, stile }) {
  const zoom = compatta ? 16 : 17
  // Colonne e righe di tile attorno al punto: abbastanza per coprire la copertina più larga
  const raggioX = compatta ? 1 : 2
  const raggioY = 1

  const mosaico = useMemo(() => {
    const { x, y } = tileDelPunto(poi.posizione, zoom)
    const tx = Math.floor(x)
    const ty = Math.floor(y)
    const tiles = []
    for (let dy = -raggioY; dy <= raggioY; dy++) {
      for (let dx = -raggioX; dx <= raggioX; dx++) {
        const sub = 'abc'[Math.abs(tx + dx + ty + dy) % 3]
        tiles.push({
          chiave: `${dx}:${dy}`,
          src: urlTessera(sub, zoom, tx + dx, ty + dy),
          left: (dx + raggioX) * TILE,
          top: (dy + raggioY) * TILE,
        })
      }
    }
    // Il punto viene portato al centro della copertina
    const px = raggioX * TILE + (x - tx) * TILE
    const py = raggioY * TILE + (y - ty) * TILE
    return { tiles, px, py, larghezza: (2 * raggioX + 1) * TILE, altezza: (2 * raggioY + 1) * TILE }
  }, [poi.posizione, zoom, raggioX])

  return (
    <div className={`copertina copertina--mappa ${compatta ? 'copertina--compatta' : ''}`} style={stile}>
      <div
        className="copertina__mosaico sfondo-mappa"
        aria-hidden="true"
        style={{ width: mosaico.larghezza, height: mosaico.altezza, transform: `translate(${-mosaico.px}px, ${-mosaico.py}px)` }}
      >
        {mosaico.tiles.map((t) => (
          <img
            key={t.chiave}
            src={t.src}
            alt=""
            width={TILE}
            height={TILE}
            loading={prioritaria ? 'eager' : 'lazy'}
            decoding="async"
            style={{ left: t.left, top: t.top }}
          />
        ))}
      </div>
      <span className="copertina__pin" aria-hidden="true">
        <Icona nome={poi.categoria} size={compatta ? 16 : 20} peso="bold" />
      </span>
      {!compatta && <span className="copertina__attribuzione">{ATTRIBUZIONE_BREVE}</span>}
    </div>
  )
}
