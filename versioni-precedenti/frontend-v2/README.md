# Frontend v2 — Nuovo design e mappa migliorata

**Discover Tridentum — Trento Nascosta** · versione del 10 ottobre 2026

Il secondo frontend del sito: nuovo design, mappa dei luoghi con i gruppi di segnaposto, esperienza da smartphone, gioco "Dov'era?" in stile GeoGuessr con le foto storiche e foto ufficiali dei luoghi con i crediti. È la versione che il controllo dei requisiti ha confrontato con la Fase 2. È stata sostituita dal [frontend della versione corrente](../../versione-corrente/frontend), che parte da questa e completa i punti di quel documento.

Questa cartella è conservata come riferimento e non si modifica.

## Avvio

Il frontend v2 usa il **backend della versione corrente**. Dalla cartella principale del repository:

```bash
npm install                                            # solo la prima volta
npm --prefix versioni-precedenti/frontend-v2 install   # solo la prima volta
npm run dev:v2     # backend + frontend v2 su http://localhost:5176
```

Per confrontarla con la versione corrente si può tenere aperta anche quella: avviare `npm run dev` e, in un secondo terminale, `npm --prefix versioni-precedenti/frontend-v2 run dev` (usa lo stesso backend, sulla porta 5176).

I test di questa versione:

```bash
npm --prefix versioni-precedenti/frontend-v2 test
```

## Nota

Il backend della versione corrente resta compatibile con questa versione: le novità dell'API sono aggiunte, non cambiano le risposte che questo frontend usa. Le novità dell'interfaccia si fanno solo nella versione corrente.
