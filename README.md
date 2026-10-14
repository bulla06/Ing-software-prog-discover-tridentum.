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

La **versione corrente** è in [`versione-corrente/`](versione-corrente) e usa il frontend v3: parte dal design della v2 e completa i punti rimasti aperti rispetto alla Fase 2 (elenco in [`docs/compiti.xlsx`](docs/compiti.xlsx)). Le versioni passate (il primo prototipo, il frontend v1 e il frontend v2) sono in [`versioni-precedenti/`](versioni-precedenti) e si possono aprire affiancate alla corrente per confrontarle.

La web app segue l'architettura della [Fase 3](docs/fase-3-architettura-user-flow.md#4-architettura-ad-alto-livello):

- **Frontend** in [`versione-corrente/frontend/`](versione-corrente/frontend): React + Vite, mappa Leaflet su OpenStreetMap con i luoghi raggruppati, italiano, inglese e tedesco (interfaccia e contenuti), tema chiaro e scuro, installabile come app;
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

**Versioni precedenti**, con lo stesso backend: `npm run dev:v1` (frontend v1, porta 5174) e `npm run dev:v2` (frontend v2, porta 5176), dopo aver installato una volta le loro dipendenze (vedi i README nelle loro cartelle).

### Test

```bash
npm test           # test del frontend e del backend
```

I test del backend percorrono i casi d'uso (registrazione, ricordi, moderazione, amministrazione, gioco), il controllo dei ruoli su tutte le rotte riservate, la privacy e la coerenza dei pacchetti di dati, su un database in memoria. Con `TEST_DATABASE_URL=postgres://utente:password@localhost:5432/postgres` girano invece su un server PostgreSQL + PostGIS vero, creando e cancellando un database per ogni file.

Le misure di prestazioni, accessibilità e carico non fanno parte di `npm test`: gli script e le istruzioni sono in [`tests/prestazioni/`](tests/prestazioni), i risultati in [Verifica dei requisiti non funzionali](docs/verifica-requisiti-non-funzionali.md).

### Avvio con Docker (produzione)

```bash
docker compose up --build   # sito su http://localhost:3000
```

Non serve preparare niente: al primo avvio il server crea il segreto per i token e lo conserva nel volume dei dati. Le impostazioni facoltative (e-mail, indirizzo per la privacy, dominio) stanno in un file `.env`: vedi [`.env.esempio`](.env.esempio).

**In HTTPS** (RNF-S01), su un server con un dominio che punta a lui, il proxy [Caddy](https://caddyserver.com) ottiene da solo il certificato:

```bash
DOMINIO=tridentum.esempio.it INDIRIZZO_PUBBLICO=https://tridentum.esempio.it PROXY_FIDATI=1 PORTA_APP=127.0.0.1:3000 \
  docker compose --profile https up -d --build
```

Con `DOMINIO=localhost` si prova l'HTTPS sul proprio computer, con un certificato locale.

Il primo amministratore si nomina dopo essersi registrati dal sito:

```bash
docker compose exec app npm run crea-amministratore -- tua@email.it
```

Per le e-mail vere serve un server SMTP (`SMTP_URL`); prima della pubblicazione va indicato anche l'indirizzo per le richieste sui dati personali (`EMAIL_PRIVACY`, vedi i compiti GDPR in [`docs/compiti.xlsx`](docs/compiti.xlsx)).

### Cosa c'è

| Schermata (Fase 3 §3.2) | Casi d'uso e requisiti |
|---|---|
| S-00 Benvenuto, scelta della lingua | RNF-U05 |
| S-01 Mappa, S-01L Elenco, S-02 Anteprima, S-04 Ricerca e filtri; vista allargata se entro 1 km non c'è niente | UC-01 (E3) |
| S-03 Scheda del luogo: storia, foto con i crediti, fonti, ricordi della community, segnalazioni, luoghi vicini | UC-01 · RF-02, RF-03 |
| "Cosa sto guardando?": la fotocamera con posizione e bussola riconosce il luogo che hai davanti | RF-06 |
| S-05 Itinerari con filtro "quanto tempo hai" e **itinerario su misura** dal tempo e dal punto di partenza | UC-02 · RF-07, RF-08 |
| S-06 Itinerario tappa per tappa, "Come arrivare", tappe rimosse segnalate, fine del percorso con gli itinerari vicini | UC-02 (7a, 8, E1) |
| S-07 Accedi / Registrati, conferma dell'e-mail, password dimenticata, informativa privacy | UC-03 · RNF-S04 |
| S-08 Aggiungi un ricordo: foto ridotta e senza dati di posizione, licenza, consenso al gioco e punto dello scatto | UC-04 |
| S-09 Profilo: contributi con lo stato, preferiti, cambio del nome, download dei propri dati, eliminazione dell'account | UC-08 · RF-13 |
| S-10 Dov'era?: foto storiche, punteggio verificato dal server, classifica | UC-06 |
| S-11 Scopri: tradizioni in corso e in arrivo, con i luoghi sulla mappa; mappa del gusto | UC-10 |
| S-13 Moderazione: coda dei ricordi (con la scelta dei livelli del gioco) e delle segnalazioni | UC-05 · RF-23 |
| S-14 Amministrazione: luoghi, itinerari e tradizioni anche in inglese e tedesco, foto con i crediti, ruoli, esportazione e importazione | UC-07, UC-09 · RNF-PO04 |

Senza connessione ogni pagina lo dice e propone di riprovare (UC-01 E2); il sito si apre anche senza rete, grazie al service worker.

**"Cosa sto guardando?" (RF-06)** riconosce il luogo dalla posizione e dalla direzione del telefono, non dall'immagine: il calcolo si fa tutto nel browser e niente lascia il dispositivo. Il riconoscimento dall'immagine con un modello di AI (AI Service, [Fase 3 §5.4](docs/fase-3-architettura-user-flow.md#54-ai-service)) può aggiungersi in seguito senza cambiare la pagina.

**Da sapere**
- **Contenuti:** 45 luoghi, tra cui 16 affreschi, 10 itinerari, 6 tradizioni e 14 piatti, in italiano, inglese e tedesco (le traduzioni tedesche sono nel pacchetto [`004-traduzioni-tedesche`](versione-corrente/backend/src/db/dati/004-traduzioni-tedesche)). Date e attribuzioni sono prese dalle fonti citate in ogni scheda; il pacchetto [`002-correzioni-e-traduzioni`](versione-corrente/backend/src/db/dati/002-correzioni-e-traduzioni) ha sostituito le note "da verificare" della prima selezione. Resta da fare la verifica con la Soprintendenza (RNF-V02).
- **Foto dei luoghi:** ci sono quelle **ufficiali**, con autore, licenza e fonte obbligatori, e i **ricordi** della community, che passano dalla moderazione. Le foto ufficiali si prendono da Wikimedia Commons con `npm run scarica-foto`, che usa l'elenco [`foto-da-scaricare.json`](versione-corrente/backend/src/db/dati/foto-da-scaricare.json) e crea un nuovo pacchetto di dati con i crediti; serve un computer che raggiunga Commons. Le foto scelte da una categoria o da una ricerca vanno guardate prima del commit. Finché un luogo non ha foto, la copertina è il ritaglio della mappa.
- **Gioco:** le 8 foto storiche sono in [`foto-gioco/`](versione-corrente/backend/src/db/dati/foto-gioco), di pubblico dominio, con i crediti in [`gioco.json`](versione-corrente/backend/src/db/dati/gioco.json). Le foto della community diventano livelli se l'autore dà il consenso e un moderatore le sceglie.
- **Privacy:** tempi di conservazione applicati dal server ogni giorno, informativa completa, dati scaricabili dal profilo: vedi i compiti GDPR in [`docs/compiti.xlsx`](docs/compiti.xlsx).

### Le versioni del frontend

| Versione | Cartella | Novità principali |
|---|---|---|
| v3 (corrente) | [`versione-corrente/frontend/`](versione-corrente/frontend) | Completa i punti rimasti aperti rispetto alla Fase 2: itinerario su misura, fine dell'itinerario, avvisi di connessione, informativa privacy, contenuti in inglese, "Cosa sto guardando?", PWA, esportazione e importazione, JavaScript iniziale più leggero |
| v2 | [`versioni-precedenti/frontend-v2/`](versioni-precedenti/frontend-v2) | Nuovo design: mappa con i luoghi raggruppati, colonna di navigazione su desktop, esperienza da smartphone, gioco in stile GeoGuessr, palette "pietra e affresco" |
| v1 | [`versioni-precedenti/frontend-v1/`](versioni-precedenti/frontend-v1) | Primo design del sito completo |
| Prototipo | [`versioni-precedenti/prototipo/`](versioni-precedenti/prototipo) | Solo frontend, dati in file JSON |

## Struttura del repository

```
.
├── docs/                                 # documentazione di progetto (un file per fase)
│   ├── fase-0-proposta-progetto.pdf      # Fase 0: proposta iniziale del progetto
│   ├── fase-1-analisi-dominio.md         # Fase 1: dominio, personas, stakeholder, tracciabilità
│   ├── fase-2-specifiche-requisiti.md    # Fase 2: requisiti (MoSCoW), RNF, casi d'uso
│   ├── fase-3-architettura-user-flow.md  # Fase 3: casi d'uso, user flow, architettura
│   ├── fase-4-pianificazione.md          # Fase 4: WBS, sprint e roadmap MVP, rischi
│   ├── compiti.xlsx                      # compiti ancora da fare, con assegnatario e stato (rosso/giallo/verde)
│   ├── verifica-requisiti-non-funzionali.md  # misure e prove dei requisiti non funzionali
│   └── libretti/                         # libretti delle attività con il conta ore (Excel), uno per membro
├── presentazioni/
│   ├── presentazione-v1.pptx             # prima versione
│   └── presentazione-v2.pptx             # versione attuale, nuovo design
├── versione-corrente/                    # il sito attuale (si avvia dalla cartella principale)
│   ├── frontend/                         # frontend v3: React + Vite + Leaflet
│   │   ├── src/
│   │   │   ├── pages/                    # una pagina per schermata
│   │   │   ├── components/               # mappa, moduli, finestre, icone…
│   │   │   ├── data/api.js               # una funzione per ogni endpoint dell'API
│   │   │   ├── i18n/                     # testi in italiano, inglese e tedesco, informativa privacy
│   │   │   └── lib/                      # sessione, client HTTP, distanze, posizione
│   │   ├── public/                       # icone, manifest e service worker della PWA
│   │   └── strumenti/                    # generatore delle icone
│   └── backend/                          # API REST: Node.js + Express
│       └── src/
│           ├── gateway/                  # token, ruoli, limiti, errori
│           ├── moduli/                   # utenti, luoghi, contenuti, gioco
│           ├── db/                       # connessione, migrazioni, pacchetti di dati
│           ├── servizi/                  # e-mail, foto, pulizia dei dati scaduti
│           ├── strumenti/                # crea-amministratore, scarica-foto
│           └── server.js                 # avvio
├── versioni-precedenti/                  # versioni passate del sito, conservate come riferimento
│   ├── prototipo/                        # primo prototipo: solo frontend, dati in JSON
│   ├── frontend-v1/                      # frontend v1, primo design (usa il backend corrente)
│   └── frontend-v2/                      # frontend v2, nuovo design (usa il backend corrente)
├── tests/
│   ├── frontend/                         # test del frontend (Vitest)
│   ├── backend/                          # test delle API e dei dati (Vitest + Supertest)
│   └── prestazioni/                      # misure di prestazioni, accessibilità e carico
├── infrastruttura/Caddyfile              # proxy HTTPS
├── docker-compose.yml                    # avvio completo con PostgreSQL + PostGIS (e HTTPS)
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
