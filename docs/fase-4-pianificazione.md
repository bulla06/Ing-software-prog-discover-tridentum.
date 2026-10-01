# Fase 4 — Pianificazione dello Sviluppo (WBS e Roadmap MVP)

**Progetto:** Discover Tridentum — Trento Nascosta
**Corso:** Ingegneria del Software · Prof. Paolo Giorgini · A.A. 2026-2027
**Team:** Manuel Bulla · Marco Buffa · Pietro Crea
**Versione:** 0.2 · **Stato:** Bozza
**Documento precedente:** [Fase 3 — Architettura e user flow](fase-3-architettura-user-flow.md)

### Storico delle revisioni

| Versione | Data | Autore | Modifiche |
|---|---|---|---|
| 0.1 | 01/10/2026 | Manuel Bulla | Prima stesura: MVP, WBS, piano degli sprint, matrice dei rischi |
| 0.2 | 01/10/2026 | Manuel Bulla | Piano riorganizzato "prima i luoghi": più lavoro sui POI e sui loro contenuti, sprint riordinati, gioco come ultimo blocco e primo da tagliare; aggiunto il rischio R-16 |

---

## Indice

1. [Introduzione e ipotesi](#1-introduzione-e-ipotesi)
2. [Definizione dell'MVP](#2-definizione-dellmvp)
3. [Work Breakdown Structure](#3-work-breakdown-structure)
4. [Piano degli sprint](#4-piano-degli-sprint)
5. [Modo di lavorare](#5-modo-di-lavorare)
6. [Matrice dei rischi](#6-matrice-dei-rischi)
7. [Punti aperti](#7-punti-aperti)

---

## 1. Introduzione e ipotesi

### 1.1 Scopo

Questo documento pianifica lo sviluppo del sistema progettato nelle Fasi 2 e 3: **cosa** va fatto (WBS), **quando** (sprint e roadmap) e **cosa può andare storto** (rischi).

### 1.2 Ipotesi di pianificazione

Il piano si basa su queste ipotesi. Se una cambia, il piano va rivisto (rischi R-08 e R-14).

| Ipotesi | Valore |
|---|---|
| Inizio dello sviluppo | Lunedì 05/10/2026 |
| MVP pronto per la consegna | Domenica 20/12/2026 |
| Esame | Sessione di gennaio–febbraio 2027 (date da verificare) |
| Persone | 3 |
| Impegno per persona | 10 ore a settimana (da confermare dal team) |
| Tempo per la gestione | Riunioni di sprint e documenti: 24 h in tutto, sottratte alla capacità |
| Stack | Quello proposto in [Fase 3 §6](fase-3-architettura-user-flow.md#6-decisioni-architetturali) |
| Priorità dei requisiti | [Fase 2 v0.4](fase-2-specifiche-requisiti.md#28-riepilogo) |
| Unità di stima | Ore ideali di lavoro di una persona |

### 1.3 Capacità del team

| Periodo | Settimane | Capacità lorda | Gestione | **Capacità netta** |
|---|---|---|---|---|
| Sprint 0 | 1 | 30 h | 3 h | **27 h** |
| Sprint 1 | 3 | 90 h | 6 h | **84 h** |
| Sprint 2 | 3 | 90 h | 6 h | **84 h** |
| Sprint 3 | 3 | 90 h | 6 h | **84 h** |
| Stabilizzazione | 1 | 30 h | 3 h | **27 h** |
| **Totale** | **11** | **330 h** | **24 h** | **306 h** |

Il lavoro di sviluppo stimato nella WBS (§3) è di **250 h**. Di queste, 15 h sono per il gioco "Dov'era?", che si fa **solo se avanza tempo** (§2.3):

- **lavoro impegnato:** 235 h → riserva di **71 h (23%)**;
- **con il gioco:** 250 h → riserva di **56 h (18%)**.

Le tre settimane di vacanza (21/12/2026 – 10/01/2027) sono una seconda riserva, **non pianificata**.

---

## 2. Definizione dell'MVP

### 2.1 Priorità del progetto: prima i luoghi

Il valore dell'app sta nei **luoghi**: i POI, gli affreschi e le loro storie rispondono ai problemi principali della Fase 1 (P1–P4) e ai bisogni B1–B3. Tutto il resto si appoggia ai POI: gli itinerari sono sequenze di POI, i ricordi della community si collegano a un POI, il gioco usa foto di luoghi.

Per questo il piano segue tre regole:

1. **I luoghi vengono prima.** Lo Sprint 1 è dedicato interamente a mappa, schede e contenuti; lo Sprint 2 a gestirli e organizzarli in itinerari.
2. **I contenuti dei luoghi hanno più ore.** Almeno 30 POI e 15 affreschi con fonti verificate, più una revisione incrociata (WBS 3.2–3.4).
3. **Il gioco è in secondo piano.** È l'ultima cosa che si realizza e la prima che si taglia.

Di conseguenza, in [Fase 2 v0.4](fase-2-specifiche-requisiti.md#28-riepilogo) ricerca, filtri e itinerari tematici (RF-04, RF-05, RF-07) sono passati da *Should* a *Must*, e il gioco (RF-21) da *Should* a *Could*.

L'MVP deve permettere di mostrare all'esame:

- **Giulia** trova sulla mappa gli affreschi vicini, cerca un luogo, ne legge la storia e segue un itinerario (UC-01, UC-02);
- **Franco** carica un ricordo, un moderatore lo approva e il ricordo compare nella scheda (UC-04, UC-05).

### 2.2 Cosa entra

| Priorità | Requisiti | Nell'MVP |
|---|---|---|
| **Must** | RF-01, 02, 03, 04, 05, 07, 10, 11, 13, 14, 16, 17, 24, 25 | **Tutti** |
| **Should** | RF-12, 15, 18, 19, 20 | **Tutti, se la velocità lo permette** (ordine di taglio in §2.3) |
| **Could** | RF-06, 08, 09, 21, 22, 23 | Solo **RF-21** (gioco), come ultimo blocco e se avanza tempo. Per RF-06 solo uno *spike*, cioè un prototipo a tempo limitato che dice se è fattibile (WBS 10.1) |
| **Won't** | RF-26 … RF-29 | No |

Tutti i requisiti non funzionali *Must* sono coperti dall'MVP. Tra i *Should*, l'inglese (RNF-U05) entra solo per l'interfaccia: le schede restano in italiano.

**Cosa resta fuori e perché**
- **AI Service.** Nell'MVP c'è solo lo spike di riconoscimento. L'architettura è già pensata per funzionare senza AI ([Fase 3 §5.4](fase-3-architettura-user-flow.md#54-ai-service)), quindi aggiungerlo dopo non cambia il resto.
- **Coda dei lavori (Redis).** Serve solo all'AI Service: rinviata con lui.
- **Test di carico (RNF-P04, *Could*).** Rinviato.

### 2.3 Ordine di taglio

Se la velocità è più bassa del previsto (§5.3), si toglie lavoro in quest'ordine, partendo da ciò che conta meno:

1. **RF-21 Gioco "Dov'era?"** (WBS 9) — 15 h. È sempre il primo a saltare.
2. RF-19 Tradizioni (WBS 8.4) — 5 h
3. RF-18 Segnalazioni (WBS 6.5) — 4 h
4. RF-12 Profilo con lo stato dei contributi (WBS 5.4) — 4 h
5. RF-20 Mappa del gusto (WBS 8.3) — 3 h

La mappa del gusto è l'ultimo *Should* da tagliare perché è fatta di luoghi. I *Must* (compresi ricerca, filtri e itinerari) non si tagliano.

---

## 3. Work Breakdown Structure

La WBS divide tutto il lavoro in **pacchetti** (primo livello) e **task** (secondo livello). Contiene il 100% del lavoro: ciò che non è nella WBS non è nel piano.

### 3.1 Struttura

```mermaid
flowchart LR
    W["Discover Tridentum<br/>MVP · 274 h"]
    W --> W1["1 Gestione del progetto · 24 h"]
    W --> W2["2 Infrastruttura e setup · 26 h"]
    W --> W3["3 Contenuti dei luoghi · 27 h"]
    W --> W4["4 Mappa e POI · 36 h"]
    W --> W5["5 Account e sicurezza · 28 h"]
    W --> W6["6 Contenuti della community · 33 h"]
    W --> W7["7 Gestione dei luoghi · 13 h"]
    W --> W8["8 Itinerari e Scopri · 20 h"]
    W --> W9["9 Gioco Dov'era? · 15 h · ultimo"]
    W --> W10["10 AI Service · 8 h"]
    W --> W11["11 Qualità e rilascio · 44 h"]
```

### 3.2 Distribuzione dello sforzo

```mermaid
pie showData
    title Ore di sviluppo per area (250 h)
    "Luoghi: POI, contenuti, gestione, itinerari, Scopri" : 96
    "Qualità e rilascio" : 44
    "Contenuti della community" : 33
    "Account e sicurezza" : 28
    "Infrastruttura e setup" : 26
    "Gioco Dov'era?" : 15
    "AI Service (spike)" : 8
```

I luoghi (pacchetti 3, 4, 7 e 8) sono l'area più grande: **96 h, il 38%** dello sviluppo. Il gioco pesa il 6%.

### 3.3 Dettaglio dei task

Colonne: **Pr.** = priorità MoSCoW; **Sprint** = sprint in cui è pianificato (§4); **St** = stabilizzazione.

#### 1 · Gestione del progetto — 24 h

| Codice | Task | Risultato | Requisiti | Stima | Pr. | Sprint |
|---|---|---|---|---|---|---|
| 1.1 | Riunioni di sprint | Planning, review con demo e retrospettiva per ogni sprint | — | 18 h | M | Tutti |
| 1.2 | Documenti e libretti | Documenti di fase e libretti aggiornati | — | 6 h | M | Tutti |

#### 2 · Infrastruttura e setup — 26 h

| Codice | Task | Risultato | Requisiti | Stima | Pr. | Sprint |
|---|---|---|---|---|---|---|
| 2.1 | Organizzazione del repository | Branch `main` protetto, modelli di issue e PR, board GitHub Projects | RNF-V03 | 2 h | M | 0 |
| 2.2 | Docker Compose | Container di frontend, backend, gateway, PostGIS e MinIO avviabili con un comando | RNF-PO03 | 6 h | M | 0 |
| 2.3 | Scheletro del frontend | React + Vite, navigazione, barra in basso, layout mobile, i18n | RNF-U01, RNF-U05 | 6 h | M | 0 |
| 2.4 | Scheletro del backend | Node.js + TypeScript, quattro moduli vuoti, connessione al DB, migrazioni | — | 6 h | M | 0 |
| 2.5 | API Gateway di base | Instradamento, CORS, HTTPS in sviluppo | RNF-S01 | 3 h | M | 1 |
| 2.6 | Integrazione continua | GitHub Actions: lint e test a ogni PR | RNF-V03 | 3 h | M | 1 |

#### 3 · Contenuti dei luoghi — 27 h

| Codice | Task | Risultato | Requisiti | Stima | Pr. | Sprint |
|---|---|---|---|---|---|---|
| 3.1 | Schema del database | Tabelle e migrazioni del modello dati ([Fase 3 §5.5](fase-3-architettura-user-flow.md#55-database)) | — | 6 h | M | 0 |
| 3.2 | POI storici | Almeno 30 POI sui temi Tridentum romana, guerra e ricostruzione, Adige, con testi e fonti | RF-02, RF-04, RNF-V01 | 10 h | M | 1 |
| 3.3 | Affreschi del centro | Almeno 15 affreschi con autore, epoca, posizione e foto con licenza libera | RF-03, RNF-V02 | 8 h | M | 1 |
| 3.4 | Revisione dei contenuti | Controllo incrociato di testi, fonti e licenze delle foto, fatto da un membro diverso dall'autore | RNF-V01, RNF-V02 | 3 h | M | 1 |

#### 4 · Mappa e POI (UC-01) — 36 h

| Codice | Task | Risultato | Requisiti | Stima | Pr. | Sprint |
|---|---|---|---|---|---|---|
| 4.1 | API dei POI | `GET /api/poi?bbox=…` e `GET /api/poi/{id}` con query PostGIS | RF-01, RF-02 | 6 h | M | 1 |
| 4.2 | Mappa | Leaflet, posizione dell'utente, Piazza Duomo se negata, raggruppamento dei POI | RF-01, RNF-P01 | 8 h | M | 1 |
| 4.3 | Anteprima e scheda | Schermate S-02 e S-03, con la scheda dedicata degli affreschi | RF-02, RF-03 | 8 h | M | 1 |
| 4.4 | Elenco di riserva | S-01L quando la mappa non si carica | UC-01 E1 | 2 h | M | 1 |
| 4.5 | Ricerca e filtri | S-04: ricerca per nome, filtri per categoria e tema | RF-04, RF-05 | 8 h | M | 1 |
| 4.6 | Rifinitura su smartphone | Tempi di caricamento di mappa e schede misurati e corretti; prova su telefoni veri | RNF-U01, RNF-P01, RNF-P02 | 4 h | M | 1 |

#### 5 · Account e sicurezza (UC-03, UC-08) — 28 h

| Codice | Task | Risultato | Requisiti | Stima | Pr. | Sprint |
|---|---|---|---|---|---|---|
| 5.1 | Registrazione e accesso | S-07, conferma via e-mail, password con hash, token JWT | RF-10, RF-11, RNF-S02 | 10 h | M | 2 |
| 5.2 | Reimpostazione password | Link via e-mail con scadenza | RF-11 | 3 h | M | 2 |
| 5.3 | Ruoli e limiti nel gateway | Verifica del token, controllo dei ruoli, limite di 5 accessi al minuto | RNF-S03, RNF-S06 | 5 h | M | 2 |
| 5.4 | Profilo | S-09 con i contributi e il loro stato | RF-12 | 4 h | S | 3 |
| 5.5 | Eliminazione dell'account | Disattivazione immediata, cancellazione dei dati entro 30 giorni | RF-13, RNF-S04 | 4 h | M | 2 |
| 5.6 | Privacy | Informativa e consenso alla registrazione | RNF-S04 | 2 h | M | 2 |

#### 6 · Contenuti della community (UC-04, UC-05) — 33 h

| Codice | Task | Risultato | Requisiti | Stima | Pr. | Sprint |
|---|---|---|---|---|---|---|
| 6.1 | Caricamento delle foto | Compressione lato client, controllo di tipo e dimensione, rimozione EXIF, area privata dello storage | RF-14, RNF-S05, RNF-P03 | 10 h | M | 3 |
| 6.2 | Modulo "Aggiungi un ricordo" | S-08 con anno e licenza, al massimo 3 passaggi | RF-14, RF-15, RNF-U02 | 6 h | M | 3 |
| 6.3 | Moderazione | S-13: coda, approvazione, rifiuto con motivazione | RF-16, RF-17 | 8 h | M | 3 |
| 6.4 | Pubblicazione | Copia nell'area pubblica, ricordo visibile nella scheda con autore e licenza | RF-15, RF-16 | 3 h | M | 3 |
| 6.5 | Segnalazioni | Pulsante "Segnala" e coda delle segnalazioni | RF-18 | 4 h | S | 3 |
| 6.6 | Notifiche | E-mail all'autore con l'esito della moderazione | RF-17 | 2 h | M | 3 |

#### 7 · Gestione dei luoghi (UC-07, UC-09) — 13 h

| Codice | Task | Risultato | Requisiti | Stima | Pr. | Sprint |
|---|---|---|---|---|---|---|
| 7.1 | Gestione dei POI | S-14: crea, modifica, elimina POI e affreschi; posizione sulla mappa; fonte obbligatoria | RF-24, RNF-V01 | 10 h | M | 2 |
| 7.2 | Gestione dei ruoli | Assegnare e revocare il ruolo di moderatore | RF-25 | 3 h | M | 2 |

#### 8 · Itinerari e Scopri (UC-02, UC-10) — 20 h

| Codice | Task | Risultato | Requisiti | Stima | Pr. | Sprint |
|---|---|---|---|---|---|---|
| 8.1 | Itinerari tematici | API e schermate S-05, S-06 | RF-07 | 8 h | M | 2 |
| 8.2 | Contenuti degli itinerari | 2 itinerari: "Tridentum romana" e "Guerra e ricostruzione" | RF-07 | 4 h | M | 2 |
| 8.3 | Mappa del gusto | Filtro "gastronomia" con il piatto consigliato | RF-20 | 3 h | S | 3 |
| 8.4 | Tradizioni | S-11 con le voci ordinate per periodo dell'anno | RF-19 | 5 h | S | 3 |

#### 9 · Gioco "Dov'era?" (UC-06) — 15 h · ultimo blocco

Si inizia **solo se** al 06/12/2026 tutti i *Must* dello Sprint 3 sono fatti (§4.5).

| Codice | Task | Risultato | Requisiti | Stima | Pr. | Sprint |
|---|---|---|---|---|---|---|
| 9.1 | Logica del gioco | API della partita e punteggio in base alla distanza | RF-21 | 5 h | C | 3 (ultima settimana) |
| 9.2 | Interfaccia | S-10: foto, segnaposto, risultato | RF-21 | 6 h | C | 3 (ultima settimana) |
| 9.3 | Foto del gioco | 10 foto storiche con licenza libera e posizione esatta | RF-21 | 4 h | C | 3 (ultima settimana) |

#### 10 · AI Service — 8 h

| Codice | Task | Risultato | Requisiti | Stima | Pr. | Sprint |
|---|---|---|---|---|---|---|
| 10.1 | Spike di riconoscimento dei luoghi | Prototipo con un modello open source su 10 POI; misura dell'accuratezza; decisione "si fa / non si fa" per RF-06 | RF-06 | 8 h | C | 2 |

#### 11 · Qualità e rilascio — 44 h

| Codice | Task | Risultato | Requisiti | Stima | Pr. | Sprint |
|---|---|---|---|---|---|---|
| 11.1 | Test automatici delle API | POI e ricerca, accesso e ruoli, moderazione, caricamento di file non validi | RNF-S03, RNF-S05 | 10 h | M | 1, 2, 3 |
| 11.2 | Test di usabilità | 5 persone, scenari di Giulia e Franco | RNF-U03 | 6 h | S | 3 |
| 11.3 | Accessibilità, prestazioni e browser | Lighthouse (Accessibilità ≥ 90, mappa < 3 s), prova su Chrome, Safari, Firefox, Edge | RNF-U04, RNF-P01, RNF-PO01 | 6 h | M | 3 |
| 11.4 | Pubblicazione | Versione online di prova e README con le istruzioni di avvio | RNF-S01, RNF-V03 | 6 h | M | 2, St |
| 11.5 | Correzione dei difetti | Difetti trovati da test e revisioni | — | 10 h | M | 3, St |
| 11.6 | Demo d'esame | Dati di esempio, scaletta della demo, presentazione | — | 6 h | M | St |

### 3.4 Dipendenze principali

Il **percorso critico**, cioè la catena di task che, se ritarda, fa ritardare tutto l'MVP, passa per la community: è la catena più lunga ed è pianificata per ultima.

```mermaid
flowchart LR
    A["2.2 Docker Compose"] --> B["2.4 Backend"]
    B --> C["3.1 Schema DB"]
    C --> D["4.1 API POI"]
    D --> E["4.3 Scheda POI"]
    E --> H["8.1 Itinerari"]
    C --> F["5.1 Accesso"]
    F --> G["5.3 Ruoli"]
    G --> I["7.1 Gestione POI"]
    G --> J["6.1 Caricamento"]
    J --> K["6.3 Moderazione"]
    K --> L["6.4 Pubblicazione"]
    E --> L
    L --> M["11.6 Demo"]
    H --> M
```

Altre dipendenze:
- 3.2 e 3.3 (contenuti) servono per la demo dello Sprint 1: partono subito dopo lo schema del database (3.1).
- 8.1 (itinerari) usa i POI di 3.2: senza contenuti non ci sono itinerari da mostrare.
- 9.3 (foto del gioco) può usare foto della community approvate solo dopo 6.4: un motivo in più per fare il gioco per ultimo.

---

## 4. Piano degli sprint

Il lavoro è diviso in **tre iterazioni da 3 settimane**, precedute da uno Sprint 0 di preparazione e seguite da una settimana di stabilizzazione. Ogni sprint termina con una **versione funzionante** mostrata nella review.

| Sprint | Tema | Cosa si ottiene |
|---|---|---|
| 0 | Fondamenta | L'ambiente di lavoro |
| 1 | **I luoghi di Trento** | La guida dei luoghi: mappa, schede, affreschi, ricerca e filtri |
| 2 | **Gestire e raccontare i luoghi** | Account, gestione dei POI, itinerari tematici |
| 3 | La community | Ricordi e moderazione, Scopri, qualità; il gioco per ultimo |

### 4.1 Roadmap

```mermaid
gantt
    title Roadmap verso l'MVP
    dateFormat YYYY-MM-DD
    axisFormat %d/%m
    section Sprint
    Sprint 0 Fondamenta :s0, 2026-10-05, 7d
    Sprint 1 I luoghi di Trento :s1, after s0, 21d
    Sprint 2 Gestire e raccontare i luoghi :s2, after s1, 21d
    Sprint 3 La community :s3, after s2, 21d
    Stabilizzazione e consegna :st, after s3, 7d
    Riserva non pianificata :crit, rs, after st, 21d
    section Attività trasversali
    Contenuti dei luoghi :c1, 2026-10-12, 21d
    Spike AI Service :a1, 2026-11-02, 14d
    Test di usabilità :u1, 2026-11-30, 7d
    Gioco se avanza tempo :done, g1, 2026-12-07, 7d
    section Milestone
    M-0 Ambiente pronto :milestone, m0, 2026-10-11, 0d
    M-1 Guida dei luoghi consultabile :milestone, m1, 2026-11-01, 0d
    M-2 Luoghi gestiti e itinerari :milestone, m2, 2026-11-22, 0d
    M-3 Blocco delle funzionalità :milestone, m3, 2026-12-13, 0d
    M-4 MVP consegnato :milestone, m4, 2026-12-20, 0d
```

| Milestone | Data | Criterio |
|---|---|---|
| **M-0** Ambiente pronto | 11/10/2026 | `docker compose up` avvia tutto; il DB ha lo schema |
| **M-1** Guida dei luoghi consultabile | 01/11/2026 | Mappa con almeno 30 POI e 15 affreschi, schede con fonti, ricerca e filtri, anche da smartphone |
| **M-2** Luoghi gestiti e itinerari | 22/11/2026 | L'amministratore aggiunge un POI che compare sulla mappa; 2 itinerari percorribili; registrazione e accesso |
| **M-3** Blocco delle funzionalità | 13/12/2026 | Scenario di Franco completo; da qui solo correzioni |
| **M-4** MVP consegnato | 20/12/2026 | Versione online, README, demo pronta |

### 4.2 Sprint 0 — Fondamenta

**05/10 – 11/10/2026 · capacità netta 27 h**

**Obiettivo:** ognuno dei tre può avviare il sistema sul proprio computer con un solo comando.

| Task | Stima |
|---|---|
| 2.1 Organizzazione del repository | 2 h |
| 2.2 Docker Compose | 6 h |
| 2.3 Scheletro del frontend | 6 h |
| 2.4 Scheletro del backend | 6 h |
| 3.1 Schema del database | 6 h |
| **Totale pianificato** | **26 h** · riserva 1 h |

**Demo:** il frontend vuoto si apre sul telefono; il backend risponde; le tabelle esistono. → **M-0**

### 4.3 Sprint 1 — I luoghi di Trento

**12/10 – 01/11/2026 · capacità netta 84 h**

**Obiettivo:** chiunque apra l'app vede sulla mappa i luoghi e gli affreschi di Trento, li cerca, li filtra e ne legge la storia con le fonti. Nessun account richiesto.

| Task | Stima |
|---|---|
| 2.5 API Gateway di base | 3 h |
| 2.6 Integrazione continua | 3 h |
| 3.2 POI storici | 10 h |
| 3.3 Affreschi del centro | 8 h |
| 3.4 Revisione dei contenuti | 3 h |
| 4.1 API dei POI | 6 h |
| 4.2 Mappa | 8 h |
| 4.3 Anteprima e scheda | 8 h |
| 4.4 Elenco di riserva | 2 h |
| 4.5 Ricerca e filtri | 8 h |
| 4.6 Rifinitura su smartphone | 4 h |
| 11.1 Test automatici (POI e ricerca) | 3 h |
| **Totale pianificato** | **66 h** · riserva 18 h |

È il primo sprint di sviluppo vero: la riserva è ampia perché il team sta ancora prendendo confidenza con lo stack (R-02).

**Demo:** scenario di Giulia in via Belenzani: vede gli affreschi vicini, apre la scheda del palazzo, cerca "Tridentum" e filtra per tema (UC-01). → **M-1**

### 4.4 Sprint 2 — Gestire e raccontare i luoghi

**02/11 – 22/11/2026 · capacità netta 84 h**

**Obiettivo:** i luoghi si gestiscono dal pannello senza toccare il codice, e si possono visitare in itinerari tematici. Arrivano gli account, necessari per l'amministrazione e, nello sprint successivo, per la community.

| Task | Stima |
|---|---|
| 5.1 Registrazione e accesso | 10 h |
| 5.2 Reimpostazione password | 3 h |
| 5.3 Ruoli e limiti nel gateway | 5 h |
| 5.5 Eliminazione dell'account | 4 h |
| 5.6 Privacy | 2 h |
| 7.1 Gestione dei POI | 10 h |
| 7.2 Gestione dei ruoli | 3 h |
| 8.1 Itinerari tematici | 8 h |
| 8.2 Contenuti degli itinerari | 4 h |
| 10.1 Spike di riconoscimento dei luoghi *(C)* | 8 h |
| 11.1 Test automatici (accesso e ruoli) | 4 h |
| 11.4 Pubblicazione di prova online | 3 h |
| **Totale pianificato** | **64 h** · riserva 20 h |

**Demo:** l'amministratore aggiunge un affresco che compare subito sulla mappa (UC-07); Giulia segue l'itinerario "Guerra e ricostruzione" (UC-02); registrazione e accesso (UC-03); esito dello spike AI e decisione su RF-06. → **M-2**

### 4.5 Sprint 3 — La community

**23/11 – 13/12/2026 · capacità netta 84 h**

**Obiettivo:** il ciclo completo di un ricordo, dal caricamento alla pubblicazione; la sezione Scopri; la verifica della qualità. Il gioco solo alla fine, se avanza tempo.

Lo sprint ha un **ordine fisso**: prima i *Must*, poi i *Should*, e solo in fondo il gioco.

| Ordine | Task | Stima | Pr. |
|---|---|---|---|
| 1 | 6.1 Caricamento delle foto | 10 h | M |
| 1 | 6.2 Modulo "Aggiungi un ricordo" | 6 h | M |
| 1 | 6.3 Moderazione | 8 h | M |
| 1 | 6.4 Pubblicazione | 3 h | M |
| 1 | 6.6 Notifiche | 2 h | M |
| 1 | 11.1 Test automatici (moderazione e upload) | 3 h | M |
| 1 | 11.3 Accessibilità, prestazioni e browser | 6 h | M |
| 1 | 11.5 Correzione dei difetti | 6 h | M |
| 2 | 8.3 Mappa del gusto | 3 h | S |
| 2 | 5.4 Profilo | 4 h | S |
| 2 | 6.5 Segnalazioni | 4 h | S |
| 2 | 8.4 Tradizioni | 5 h | S |
| 2 | 11.2 Test di usabilità | 6 h | S |
| | **Totale impegnato** | **66 h** · riserva 18 h | |
| 3 | 9.1 – 9.3 Gioco "Dov'era?" | 15 h | C |
| | **Totale con il gioco** | **81 h** · riserva 3 h | |

**Cancello per il gioco:** il 06/12/2026 (fine della seconda settimana) si controlla lo stato. Il gioco parte solo se tutti i task di ordine 1 sono fatti; altrimenti le sue 15 h vanno a chiudere i *Must* e i *Should*, e il gioco passa a dopo l'MVP.

**Demo:** scenario di Franco: carica la foto di piazza Dante nel 1945, il moderatore la approva e compare nella scheda (UC-04, UC-05); sezione Scopri (UC-10); risultati di Lighthouse e dei test di usabilità; se fatto, una partita a "Dov'era?" (UC-06). → **M-3**

### 4.6 Stabilizzazione e consegna

**14/12 – 20/12/2026 · capacità netta 27 h**

| Task | Stima |
|---|---|
| 11.4 Versione online definitiva e README | 3 h |
| 11.5 Correzione dei difetti | 4 h |
| 11.6 Demo d'esame | 6 h |
| **Totale pianificato** | **13 h** · riserva 14 h |

→ **M-4 MVP consegnato**

### 4.7 Riepilogo

| Periodo | Capacità netta | Pianificato | Riserva | Must | Should | Could |
|---|---|---|---|---|---|---|
| Sprint 0 | 27 h | 26 h | 1 h | 26 h | — | — |
| Sprint 1 | 84 h | 66 h | 18 h | 66 h | — | — |
| Sprint 2 | 84 h | 64 h | 20 h | 56 h | — | 8 h |
| Sprint 3 | 84 h | 66 h (+15 h gioco) | 18 h (3 h con il gioco) | 44 h | 22 h | 15 h |
| Stabilizzazione | 27 h | 13 h | 14 h | 13 h | — | — |
| **Totale** | **306 h** | **235 h (+15 h)** | **71 h (56 h)** | **205 h** | **22 h** | **23 h** |

**Cosa comporta questa scelta**
- I *Must* sono cresciuti (205 h, il 67% della capacità netta) perché ricerca, filtri e itinerari ora sono indispensabili. Il metodo DSDM, da cui viene MoSCoW, consiglia di restare sotto il 60%: il margine è più stretto, e per questo il gioco è *Could* e la riserva delle vacanze resta libera.
- I *Must* della community (UC-04, UC-05) arrivano nell'ultimo sprint. Il rischio è gestito con R-16: sono il primo blocco dello Sprint 3, e account e ruoli, che servono alla community, sono già pronti nello Sprint 2.

---

## 5. Modo di lavorare

### 5.1 Processo

Il team segue una versione semplificata di **Scrum**:

| Momento | Quando | Durata | Risultato |
|---|---|---|---|
| **Sprint planning** | Primo giorno dello sprint | 1 h | Task scelti dalla WBS e assegnati |
| **Allineamento** | Due volte a settimana, anche in chat | 10 min | Cosa ho fatto, cosa farò, cosa mi blocca |
| **Sprint review** | Ultimo giorno dello sprint | 30 min | Demo della versione funzionante; revisione dei rischi (§6.4) |
| **Retrospettiva** | Dopo la review | 30 min | Cosa migliorare nello sprint successivo |

Strumenti: una issue GitHub per ogni task, con il codice WBS nel titolo (es. `[4.2] Mappa`); board su GitHub Projects con colonne *Da fare · In corso · In revisione · Fatto*; un branch e una pull request per ogni task.

### 5.2 Definition of Done

Un task è **fatto** solo se:

- [ ] il codice è in una pull request approvata da **un altro membro** del team;
- [ ] i test automatici passano nella CI;
- [ ] funziona su smartphone (360 px) e su desktop;
- [ ] i requisiti collegati sono verificati con il metodo indicato in Fase 2;
- [ ] per i contenuti dei luoghi: ogni scheda ha almeno una fonte e ogni foto ha una licenza che ne permette l'uso;
- [ ] README e documenti sono aggiornati, se serve;
- [ ] chi ci ha lavorato ha aggiornato il proprio libretto.

### 5.3 Controllo dell'avanzamento

- **Velocità:** ore di task completati per sprint. Dopo lo Sprint 1 si confronta con le 66 h pianificate.
- **Soglia di allarme:** se la velocità è sotto l'80% del previsto, nella planning successiva si applica l'ordine di taglio (§2.3), partendo dal gioco.
- **Burndown:** grafico delle ore rimanenti, dalla board di GitHub Projects.

### 5.4 Ruoli

| Ruolo | Area della WBS | Membro |
|---|---|---|
| Frontend | 2.3, 4.2–4.6, 6.2, interfacce di 8.1 e 9.2 | *da assegnare* |
| Backend e sicurezza | 2.4, 2.5, 4.1, 5, 6.1, 6.3–6.6, 7, API di 8.1, 9.1 | *da assegnare* |
| Contenuti dei luoghi, infrastruttura e qualità | 2.1, 2.2, 2.6, 3, 8.2–8.4, 9.3, 10, 11 | *da assegnare* |

Ognuno ha un'area principale, ma ogni pull request è rivista da un altro membro: così nessuna parte del codice è conosciuta da una sola persona (R-12). Nello Sprint 1, tutto il team contribuisce ai contenuti dei luoghi (3.2–3.4), che sono il lavoro più lungo.

---

## 6. Matrice dei rischi

### 6.1 Scala

| Valore | Probabilità | Impatto |
|---|---|---|
| **1 · Bassa** | Improbabile nel corso del progetto | Ritardo di qualche ora o perdita di un *Could* |
| **2 · Media** | Può succedere | Ritardo di una settimana o perdita di un *Should* |
| **3 · Alta** | Molto probabile | MVP a rischio o perdita di un *Must* |

**Esposizione** = Probabilità × Impatto (da 1 a 9). Da 6 in su il rischio è **prioritario** e viene controllato a ogni sprint review.

### 6.2 Registro dei rischi

#### Rischi tecnici

| ID | Rischio | P | I | Esp. | Prevenzione | Piano B (se succede) |
|---|---|---|---|---|---|---|
| **R-01** | Il riconoscimento con la fotocamera (RF-06) non è abbastanza preciso | 3 | 1 | 3 | Spike a tempo limitato (WBS 10.1) con soglia decisa prima: almeno 7 POI su 10 corretti tra i primi 3 risultati | RF-06 resta fuori; l'utente usa la ricerca |
| **R-02** | Il team non conosce abbastanza lo stack (PostGIS, Docker, React) | 2 | 3 | **6** | Stack confermato in base alle competenze; Sprint 0 dedicato all'ambiente; riserva ampia nello Sprint 1; lavoro in coppia sui task difficili | Semplificare: distanze calcolate nel backend invece che in PostGIS |
| **R-03** | Falle di sicurezza in accesso, ruoli o caricamento di file | 2 | 3 | **6** | Librerie consolidate (bcrypt/Argon2, JWT); test automatici sui ruoli (11.1); revisione di ogni PR con la checklist OWASP Top 10 | Disattivare la funzione vulnerabile fino alla correzione |
| **R-04** | La mappa è lenta sullo smartphone (troppi POI, foto pesanti) | 2 | 2 | 4 | Raggruppamento dei POI, richieste solo per l'area visibile, foto ridotte (RNF-P03); rifinitura già nello Sprint 1 (4.6) | Limitare il numero di POI caricati e paginare |
| **R-05** | Il servizio di tile della mappa limita o blocca le richieste durante la demo | 1 | 3 | 3 | Fornitore di tile con piano gratuito e chiave; verifica prima della demo | Elenco dei POI (S-01L); demo in locale |
| **R-06** | Hosting non disponibile o a pagamento | 2 | 2 | 4 | Pubblicazione di prova già nello Sprint 2 (11.4) su un servizio gratuito | Demo in locale con Docker Compose |
| **R-07** | Frontend e backend si integrano tardi e non combaciano | 2 | 2 | 4 | Contratto delle API (OpenAPI) scritto prima del codice; demo integrata a ogni sprint | Dedicare la riserva dello sprint all'integrazione |

#### Rischi di progetto

| ID | Rischio | P | I | Esp. | Prevenzione | Piano B (se succede) |
|---|---|---|---|---|---|---|
| **R-08** | Il team ha meno tempo del previsto (esami, altri corsi): le 10 h a settimana non vengono rispettate. Il margine è stretto perché i *Must* occupano il 67% della capacità | 3 | 3 | **9** | *Must* dei luoghi nei primi sprint; riserva del 23%; gioco come *Could*; velocità misurata dopo lo Sprint 1 | Ordine di taglio (§2.3), partendo dal gioco; uso della riserva delle vacanze |
| **R-09** | Contenuti dei luoghi insufficienti o senza fonti verificabili (RNF-V01): 30 POI e 15 affreschi sono molto lavoro | 2 | 3 | **6** | Contenuti nello Sprint 1 con tutto il team; revisione incrociata (3.4); fonti aperte (Biblioteca comunale, Fondazione Museo storico del Trentino, Wikimedia Commons) | Ridurre a 15 POI e 8 affreschi ben documentati, completando il resto nello Sprint 2 dal pannello (7.1) |
| **R-10** | Vincoli sull'uso delle immagini dei beni culturali (RNF-V02) | 2 | 2 | 4 | Usare solo foto scattate dal team o con licenza libera; contattare la Soprintendenza entro lo Sprint 1 | Schede con solo testo e foto del team |
| **R-11** | Aggiunte non pianificate durante lo sviluppo (*scope creep*) | 2 | 2 | 4 | Nuove idee solo nel backlog, valutate nella planning con MoSCoW; blocco delle funzionalità al 13/12 (M-3) | Rinviare la novità a dopo l'MVP |
| **R-12** | Un membro è assente a lungo o lascia il progetto | 1 | 3 | 3 | Revisione incrociata delle PR; documentazione; nessuna parte nota a una sola persona | Ripianificare con 2 persone applicando l'ordine di taglio |
| **R-13** | Conflitti Git o lavoro perso | 2 | 1 | 2 | Un branch per task, PR, `git pull --rebase`, `main` protetto (CONTRIBUTING.md) | Recupero dalla cronologia di Git |
| **R-14** | Le date d'esame o di consegna sono diverse da quelle ipotizzate | 2 | 3 | **6** | Verificare subito le date sul sito del corso | Spostare le milestone; la riserva delle vacanze copre fino a 3 settimane |
| **R-15** | Parti di codice o documenti non sono compresi a fondo da tutto il team (problema all'esame orale) | 2 | 3 | **6** | Ogni PR è spiegata dall'autore al revisore; nessun codice o testo accettato senza averlo letto e saperlo spiegare | Sessione di ripasso del codice prima dell'esame (dentro 11.6) |
| **R-16** | I *Must* della community (caricamento e moderazione) arrivano nell'ultimo sprint e potrebbero non chiudersi | 2 | 3 | **6** | Community come primo blocco dello Sprint 3; account e ruoli già pronti nello Sprint 2; controllo al cancello del 06/12 | Il gioco non parte; si rinuncia ai *Should* dello Sprint 3; si usa la riserva della stabilizzazione |

### 6.3 Mappa di calore

| Probabilità ↓ · Impatto → | 1 · Basso | 2 · Medio | 3 · Alto |
|---|---|---|---|
| **3 · Alta** | R-01 | — | **R-08** |
| **2 · Media** | R-13 | R-04, R-06, R-07, R-10, R-11 | **R-02, R-03, R-09, R-14, R-15, R-16** |
| **1 · Bassa** | — | — | R-05, R-12 |

### 6.4 Monitoraggio

- A ogni **sprint review** si rivedono i rischi prioritari (esposizione ≥ 6): probabilità e impatto si aggiornano, i rischi chiusi si segnano come tali.
- Ogni rischio prioritario ha un **indicatore** che fa scattare il piano B:

| Rischio | Indicatore | Soglia |
|---|---|---|
| R-08 | Velocità dello sprint | Sotto l'80% del pianificato |
| R-02 | Task bloccati per problemi tecnici | Più di 2 giorni sullo stesso problema |
| R-03 | Test sui ruoli che falliscono | Anche uno solo, prima del merge |
| R-09 | POI con fonte verificata a metà Sprint 1 (25/10) | Meno di 15 |
| R-14 | Date ufficiali dell'esame | Consegna prima del 20/12/2026 |
| R-15 | PR approvate senza spiegazione | Anche una sola |
| R-16 | Ciclo caricamento → moderazione → pubblicazione al 06/12 | Non funzionante dall'inizio alla fine |

---

## 7. Punti aperti

- **Impegno settimanale:** confermare le 10 h a settimana per persona; con 8 h la capacità netta scende a 240 h, il lavoro impegnato (235 h) quasi la esaurisce e il gioco andrebbe escluso subito.
- **Date d'esame:** verificare quando va consegnato il progetto (R-14).
- **Ruoli:** assegnare i tre ruoli di §5.4.
- **Stack:** confermare le tecnologie prima dello Sprint 0 ([Fase 3 §10](fase-3-architettura-user-flow.md#10-punti-aperti)).
- **Soprintendenza:** chi la contatta e quando (R-10).
