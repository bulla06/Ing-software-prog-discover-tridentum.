import { describe, expect, it } from 'vitest'
import { RAGGIO_QUI_M, valutaProvenienza } from '../../versione-corrente/frontend/src/lib/provenienza.js'

describe('valutaProvenienza', () => {
  const qui = [46.0670, 11.1214]

  it('una foto appena scattata vale come scattata dove si è ora', () => {
    const p = valutaProvenienza({ origine: 'fotocamera', gps: qui, posizioneAttuale: qui })
    expect(p.tipo).toBe('adesso')
    expect(p.origine).toBe('fotocamera')
  })

  it('una foto della galleria scattata qui vicino', () => {
    const p = valutaProvenienza({ origine: 'libreria', gps: [46.0672, 11.1216], posizioneAttuale: qui })
    expect(p.tipo).toBe('qui')
    expect(p.distanza).toBeLessThan(RAGGIO_QUI_M)
  })

  it('una foto della galleria scattata lontano', () => {
    const p = valutaProvenienza({ origine: 'libreria', gps: [46.1, 11.2], posizioneAttuale: qui })
    expect(p.tipo).toBe('altrove')
    expect(p.distanza).toBeGreaterThan(RAGGIO_QUI_M)
  })

  it('dice quando la foto non contiene la posizione', () => {
    expect(valutaProvenienza({ origine: 'libreria', gps: null, posizioneAttuale: qui }).tipo).toBe('senzaPosizione')
    expect(valutaProvenienza({ origine: 'fotocamera', gps: null, posizioneAttuale: null }).tipo).toBe('senzaPosizione')
  })

  it('non confronta se non si conosce la posizione di chi guarda', () => {
    expect(valutaProvenienza({ origine: 'libreria', gps: qui, posizioneAttuale: null }).tipo).toBe('senzaTua')
  })
})
