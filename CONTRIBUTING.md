# Convenzioni del team

Regole condivise per mantenere il repository ordinato e i documenti coerenti tra loro.

## Struttura delle cartelle

| Cartella | Contenuto |
|---|---|
| `docs/` | Documenti di progetto, uno per fase: `fase-N-argomento.md` |
| `docs/libretti/` | Libretto delle attività di ciascun membro: `nome-cognome.docx` |
| `presentazioni/` | Presentazioni: `presentazione-vN.pptx` |
| `versione-corrente/frontend/` | Il sito (React + Vite) |
| `versione-corrente/backend/` | L'API REST e il database (Node.js + Express, PostgreSQL + PostGIS) |
| `versioni-precedenti/` | Copie delle versioni passate del sito (prototipo, frontend v1, frontend v2), da non modificare |
| `tests/frontend/`, `tests/backend/` | I test automatici, separati dal codice |
| `tests/prestazioni/` | Gli script per le misure di prestazioni, accessibilità e carico (non fanno parte di `npm test`) |
| `infrastruttura/` | Configurazione del proxy HTTPS usato da `docker-compose.yml` |

## Nomi dei file

- Solo lettere minuscole, numeri e trattini: `fase-3-architettura.md`, non `Fase 3 Architettura.md`.
- Niente spazi, accenti, virgolette o caratteri speciali (creano problemi a Git e negli URL).
- Le versioni vanno nel nome solo per i file binari (`-v1`, `-v2`); per i file Markdown la storia la tiene Git.

## Documenti di progetto

Ogni documento in `docs/` ha in testa:

- progetto, corso, team;
- **versione** (`0.x` finché è in bozza, `1.0` alla consegna) e **stato** (Bozza · In revisione · Consegnato);
- link al documento precedente e successivo;
- **storico delle revisioni**: versione, data, autore, modifiche.

A ogni modifica sostanziale si aumenta la versione e si aggiunge una riga allo storico.

## Identificatori

Gli ID non si riusano e non si rinumerano: se un elemento viene eliminato, il suo ID resta libero.

| Elemento | Formato | Esempio | Definito in |
|---|---|---|---|
| Problema | `Pn` | P3 | Fase 1 §1.2 |
| Bisogno | `Bn` | B5 | Fase 1 §4.1 |
| Requisito funzionale | `RF-nn` | RF-14 | Fase 2 §2 |
| Requisito non funzionale | `RNF-<area>nn` (U usabilità, P prestazioni, S sicurezza, PO portabilità, V vincoli) | RNF-S02 | Fase 2 §3 |
| Caso d'uso | `UC-nn` | UC-04 | Fase 2 §4 |
| Schermata | `S-nn` | S-03 | Fase 3 §3.2 |
| Decisione architetturale | `D-nn` | D-05 | Fase 3 §6 |
| Pacchetto e task della WBS | `n` e `n.n` | 4.2 | Fase 4 §3 |
| Milestone | `M-n` | M-2 | Fase 4 §4.1 |
| Rischio | `R-nn` | R-08 | Fase 4 §6 |

Ogni requisito rimanda ai bisogni che soddisfa; le matrici di tracciabilità (Fase 2 §5, Fase 3 §9) vanno aggiornate ogni volta che si aggiunge o si modifica un requisito o un caso d'uso.

## Codice

- Avvio in sviluppo dalla cartella principale: `npm install`, poi `npm run dev` (istruzioni complete nel README).
- Nomi di file, variabili, funzioni e commenti in italiano, come nel resto del codice.
- **Schema del database:** ogni modifica è un nuovo file numerato in `versione-corrente/backend/src/db/migrazioni/` (es. `002_aggiungi_orari.sql`). I file già presenti non si modificano: sono già stati applicati ai database degli altri.
- **Dati iniziali:** i luoghi curati dal team stanno in pacchetti numerati, `versione-corrente/backend/src/db/dati/NNN-nome/` (`luoghi.json`, `itinerari.json`, `tradizioni.json`, `piatti.json`, `foto.json` con i file in `foto/`). Ogni pacchetto si carica una sola volta, anche nei database già esistenti; per aggiungere dati si crea un pacchetto nuovo, quelli già caricati non si modificano. Ogni luogo ha almeno una fonte (RNF-V01) e ogni foto indica autore, licenza e fonte.
  - Le voci nuove hanno anche i testi in inglese (`"traduzioni": { "en": { … } }`, RNF-U05).
  - Per correggere voci di pacchetti già caricati: `correzioni.json` (luoghi e tradizioni) e `traduzioni.json` in un pacchetto nuovo, come [`002-correzioni-e-traduzioni`](versione-corrente/backend/src/db/dati/002-correzioni-e-traduzioni). Un luogo già modificato da un amministratore non viene toccato.
  - Le foto da Wikimedia Commons si elencano in `dati/foto-da-scaricare.json` e si scaricano con `npm run scarica-foto`, che crea il pacchetto con i crediti.
  - I livelli di "Dov'era?" stanno in `dati/gioco.json`, con le foto in `dati/foto-gioco/`.
- **Icone:** si usano solo quelle di `Icona.jsx`. Per aggiungerne una si inserisce il nome nell'elenco di `versione-corrente/frontend/strumenti/genera-icone.mjs` e si esegue `npm run genera-icone -w versione-corrente/frontend`.
- Ogni endpoint nuovo ha almeno un test in `tests/backend/`; prima di aprire una pull request `npm test` deve passare.
- Mai segreti nel repository: si usano le variabili d'ambiente (vedi `.env.esempio`).

## Git

- Prima di lavorare: `git pull --rebase`.
- Commit piccoli e con un solo scopo.
- Una issue per ogni task della WBS, con il codice nel titolo (es. `[4.2] Mappa`), e una pull request per issue, approvata da un altro membro (Fase 4 §5).
- Messaggi di commit in italiano, all'imperativo o descrittivi, con la fase se pertinente:
  `Fase 2: aggiungi caso d'uso UC-08`, `Riorganizza la cartella docs`.
- Chi usa strumenti di AI lo indica nel proprio libretto delle attività.

## Libretto delle attività

Ogni membro aggiorna il proprio libretto in `docs/libretti/` con: data, attività, descrizione, file prodotto.
