# Discover Tridentum — Trento Nascosta

> La guida che racconta la città che non trovi su Google.

Web app per esplorare Trento: inquadra monumenti e affreschi e scopri la loro storia, anche quella che non si legge nelle guide classiche.

Progetto del corso di **Ingegneria del Software** · Prof. Paolo Giorgini · Università di Trento · A.A. 2026-2027

---

## Il problema

Il Trentino-Alto Adige è la seconda regione più visitata d'Italia, e Trento accoglie circa **1,4 milioni di turisti l'anno**, con una permanenza media di **2,7 giorni**.

Della storia della città però si racconta quasi solo il Concilio e il passato austriaco. Resta fuori la parte più "cittadina":

- la Tridentum romana;
- i bombardamenti della Seconda guerra mondiale e la ricostruzione;
- lo spostamento degli argini dell'Adige.

Anche gli affreschi del centro storico sono tantissimi, ma difficili da identificare e da cercare online.

## La soluzione

Una guida turistica da tasca, ma tutto tranne che convenzionale: dà ai turisti idee su cosa fare durante la permanenza e colma il vuoto sulla storia meno raccontata. I contenuti crescono grazie alla community di residenti e appassionati.

### Funzionalità principali

| | Funzione | Descrizione |
|---|---|---|
| 🗺️ | **Mappa dei luoghi** | Punti di interesse, dal Castello del Buonconsiglio a Piazza Duomo |
| 🎨 | **Arte nascosta** | Gli affreschi del centro storico, geolocalizzati e spiegati |
| 📸 | **Foto e aneddoti** | Gli utenti caricano immagini e "fun fact" su luoghi e famiglie |
| 🎭 | **Tradizioni** | Feste, usanze e storie del territorio trentino |
| 🍽️ | **Mappa del gusto** | Dove assaggiare i piatti tipici |
| 🎮 | **Minigame "Dov'era?"** | Indovina il luogo da una foto storica, stile GeoGuessr |

## A chi serve

- **Turisti**: itinerari originali, oltre i soliti luoghi.
- **Residenti**: riscoprono la città e ne diventano narratori.
- **Comune**: valorizza il patrimonio "minore" e distribuisce meglio i flussi nel centro.

## Il sito

La **versione corrente** è in [`versione-corrente/`](versione-corrente) e usa il frontend v3, che parte dal design della v2 e completa i punti del documento [Cose mancanti](docs/cose-mancanti.md). Le versioni passate (il primo prototipo con solo il frontend, il frontend v1 e il frontend v2) sono in [`versioni-precedenti/`](versioni-precedenti).

La web app segue l'architettura della [Fase 3](docs/fase-3-architettura-user-flow.md#4-architettura-ad-alto-livello):

- **Frontend** in [`versione-corrente/frontend/`](versione-corrente/frontend): React + Vite, mappa Leaflet su OpenStreetMap con i luoghi raggruppati, italiano e inglese, tema chiaro e scuro;
- **Backend** in [`versione-corrente/backend/`](versione-corrente/backend): Node.js + Express, API REST con il gateway (token JWT, ruoli, limiti alle richieste) davanti ai quattro moduli *Utenti e accessi*, *POI, itinerari e tradizioni*, *Contenuti e moderazione*, *Gioco*;
- **Database PostgreSQL + PostGIS**: in sviluppo con [PGlite](https://pglite.dev), lo stesso PostgreSQL eseguito dentro Node, quindi **non serve installare niente**; con Docker Compose un server PostgreSQL vero.

### Avvio in sviluppo

Serve [Node.js](https://nodejs.org) 22 o superiore. Dalla cartella principale del repository:

```bash
npm install        # solo la prima volta (installa frontend e backend)
npm run dev        # avvia backend e frontend insieme
```

Poi apri **http://localhost:5173**. Il primo avvio crea il database in `versione-corrente/backend/.dati/` e lo riempie con i pacchetti di dati di [`versione-corrente/backend/src/db/dati/`](versione-corrente/backend/src/db/dati): ci vuole una ventina di secondi. I pacchetti aggiunti in seguito si caricano da soli al successivo avvio, anche in un database già esistente.

**Account di prova** (solo in sviluppo):

| Ruolo | E-mail | Password |
|---|---|---|
| Amministratore | `amministratore@tridentum.test` | `Tridentum-admin-1` |
| Moderatore | `moderatore@tridentum.test` | `Tridentum-moderatore-1` |
| Utente | `utente@tridentum.test` | `Tridentum-utente-1` |

In sviluppo le e-mail (conferma della registrazione, password dimenticata, esito della moderazione) non vengono spedite: si leggono nella **posta di prova**, dal Profilo o su http://localhost:5173/#/dev/posta.

Per ripartire da un database pulito basta fermare il server e cancellare la cartella `versione-corrente/backend/.dati/`.

### Test

```bash
npm test           # test del frontend e del backend
```

I test del backend percorrono i casi d'uso (registrazione, ricordi, moderazione, amministrazione, gioco) su un database in memoria. Con `TEST_DATABASE_URL=postgres://utente:password@localhost:5432/postgres` girano invece su un server PostgreSQL + PostGIS vero, creando e cancellando un database per ogni file.

### Avvio con Docker (produzione)

```bash
cp .env.esempio .env        # solo la prima volta: scegli JWT_SEGRETO
docker compose up --build   # sito su http://localhost:3000
```

Il primo amministratore si nomina dopo essersi registrati dal sito:

```bash
docker compose exec app npm run crea-amministratore -- tua@email.it
```

Per le e-mail vere serve un server SMTP (`SMTP_URL` nel file `.env`). In produzione il sito va messo dietro un proxy HTTPS (RNF-S01) e `INDIRIZZO_PUBBLICO` deve iniziare con `https://`.

### Cosa c'è

| Schermata (Fase 3 §3.2) | Casi d'uso |
|---|---|
| S-00 Benvenuto, scelta della lingua | — |
| S-01 Mappa, S-01L Elenco, S-02 Anteprima, S-04 Ricerca e filtri | UC-01 |
| S-03 Scheda del luogo: storia, fonti, ricordi della community, segnalazioni, luoghi vicini | UC-01 |
| S-05 Itinerari con filtro "quanto tempo hai", S-06 Itinerario tappa per tappa | UC-02 |
| S-07 Accedi / Registrati, conferma dell'e-mail, password dimenticata | UC-03 |
| S-08 Aggiungi un ricordo: foto ridotta e senza dati di posizione, licenza, consenso al gioco | UC-04 |
| S-09 Profilo: contributi con lo stato, preferiti, eliminazione dell'account | UC-08 |
| S-10 Dov'era?: foto storiche (archivi di pubblico dominio e community), punteggio verificato dal server, classifica | UC-06 |
| S-11 Scopri: tradizioni per periodo dell'anno, mappa del gusto con locali e piatti | UC-10 |
| S-13 Moderazione: coda dei ricordi e delle segnalazioni | UC-05 |
| S-14 Amministrazione: luoghi (posizione sulla mappa, foto con i crediti), itinerari, tradizioni, ruoli | UC-07, UC-09 |

Non ci sono ancora il riconoscimento dei luoghi con la fotocamera (RF-06, *Could*) e l'AI Service, rinviati come previsto dalla [Fase 4](docs/fase-4-pianificazione.md#22-cosa-entra).

**Da sapere**
- I contenuti iniziali (36 luoghi, 9 itinerari, tradizioni, piatti, 8 livelli fotografici del gioco) sono una **prima selezione da verificare**: date, attribuzioni, fonti e soprattutto i locali della mappa del gusto vanno controllati dal team (WBS 3) prima della pubblicazione. Si correggono dal pannello di amministrazione oppure nei pacchetti di dati di [`versione-corrente/backend/src/db/dati/`](versione-corrente/backend/src/db/dati).
- Le foto dei luoghi sono di due tipi: quelle **ufficiali**, caricate dagli amministratori o dai pacchetti di dati con autore, licenza e fonte (obbligatori, perché le licenze libere li richiedono), e i **ricordi** della community, che passano dalla moderazione. La copertina è la prima foto ufficiale, altrimenti il primo ricordo con foto, altrimenti il ritaglio della mappa centrato sul luogo.
- Le 8 foto storiche del gioco sono in [`versione-corrente/backend/src/db/dati/foto-gioco/`](versione-corrente/backend/src/db/dati/foto-gioco): vengono da Wikimedia Commons, sono di **pubblico dominio** e autore, licenza e fonte sono in [`gioco.json`](versione-corrente/backend/src/db/dati/gioco.json), che viene riallineato nel database a ogni avvio. Il gioco le mostra dopo ogni risposta.

### Il design della versione corrente

La versione corrente usa il frontend v2. Rispetto alla [v1](versioni-precedenti/frontend-v1), conservata tra le versioni precedenti, cambia:

- **Mappa dei luoghi**: i luoghi vicini si raggruppano in un cerchio con il numero e un anello diviso tra i colori delle categorie; ogni segnaposto ha l'icona della sua categoria; ingrandendo compaiono i nomi; lo sfondo della mappa è attenuato (e invertito nel tema scuro) perché i segnaposti si leggano meglio.
- **Desktop**: navigazione in una colonna a sinistra; mappa ed elenco affiancati, e passando su un luogo dell'elenco il suo segnaposto si evidenzia; scheda del luogo su due colonne; itinerario con la mappa fissa.
- **Copertine**: se un luogo non ha foto, la copertina è il ritaglio della mappa centrato sul luogo.
- **Telefono**: anteprima di un luogo come pannello dal basso che si chiude trascinandolo giù, con la mappa che si sposta per mostrare il luogo sopra il pannello; scheda nell'ordine utile a chi è sul posto (informazioni pratiche prima della storia, luoghi vicini prima delle fonti), con una barra in alto per tornare indietro e condividere; comandi delle tappe dell'itinerario sempre a portata di pollice; aree di tocco di almeno 44 px e campi a 16 px (niente zoom automatico su iPhone).
- **Dov'era?** in stile GeoGuessr: una foto storica, l'anno come unico indizio, il segnaposto sulla mappa (anche da tastiera, con "Segna il centro della mappa"), poi distanza, punti e crediti della foto.
- **Stile**: font Geist ospitati con il sito, icone Phosphor, palette "pietra e affresco" con un solo colore d'accento, tema chiaro e scuro.
- **Accessibilità e dettagli**: controllata con le [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) (link "Salta al contenuto", titoli di pagina, tipografia con apostrofi e virgolette tipografiche, stati vuoti e di caricamento, tappa dell'itinerario nell'URL).

Per confrontarla con la v1, che usa lo stesso backend:

```bash
npm --prefix versioni-precedenti/frontend-v1 install   # solo la prima volta
npm run dev:v1     # backend + frontend v1 su http://localhost:5174
```

## Struttura del repository

```
.
├── docs/                                 # documentazione di progetto (un file per fase)
│   ├── fase-0-proposta-progetto.pdf      # Fase 0: proposta iniziale del progetto
│   ├── fase-1-analisi-dominio.md         # Fase 1: dominio, personas, stakeholder, tracciabilità
│   ├── fase-2-specifiche-requisiti.md    # Fase 2: requisiti (MoSCoW), RNF, casi d'uso
│   ├── fase-3-architettura-user-flow.md  # Fase 3: casi d'uso, user flow, architettura
│   ├── fase-4-pianificazione.md          # Fase 4: WBS, sprint e roadmap MVP, rischi
│   └── libretti/                         # libretti delle attività, uno per membro del team
├── presentazioni/
│   ├── presentazione-v1.pptx             # prima versione
│   └── presentazione-v2.pptx             # versione attuale, nuovo design
├── versione-corrente/                    # il sito attuale (si avvia dalla cartella principale)
│   ├── frontend/                         # frontend v3: React + Vite + Leaflet
│   │   └── src/
│   │       ├── pages/                    # una pagina per schermata
│   │       ├── components/               # mappa, moduli, finestre, icone…
│   │       ├── data/api.js               # una funzione per ogni endpoint dell'API
│   │       ├── i18n/                     # testi in italiano e inglese
│   │       └── lib/                      # sessione, client HTTP, distanze, posizione
│   └── backend/                          # API REST: Node.js + Express
│       └── src/
│           ├── gateway/                  # token, ruoli, limiti, errori
│           ├── moduli/                   # utenti, luoghi, contenuti, gioco
│           ├── db/                       # connessione, migrazioni, pacchetti di dati iniziali
│           ├── servizi/                  # e-mail, archivio e preparazione delle foto
│           └── server.js                 # avvio
├── versioni-precedenti/                  # versioni passate del sito, conservate come riferimento
│   ├── prototipo/                        # primo prototipo: solo frontend, dati in JSON
│   ├── frontend-v1/                      # frontend v1, primo design (usa il backend corrente)
│   └── frontend-v2/                      # frontend v2, nuovo design (usa il backend corrente)
├── tests/
│   ├── frontend/                         # test del frontend (Vitest)
│   └── backend/                          # test delle API e dei dati (Vitest + Supertest)
├── docker-compose.yml                    # avvio completo con PostgreSQL + PostGIS
├── Dockerfile
├── CONTRIBUTING.md                       # convenzioni del team (nomi, commit, documenti)
└── README.md
```

## Stato del progetto

🚧 MVP del sito completo (frontend, backend e database), contenuti da verificare.

| Fase | Documento | Versione | Stato |
|---|---|---|---|
| 0 — Proposta di progetto | [docs/fase-0-proposta-progetto.pdf](docs/fase-0-proposta-progetto.pdf) | — | Consegnato |
| 1 — Analisi del dominio, Personas, Stakeholder Matrix, Tracciabilità | [docs/fase-1-analisi-dominio.md](docs/fase-1-analisi-dominio.md) | 0.2 | Bozza |
| 2 — Specifiche dei requisiti (SRS Light): RF con MoSCoW, RNF, casi d'uso, tracciabilità | [docs/fase-2-specifiche-requisiti.md](docs/fase-2-specifiche-requisiti.md) | 0.4 | Bozza |
| 3 — Architettura del sistema e user flow: casi d'uso (Mermaid), flusso delle schermate, architettura ad alto livello | [docs/fase-3-architettura-user-flow.md](docs/fase-3-architettura-user-flow.md) | 0.2 | Bozza |
| 4 — Pianificazione dello sviluppo: WBS, piano degli sprint e roadmap MVP, matrice dei rischi | [docs/fase-4-pianificazione.md](docs/fase-4-pianificazione.md) | 0.2 | Bozza |

## Team

- Manuel Bulla
- Marco Buffa
- Pietro Crea
