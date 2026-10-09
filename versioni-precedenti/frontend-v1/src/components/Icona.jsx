// Icone SVG in linea (tratto 2px, 24×24), così non servono librerie esterne.
const PERCORSI = {
  mappa: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14',
  itinerari: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h4m-4 14h4a4 4 0 0 0 4-4V9',
  scopri: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm3.5-12.5-2 5-5 2 2-5 5-2z',
  gioco: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  profilo: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0',
  cerca: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4-4',
  posizione: 'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm0-4a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0-13v3m0 14v3M2 12h3m14 0h3',
  elenco: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  indietro: 'M15 18l-6-6 6-6',
  avanti: 'M9 18l6-6-6-6',
  chiudi: 'M18 6 6 18M6 6l12 12',
  salva: 'M6 3h12v18l-6-4-6 4V3z',
  esterno: 'M14 4h6v6m0-6-9 9m-1-7H5v13h13v-5',
  ricordo: 'M4 7h3l2-3h6l2 3h3v12H4V7zm8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  segnala: 'M5 21V4m0 0h11l-2 4 2 4H5',
  calendario: 'M4 6h16v14H4V6zm0 4h16M8 3v4m8-4v4',
  orologio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v4l3 2',
  scarica: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  lingua: 'M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-10v6m0-9h.01',
}

export default function Icona({ nome, size = 22, className = '' }) {
  return (
    <svg
      className={`icona ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PERCORSI[nome]} />
    </svg>
  )
}
