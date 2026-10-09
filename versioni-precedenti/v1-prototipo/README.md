# Versione 1 — Primo prototipo

**Discover Tridentum — Trento Nascosta** · versione del 7 ottobre 2026 (commit `bbb70ab`, pull request #2)

Primo prototipo della web app: **solo il frontend**, senza backend né database. I dati dei luoghi sono file JSON in [`src/data/`](src/data).

Questa cartella è conservata come riferimento. La versione su cui si lavora è in [`versione-corrente/`](../../versione-corrente).

## Cosa c'era

| Schermata (Fase 3 §3.2) | Stato |
|---|---|
| S-00 Benvenuto, scelta della lingua (italiano/inglese) | ✅ |
| S-01 Mappa con posizione, S-01L Elenco, S-02 Anteprima | ✅ |
| S-04 Ricerca e filtri per categoria e tema | ✅ |
| S-03 Scheda del luogo, con fonti, luoghi vicini e "Come arrivare" | ✅ |
| S-05 Itinerari con filtro "quanto tempo hai", S-06 Itinerario tappa per tappa | ✅ |
| S-11 Scopri: tradizioni e piatti tipici | ✅ |
| S-10 Dov'era? con indizi testuali e record sul dispositivo | ✅ |
| S-09 Profilo: lingua, luoghi salvati sul dispositivo, export GeoJSON | ✅ |
| S-07 Accesso, S-08 Ricordi, S-13 Moderazione, S-14 Amministrazione | ❌ servivano backend e database |

Contenuti: 19 luoghi, 5 itinerari, 6 tradizioni, 10 piatti, 8 livelli del gioco.

## Avvio

Questa versione è indipendente dal resto del repository. Serve [Node.js](https://nodejs.org) 22 o superiore.

```bash
cd versioni-precedenti/v1-prototipo
npm install
npm run dev        # sito su http://localhost:5173
npm test           # test in tests/
```

Non avviarla insieme alla versione corrente: usano la stessa porta 5173.

## Cosa è cambiato dopo

La [versione corrente](../../versione-corrente) aggiunge il backend Node.js con database PostgreSQL + PostGIS, gli account, i ricordi della community con la moderazione, il pannello di amministrazione, la classifica del gioco, le foto dei luoghi con i crediti e più contenuti. Le differenze rispetto all'architettura della Fase 3 sono le decisioni D-10…D-14 ([Fase 3 §6](../../docs/fase-3-architettura-user-flow.md#6-decisioni-architetturali)).
