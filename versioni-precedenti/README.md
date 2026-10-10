# Versioni precedenti del sito

Copie delle versioni passate della web app, conservate come riferimento (per esempio per mostrarle all'esame o confrontarle con la versione attuale). Non si modificano: il lavoro si fa in [`versione-corrente/`](../versione-corrente).

| Versione | Cartella | Data | Contenuto | Porta |
|---|---|---|---|---|
| Prototipo | [`prototipo/`](prototipo) | 7 ottobre 2026 | Solo frontend, dati in file JSON, nessun account | 5175 |
| Frontend v1 | [`frontend-v1/`](frontend-v1) | 9 ottobre 2026 | Primo design del sito completo; usa il backend della versione corrente | 5174 |
| Frontend v2 | [`frontend-v2/`](frontend-v2) | 10 ottobre 2026 | Nuovo design, mappa migliorata, gioco con le foto storiche; usa il backend della versione corrente | 5176 |

La versione corrente (frontend v3 e backend) usa la porta 5173: le porte diverse permettono di aprire le versioni affiancate per confrontarle. Ogni versione ha un suo README con le istruzioni per avviarla. La storia completa di ogni file resta comunque in Git.

**Per archiviare la versione corrente** quando ne inizia una nuova: copiare `versione-corrente/frontend` (ed eventualmente `versione-corrente/backend`) in una cartella nuova, darle una porta libera nel `vite.config.js`, aggiungere il README e una riga a questa tabella.
