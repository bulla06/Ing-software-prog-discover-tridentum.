# Frontend v1 — Primo design del sito completo

**Discover Tridentum — Trento Nascosta** · versione del 9 ottobre 2026

Il primo frontend del sito completo: tutte le schermate della Fase 3 (mappa, schede, itinerari, Scopri, Dov'era?, accesso, ricordi, profilo, moderazione, amministrazione) con il primo design. È stato sostituito dal [frontend v2](../frontend-v2), che ha lo stesso backend e le stesse pagine con un design nuovo (vedi il [README principale](../../README.md#le-versioni-del-frontend)).

Questa cartella è conservata come riferimento e non si modifica.

## Avvio

Il frontend v1 usa il **backend della versione corrente**. Dalla cartella principale del repository:

```bash
npm install                                            # solo la prima volta
npm --prefix versioni-precedenti/frontend-v1 install   # solo la prima volta
npm run dev:v1     # backend + frontend v1 su http://localhost:5174
```

Per confrontarla con la versione corrente si può tenere aperta anche quella: avviare `npm run dev` e, in un secondo terminale, `npm --prefix versioni-precedenti/frontend-v1 run dev` (usa lo stesso backend, sulla porta 5174).

I test di questa versione:

```bash
npm --prefix versioni-precedenti/frontend-v1 test
```

## Nota

Questa versione mostra anche le foto dei luoghi con i crediti, aggiunte dopo l'arrivo della v2, e il gioco con le foto storiche. Le novità successive del backend arrivano anche qui se non cambiano l'API; quelle dell'interfaccia si fanno solo nella versione corrente.
