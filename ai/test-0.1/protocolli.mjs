// Protocolli di prova del test 0.1 (usati da valuta.mjs e costruisci-indice.mjs).
//
// Le foto di uno stesso luogo sono scattate a raffica e sono quasi uguali tra loro: se una foto di prova
// avesse la sua "gemella" tra i riferimenti, il risultato sarebbe gonfiato. Per questo ci sono tre prove:
//  1. una foto alla volta ("leave-one-out"): la più ottimista, serve solo da confronto;
//  2. a blocchi: si tiene da parte un blocco di foto consecutive e si tolgono dai riferimenti anche le
//     SPAZIO foto che lo circondano, così nessuna foto di prova ha una gemella tra i riferimenti;
//  3. con poche foto di riferimento per luogo (1, 2, 3, 5, 8), sempre senza le gemelle: quante foto servono?

import { decidi, mediana, percentuale, punteggi } from './lib.mjs'

export const BLOCCHI = 5
export const SPAZIO = 2
export const CURVA = [1, 2, 3, 5, 8]

/** Foto con la loro impronta (nella variante scelta) e la posizione dentro il luogo */
export function preparaVoci(foto, impronte, variante) {
  const luoghi = [...new Set(foto.map((f) => f.classe))]
  const voci = foto.map((f, i) => ({ ...f, i, v: impronte[f.relativo][variante] }))
  for (const c of luoghi) voci.filter((x) => x.classe === c).forEach((x, p, tutte) => { x.pos = p; x.n = tutte.length })
  return { voci, luoghi }
}

/** Esito di una foto confrontata con i riferimenti: luogo scelto, punteggio e margine, con i due metodi */
export function esito(voce, riferimenti) {
  const p = punteggi(voce.v, riferimenti)
  const compatto = (metodo) => {
    const d = decidi(p, metodo)
    return { classe: d.classe, punteggio: d.punteggio, margine: d.margine, giusta: d.classe === voce.classe }
  }
  return { file: voce.relativo, vera: voce.classe, vicino: compatto('vicino'), prototipo: compatto('prototipo'), classi: p.map((c) => ({ classe: c.classe, vicino: c.vicino })) }
}

export function riassunto(esiti, luoghi) {
  const per = (metodo) => {
    const giuste = esiti.filter((e) => e[metodo].giusta).length
    return {
      n: esiti.length,
      giuste,
      accuratezza: percentuale(giuste, esiti.length),
      margine_mediano: mediana(esiti.map((e) => e[metodo].margine)),
      margine_minimo: esiti.length ? Math.min(...esiti.map((e) => e[metodo].margine)) : null,
      errori: esiti.filter((e) => !e[metodo].giusta).map((e) => e.file),
      per_luogo: Object.fromEntries(luoghi.map((c) => { const dellaClasse = esiti.filter((e) => e.vera === c); return [c, { n: dellaClasse.length, giuste: dellaClasse.filter((e) => e[metodo].giusta).length }] })),
    }
  }
  return { vicino: per('vicino'), prototipo: per('prototipo') }
}

export const unaAllaVolta = (voci) => voci.map((x) => esito(x, voci.filter((y) => y.i !== x.i)))

export function aBlocchi(voci, luoghi) {
  const esiti = []
  for (let f = 0; f < BLOCCHI; f++) {
    const prova = []
    const esclusi = new Set()
    for (const c of luoghi) {
      const dellaClasse = voci.filter((x) => x.classe === c)
      const n = dellaClasse.length
      const da = Math.floor((f * n) / BLOCCHI)
      const a = Math.floor(((f + 1) * n) / BLOCCHI)
      for (const x of dellaClasse) {
        if (x.pos >= da && x.pos < a) prova.push(x)
        if (x.pos >= da - SPAZIO && x.pos < a + SPAZIO) esclusi.add(x.i)
      }
    }
    const riferimenti = voci.filter((x) => !esclusi.has(x.i))
    for (const x of prova) esiti.push({ ...esito(x, riferimenti), blocco: f + 1, riferimenti: riferimenti.length })
  }
  return esiti
}

export function pochiRiferimenti(voci, luoghi, k) {
  const scelti = new Set()
  for (const c of luoghi) {
    const dellaClasse = voci.filter((x) => x.classe === c)
    const n = dellaClasse.length
    for (let j = 0; j < k; j++) scelti.add(dellaClasse[Math.min(n - 1, Math.floor(((j + 0.5) * n) / k))].i)
  }
  const riferimenti = voci.filter((x) => scelti.has(x.i))
  const prova = voci.filter((x) => !scelti.has(x.i) && riferimenti.every((r) => r.classe !== x.classe || Math.abs(r.pos - x.pos) > SPAZIO))
  return { k, riferimenti: riferimenti.length, ...riassunto(prova.map((x) => esito(x, riferimenti)), luoghi) }
}

export const percentile = (valori, p) => {
  const v = [...valori].sort((a, b) => a - b)
  return v.length ? v[Math.min(v.length - 1, Math.floor((p / 100) * v.length))] : null
}

/**
 * Soglie provvisorie per dire "riconosciuto / non sono sicuro / non assomiglia a nessuno", calibrate SOLO
 * sulle foto di riferimento: guardano quanto somigliano alla foto più simile le foto giuste della prova a blocchi.
 */
export function soglieDa(esitiBlocchi) {
  const giusti = esitiBlocchi.filter((e) => e.vicino.giusta)
  const punteggiGiusti = giusti.map((e) => e.vicino.punteggio)
  const giu = (x) => Math.floor(x * 100) / 100
  return {
    nota: 'Provvisorie: calibrate solo sulle foto di riferimento (prova a blocchi), senza foto di altri luoghi.',
    somiglianza_giuste: { minimo: Math.min(...punteggiGiusti), p5: percentile(punteggiGiusti, 5), mediana: mediana(punteggiGiusti) },
    riconosciuto_da: giu(percentile(punteggiGiusti, 5)),
    nessuno_sotto: giu(0.8 * Math.min(...punteggiGiusti)),
    margine_minimo: 0.05,
  }
}
