# Test 0.1 · Riconoscere due affreschi con DINOv2 small

Primo esperimento per «Cosa sto guardando?» (RF-06): data la foto di un affresco, un modello di intelligenza artificiale dice a quale luogo assomiglia. È una prova a sé, **non è collegata al sito**. Segue l'idea del [§5.4 della Fase 3](../../docs/fase-3-architettura-user-flow.md#54-ai-service) (indice di foto di riferimento, modello di *embedding*, confronto con i luoghi vicini) e fa da piccolo «spike» della [Fase 4](../../docs/fase-4-pianificazione.md) (WBS 10.1).

**Versione:** 0.1 · **Stato:** bozza · **Data:** 16/10/2026

## Risultato in breve

Con 72 foto di due edifici, **Casa Balduini** (piazza Duomo, 23 foto) e **Palazzo Geremia** (via Belenzani, 49 foto), DINOv2 small assegna al luogo giusto **72 foto su 72** nella prova onesta (a blocchi, senza le foto gemelle tra i riferimenti), sia in precisione piena (88 MB) sia a 8 bit (24 MB, quello adatto al browser). Anche con **una sola foto di riferimento per edificio** le foto di prova sono tutte giuste. Dettagli e limiti nel [report](risultati/report.md).

È il caso facile: due edifici molto diversi, foto di una persona e di una giornata. Dice che il metodo funziona, non che riconoscerà bene tutti i luoghi. Con due soli luoghi, poi, il criterio della Fase 4 («almeno 7 luoghi su 10 corretti tra i primi 3») non si può nemmeno applicare: servono almeno 10 luoghi.

## Cosa c'è

| File | A cosa serve |
|---|---|
| `foto/` | Le foto di riferimento, una cartella per luogo (`casa-balduini/`, `palazzo-geremia/`). **Non va su GitHub** (vedi sotto) |
| `nuove/` | Le foto da provare con `prova.mjs` (anche questa non va su GitHub) |
| `costruisci-indice.mjs` | «Addestramento»: calcola l'impronta di ogni foto e salva l'indice (`indice.json`) |
| `valuta.mjs` | Prove oneste sulle foto di riferimento e report in `risultati/` |
| `prova.mjs` | Dice a quale luogo assomiglia una foto nuova |
| `protocolli.mjs`, `lib.mjs` | Le prove e le funzioni in comune (modello, impronte, confronto) |
| `risultati/` | `report.md` e `risultati.json` (e `report.html` con le anteprime, non su GitHub) |

## Come si usa

Serve Node.js 22 o più recente e la rete la prima volta (il modello si scarica da Hugging Face nella cartella `modelli/`: 24 MB a 8 bit, 88 MB in precisione piena).

```bash
cd ai/test-0.1
npm install                      # una volta sola
node costruisci-indice.mjs       # impronte delle foto -> indice.json (modello a 8 bit; --dtype fp32 per quello pieno)
node valuta.mjs                  # prove oneste e report in risultati/
node prova.mjs percorso/foto.jpg # a quale luogo assomiglia una foto nuova
node prova.mjs                   # prova tutte le foto che trova in nuove/
```

`prova.mjs` dà una di tre risposte, con soglie **provvisorie** calcolate solo dalle foto di riferimento (si vedono in `indice.json` e nel report):

- **Riconosciuto**: la foto somiglia molto a un luogo (da 0,77 in su) e l'altro luogo è lontano (margine di almeno 0,05).
- **Non sono sicuro**: somiglia poco, oppure i due luoghi sono vicini.
- **Non assomiglia a nessuno**: la somiglianza è sotto 0,47, molto meno di quella delle foto giuste.

Se la foto che si prova è già tra quelle di riferimento (anche con un altro nome) viene tolta dall'indice insieme alle foto vicine: altrimenti si confronterebbe con se stessa. Per una prova onesta meglio usare foto nuove.

## Come funziona

1. **Impronta.** DINOv2 small ([`onnx-community/dinov2-small`](https://huggingface.co/onnx-community/dinov2-small), circa 22 milioni di parametri) riceve la foto ridotta a 224 × 224 pixel e restituisce un vettore di 384 numeri, l'«impronta»: foto simili hanno impronte vicine (*somiglianza del coseno*, da 0 a 1).
2. **Riconoscimento.** La foto nuova prende il luogo della foto di riferimento più simile.
3. **Nessun addestramento vero.** I pesi del modello non cambiano: «addestrare» vuol dire calcolare e conservare le impronte delle foto di riferimento. Per aggiungere un luogo basta aggiungere una cartella di foto e ricostruire l'indice.
4. **Prova onesta.** Le foto di uno stesso edificio sono scattate a raffica e sono quasi uguali tra loro; per non gonfiare il risultato la prova tiene da parte blocchi di foto consecutive e toglie dai riferimenti anche quelle accanto.

Il modello gira con [Transformers.js](https://github.com/huggingface/transformers.js), la stessa libreria che servirebbe nel browser: così le prove usano lo stesso modello e la stessa preparazione delle immagini.

## Le foto

Sono le foto della cartella Drive «FOTO LUOGHI TN» caricata da Marco: 72 foto scattate il 14/10/2026 tra le 14:45 e le 14:50 con un iPhone 13 (IMG_0297–0319 a Casa Balduini, IMG_0421–0469 a Palazzo Geremia). I nomi dei file sono quelli di Drive.

**Non vanno su GitHub**: dentro hanno posizione GPS, direzione e data (RNF-S05 chiede di togliere i metadati prima di pubblicare una foto) e il repository è pubblico. `foto/` e `nuove/` sono nel `.gitignore`. Per rifare la prova su un altro computer basta scaricarle da Drive e metterle in `foto/<luogo>/`.

## Prossimi passi (0.2)

- **Più luoghi, soprattutto quelli che si somigliano.** In via Belenzani ci sono più palazzi affrescati (Palazzo Quetta Alberti-Colico, Palazzo Thun…): è lì che si vedrà se il metodo regge. Almeno 10 luoghi per applicare il criterio della Fase 4.
- **Più varietà di foto:** altre ore, altri angoli, altre persone e altri telefoni, e anche inquadrature di sbieco o di dettaglio.
- **Casa Balduini non è tra i 45 luoghi del sito:** per riconoscerla nello scanner serve prima la sua scheda.
- **Foto di altri luoghi** (per scegliere bene la soglia del «non assomiglia a nessuno»). In questa prova non sono state usate di proposito.
- **Il browser.** Qui si usa Node.js; nel browser del telefono vanno misurati tempi e consumi. Il sito oggi blocca il WebAssembly e accetta solo file dallo stesso dominio ([app.js](../../versione-corrente/backend/src/app.js)): servirebbero `'wasm-unsafe-eval'` e il modello servito dal nostro server.
- **Ritaglio:** il modello guarda il centro della foto (lato corto a 256 e ritaglio a 224); si può provare la foto intera.

## Licenze

DINOv2 è di Meta; le schede dei modelli su Hugging Face indicano la licenza Apache 2.0, ma va confermata sulla [pagina ufficiale](https://huggingface.co/facebook/dinov2-small) prima di consegnare. Le librerie usate sono `@huggingface/transformers` e `sharp`.
