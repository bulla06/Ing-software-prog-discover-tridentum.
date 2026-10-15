# Frontend v3 — Contenuti in tre lingue e mappa MapTiler con satellite

**Discover Tridentum — Trento Nascosta** · versione del 15 ottobre 2026

Il terzo frontend del sito: parte dal design della v2 e completa i punti rimasti aperti rispetto alla Fase 2 (itinerario su misura, fine dell'itinerario, avvisi di connessione, informativa privacy, "Cosa sto guardando?", PWA, esportazione e importazione). Rispetto alla v2 ha l'interfaccia e i contenuti in **italiano, inglese e tedesco**, lo sfondo della mappa MapTiler senza negozi e bar e il **pulsante per la vista satellitare** (Esri World Imagery).

È una copia del frontend della versione corrente al 15 ottobre 2026, conservata come riferimento. Questa cartella non si modifica.

## Avvio

Il frontend v3 usa il **backend della versione corrente**. Dalla cartella principale del repository:

```bash
npm install                                            # solo la prima volta
npm --prefix versioni-precedenti/frontend-v3 install   # solo la prima volta
npm run dev:v3     # backend + frontend v3 su http://localhost:5177
```

Per confrontarla con la versione corrente si può tenere aperta anche quella: avviare `npm run dev` e, in un secondo terminale, `npm --prefix versioni-precedenti/frontend-v3 run dev` (usa lo stesso backend, sulla porta 5177).

I test di questa versione:

```bash
npm --prefix versioni-precedenti/frontend-v3 test
```

## Nota

La chiave gratuita di MapTiler è in `src/lib/sfondo.js`; con `VITE_MAPTILER_KEY=nessuna` in `.env.local` si torna ai tile di OpenStreetMap. Il backend della versione corrente può continuare a cambiare: le novità dell'API vanno aggiunte senza cambiare le risposte che questo frontend usa, ma la compatibilità con le versioni future non è garantita.
