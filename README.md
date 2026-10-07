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

Il primo prototipo della web app si trova in [`src/frontend/`](src/frontend). È il **Frontend Web** della [Fase 3](docs/fase-3-architettura-user-flow.md#51-frontend-web) (React + Vite, mappa Leaflet su OpenStreetMap), per ora **senza backend né database**: i dati dei luoghi sono file JSON in [`src/frontend/src/data/`](src/frontend/src/data).

### Avvio

Serve [Node.js](https://nodejs.org) 22 o superiore.

```bash
cd src/frontend
npm install        # solo la prima volta
npm run dev        # sito su http://localhost:5173
npm test           # test in tests/frontend
npm run build      # versione da pubblicare, nella cartella dist/
```

### Cosa c'è

| Schermata (Fase 3 §3.2) | Stato |
|---|---|
| S-00 Benvenuto, scelta della lingua (italiano/inglese) | ✅ |
| S-01 Mappa con posizione, S-01L Elenco, S-02 Anteprima | ✅ |
| S-04 Ricerca e filtri per categoria e tema | ✅ |
| S-03 Scheda del luogo, con fonti, luoghi vicini e "Come arrivare" | ✅ |
| S-05 Itinerari con filtro "quanto tempo hai", S-06 Itinerario tappa per tappa | ✅ |
| S-11 Scopri: tradizioni e piatti tipici | ✅ (locali della Mappa del gusto da selezionare) |
| S-10 Dov'era? con indizi testuali | ✅ (foto storiche e classifica con il backend) |
| S-09 Profilo: lingua, luoghi salvati sul dispositivo, export GeoJSON | ✅ |
| S-07 Accesso, S-08 Ricordi, S-13 Moderazione, S-14 Amministrazione | ⏳ servono backend e database |

**Da sapere**
- I testi dei luoghi sono **dimostrativi**: date, attribuzioni e fonti vanno verificate dal team (WBS 3) prima della pubblicazione.
- [`src/frontend/src/data/api.js`](src/frontend/src/data/api.js) ha una funzione per ogni endpoint dell'API Gateway (Fase 3 §5.2): quando ci sarà il backend basterà sostituire il loro contenuto con le chiamate HTTP, senza toccare le pagine.
- I test in [`tests/frontend/`](tests/frontend) controllano anche la coerenza dei dati (ID unici, almeno una fonte per luogo, tappe esistenti), cioè i vincoli che imporrà il database.

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
├── src/
│   └── frontend/                         # il sito: React + Vite + Leaflet
│       └── src/
│           ├── data/                     # dati dei luoghi (JSON) e accesso ai dati
│           ├── pages/                    # una pagina per schermata
│           ├── components/               # mappa, barra di navigazione, icone…
│           ├── i18n/                     # testi in italiano e inglese
│           └── lib/                      # distanze, ricerca, posizione, preferenze
├── tests/
│   └── frontend/                         # test automatici (Vitest)
├── CONTRIBUTING.md                       # convenzioni del team (nomi, commit, documenti)
└── README.md
```

## Stato del progetto

🚧 Progettazione completata; primo prototipo del sito senza backend e database.

| Fase | Documento | Versione | Stato |
|---|---|---|---|
| 0 — Proposta di progetto | [docs/fase-0-proposta-progetto.pdf](docs/fase-0-proposta-progetto.pdf) | — | Consegnato |
| 1 — Analisi del dominio, Personas, Stakeholder Matrix, Tracciabilità | [docs/fase-1-analisi-dominio.md](docs/fase-1-analisi-dominio.md) | 0.2 | Bozza |
| 2 — Specifiche dei requisiti (SRS Light): RF con MoSCoW, RNF, casi d'uso, tracciabilità | [docs/fase-2-specifiche-requisiti.md](docs/fase-2-specifiche-requisiti.md) | 0.4 | Bozza |
| 3 — Architettura del sistema e user flow: casi d'uso (Mermaid), flusso delle schermate, architettura ad alto livello | [docs/fase-3-architettura-user-flow.md](docs/fase-3-architettura-user-flow.md) | 0.1 | Bozza |
| 4 — Pianificazione dello sviluppo: WBS, piano degli sprint e roadmap MVP, matrice dei rischi | [docs/fase-4-pianificazione.md](docs/fase-4-pianificazione.md) | 0.2 | Bozza |

## Team

- Manuel Bulla
- Marco Buffa
- Pietro Crea
