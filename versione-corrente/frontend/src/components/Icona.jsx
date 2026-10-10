import DISEGNI from './icone-svg.js'

// Icone della libreria Phosphor (https://phosphoricons.com): un'unica famiglia, stesso tratto ovunque.
// I disegni stanno in icone-svg.js, generato da strumenti/genera-icone.mjs con i soli stili usati
// (regular, bold, fill): pesano molto meno del pacchetto React completo (RNF-P01).
// Per aggiungere un'icona: inserirla nell'elenco dello script e rigenerare il file.

export const NOMI_ICONE = Object.keys(DISEGNI)

const disegno = (nome, peso) => {
  const icona = DISEGNI[nome] ?? DISEGNI.info
  return icona[peso] ?? icona.regular
}

/** Markup SVG di un'icona, per l'HTML che non passa da React (i segnaposti della mappa) */
export function svgIcona(nome, { size = 22, peso = 'regular' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${disegno(nome, peso)}</svg>`
}

export default function Icona({ nome, size = 22, peso = 'regular', className = '' }) {
  return (
    <svg
      className={`icona ${className}`}
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      // I disegni sono costanti del sito (icone-svg.js), mai dati degli utenti
      dangerouslySetInnerHTML={{ __html: disegno(nome, peso) }}
    />
  )
}
