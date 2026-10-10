# Verifica dei requisiti non funzionali

**Progetto:** Discover Tridentum — Trento Nascosta
**Corso:** Ingegneria del Software · Prof. Paolo Giorgini · A.A. 2026-2027
**Team:** Manuel Bulla · Marco Buffa · Pietro Crea
**Versione:** 0.1 · **Stato:** Bozza
**Documenti di riferimento:** [Fase 2 — Specifiche dei requisiti](fase-2-specifiche-requisiti.md) (v0.4) · [Cose mancanti](cose-mancanti.md) (v0.1)

### Storico delle revisioni

| Versione | Data | Autore | Modifiche |
|---|---|---|---|
| 0.1 | 10/10/2026 | Manuel Bulla (con Claude Code) | Prima stesura: misure e prove sulla versione corrente (frontend v3) dopo il completamento dei punti di "Cose mancanti" |

---

## Indice

1. [Scopo e ambiente](#1-scopo-e-ambiente)
2. [In sintesi](#2-in-sintesi)
3. [Usabilità](#3-usabilità)
4. [Prestazioni](#4-prestazioni)
5. [Sicurezza](#5-sicurezza)
6. [Portabilità](#6-portabilità)
7. [Vincoli](#7-vincoli)
8. [Da fare con persone e dispositivi reali](#8-da-fare-con-persone-e-dispositivi-reali)

---

## 1. Scopo e ambiente

Il documento raccoglie le prove con cui si verificano i requisiti non funzionali della [Fase 2 §3](fase-2-specifiche-requisiti.md#3-requisiti-non-funzionali), usando il metodo di verifica indicato per ciascuno. Le voci che il documento [Cose mancanti](cose-mancanti.md) segnava "senza evidenza" hanno qui una misura, oppure un protocollo pronto da eseguire quando la misura richiede persone o dispositivi reali (§8).

**Ambiente delle misure** (10 ottobre 2026, versione corrente con il frontend v3):

- computer con 4 processori e 16 GB di memoria; browser Chromium (Playwright) senza interfaccia;
- sito in versione di produzione: frontend compilato servito dal backend Node.js 22, con compressione gzip;
- test di carico e prove di Docker e HTTPS sull'avvio con Docker Compose (PostgreSQL 16 + PostGIS 3.4);
- **mappe:** da questo computer i server di OpenStreetMap non sono raggiungibili, quindi le tessere della mappa sono state servite in locale con un peso realistico (33 kB l'una) e un ritardo che simula la rete. Sul campo il tempo di caricamento delle tessere dipende dai server di OpenStreetMap.

Gli script per ripetere le misure sono in [`tests/prestazioni/`](../tests/prestazioni).

---

## 2. In sintesi

| Requisito | Priorità | Metodo | Risultato | Esito |
|---|---|---|---|---|
| RNF-U01 Responsive da 360 px | M | Prova automatica su 20 pagine | Nessuno scorrimento orizzontale a 360, 768 e 1280 px | Superato |
| RNF-U03 POI vicino in 30 s | S | Test di usabilità con 5 persone | Protocollo pronto (§8.1) | Da fare |
| RNF-U04 Accessibilità | S | Lighthouse + controllo manuale | Lighthouse 100 su 11 pagine su 11 | Superato con Lighthouse; manca il controllo manuale (§8.2) |
| RNF-U05 Italiano e inglese | S | Revisione dei testi | Interfaccia, schede, itinerari, tradizioni e piatti tradotti; aree del team solo in italiano | Superato per le parti pubbliche |
| RNF-P01 Mappa in meno di 3 s su 4G | S | Misura nel browser e Lighthouse | Luoghi sulla mappa in 2,5 s (4G lento) e 1,6 s (4G) | Superato |
| RNF-P02 Scheda in meno di 1,5 s | S | Misura nel browser | 0,75 s (4G lento) e 0,65 s (4G) dal tocco | Superato |
| RNF-P04 Sotto 1 s con 100 utenti | C | Test di carico | 99° percentile tra 109 e 280 ms, nessun errore | Superato |
| RNF-S01 Tutto in HTTPS | M | Controllo della configurazione | Proxy HTTPS in Docker Compose, provato in locale | Superato (da ripetere sul server pubblicato) |
| RNF-S03 Accesso per ruolo | M | Test automatici | 29 rotte riservate provate senza accesso, con ruolo insufficiente e con il ruolo giusto | Superato |
| RNF-S04 GDPR | M | Checklist GDPR | [Checklist](checklist-gdpr.md): requisiti del sito soddisfatti; restano compiti del titolare prima della pubblicazione | Superato per il sito |
| RNF-PO01 Browser | M | Test manuali sui browser | Chromium provato in automatico; protocollo per gli altri (§8.3) | Da fare |
| RNF-PO02 Installabile come PWA | C | Controllo su smartphone | Chrome lo considera installabile; si apre anche senza rete | Superato nel browser; manca la prova sui telefoni (§8.3) |
| RNF-PO03 Avvio con un solo comando | S | Avvio su una macchina pulita | `docker compose up --build` senza preparare niente | Superato |
| RNF-PO04 Dati esportabili | C | Export e reimport | Luoghi in GeoJSON e itinerari in JSON, reimportati identici | Superato |
| RNF-V02 Immagini dei beni culturali | M | Verifica con la Soprintendenza | Foto solo con licenza libera e crediti; verifica non ancora fatta | Da fare (§7) |

---

## 3. Usabilità

### RNF-U01 — Responsive da 360 px

Prova automatica con Playwright: per ogni pagina si confronta la larghezza del documento con quella dello schermo.

- **360 px:** mappa, elenco, due schede, itinerari, un itinerario, l'itinerario su misura, Scopri (tradizioni e gusto), gioco, profilo, informativa, "Cosa sto guardando?", registrazione, moderazione e le cinque schede dell'amministrazione (20 pagine).
- **768 e 1280 px:** le nove pagine principali.

Nessuna pagina scorre in orizzontale e non ci sono errori JavaScript. Sono stati corretti due punti: la barra delle schede dell'amministrazione, che ora va a capo, e la tabella degli utenti, dove gli indirizzi e-mail lunghi vanno a capo.

### RNF-U04 — Accessibilità

Lighthouse (versione 12, profilo mobile) su 11 pagine, ognuna aperta come alla prima visita:

| Pagina | Accessibilità | Prestazioni | Buone pratiche |
|---|---|---|---|
| Mappa | 100 | 68 | 93 |
| Scheda (Duomo) | 100 | 80 | 96 |
| Scheda (Palazzo Niccolini) | 100 | 80 | 96 |
| Itinerari | 100 | 75 | 96 |
| Itinerario "Trento dipinta" | 100 | 80 | 96 |
| Scopri | 100 | 94 | 100 |
| Dov'era? | 100 | 90 | 100 |
| Profilo | 100 | 95 | 100 |
| Informativa privacy | 100 | 95 | 100 |
| Registrazione | 100 | 94 | 100 |
| Cosa sto guardando? | 100 | 97 | 100 |

Il punteggio di prestazioni delle pagine con la mappa dipende soprattutto dal download delle tessere di OpenStreetMap con il profilo "4G lento" (vedi §4). L'unico problema di accessibilità trovato, un pulsante focalizzabile dentro un'area nascosta agli screen reader in "Cosa sto guardando?", è stato corretto.

Lighthouse controlla solo una parte dei criteri WCAG 2.1 AA: il controllo manuale con tastiera e screen reader è descritto in §8.2.

### RNF-U05 — Lingue

- **Interfaccia:** tutti i testi in italiano e inglese; un test controlla che i due dizionari abbiano le stesse chiavi.
- **Contenuti:** nome, sintesi, storia, epoca e dati degli affreschi di tutti i 45 luoghi, i 10 itinerari, le 6 tradizioni e i 14 piatti hanno la traduzione inglese (pacchetti di dati `002` e `003`). Un test controlla che ogni voce sia tradotta e che la storia abbia gli stessi paragrafi nelle due lingue.
- **Pannello di amministrazione:** si possono scrivere e correggere i testi in inglese di luoghi, itinerari e tradizioni. Le aree di moderazione e amministrazione restano in italiano: le usa solo il team.
- **Tedesco:** previsto "in seguito" dalla Fase 2, non c'è.

---

## 4. Prestazioni

### RNF-P01 — Mappa con i POI visibile in meno di 3 s su 4G

Misura nel browser: dall'apertura del sito al momento in cui i segnaposti dei luoghi compaiono sulla mappa, con rete e processore rallentati (processore 4 volte più lento) e la schermata di benvenuto già vista. Mediana di 5 prove:

| Rete simulata | Prove (ms) | Mediana |
|---|---|---|
| 4G lento (profilo mobile di Lighthouse: 1,6 Mbit/s, 150 ms) | 2.520 · 2.358 · 2.468 · 2.532 · 2.430 | **2,5 s** |
| 4G (9 Mbit/s, 60 ms) | 1.571 · 1.458 · 1.579 · 1.574 · 1.480 | **1,6 s** |

Con Lighthouse (stesso profilo "4G lento") la mappa ha il primo contenuto visibile a 2,0 s. L'elemento più grande della pagina è una tessera della mappa, che con il profilo "4G lento" e tessere da 33 kB arriva a 5,5 s: sono immagini di OpenStreetMap, non del nostro server, e i luoghi sono già sulla mappa prima.

Per arrivarci il JavaScript iniziale è sceso da 183 a 168 kB compressi: icone generate solo negli stili usati, pagine secondarie caricate quando servono, compressione gzip nel server e file con l'impronta nel nome in cache per un anno.

### RNF-P02 — Scheda aperta in meno di 1,5 s dal tocco

Stessa misura nel browser: dal tocco su un luogo dell'elenco al titolo della scheda visibile, con i dati scaricati in quel momento. Il codice della scheda si scarica in anticipo nei momenti liberi, appena la mappa ha i luoghi.

| Rete simulata | Prove (ms) | Mediana |
|---|---|---|
| 4G lento | 725 · 728 · 750 · 762 · 792 | **0,75 s** |
| 4G | 715 · 622 · 649 · 654 · 645 | **0,65 s** |

### RNF-P04 — Tempo di risposta sotto 1 s con 100 utenti

Test di carico con autocannon: 100 connessioni contemporanee per 20 secondi su ogni indirizzo, contro l'avvio con Docker Compose (PostgreSQL). Il limite contro gli abusi (600 richieste al minuto per indirizzo IP) è stato alzato per il test, perché tutte le richieste partono dallo stesso computer.

| Indirizzo | Richieste | Al secondo | Mediana | 90° perc. | 99° perc. | Massimo | Errori |
|---|---|---|---|---|---|---|---|
| `/` (pagina) | 26.821 | 1.341 | 72 ms | 89 ms | 109 ms | 754 ms | 0 |
| `/api/poi` | 11.379 | 569 | 172 ms | 205 ms | 280 ms | 380 ms | 0 |
| `/api/poi/duomo` | 11.850 | 593 | 161 ms | 205 ms | 264 ms | 777 ms | 0 |
| `/api/itinerari` | 14.167 | 708 | 139 ms | 165 ms | 189 ms | 219 ms | 0 |
| `/api/tradizioni` | 20.073 | 1.004 | 97 ms | 117 ms | 141 ms | 838 ms | 0 |
| `/api/gusto` | 17.735 | 887 | 110 ms | 134 ms | 170 ms | 565 ms | 0 |
| `/api/itinerari/su-misura` | 13.480 | 674 | 143 ms | 172 ms | 191 ms | 1.410 ms | 0 |

Il 99% delle risposte arriva entro 280 ms. Su circa 115.000 richieste il tempo massimo ha superato il secondo una sola volta (1,4 s, itinerario su misura).

---

## 5. Sicurezza

### RNF-S01 — Tutto il traffico in HTTPS

`docker-compose.yml` ha un proxy HTTPS (Caddy, file [`infrastruttura/Caddyfile`](../infrastruttura/Caddyfile)), attivo con il profilo `https`: ottiene da solo il certificato per il dominio indicato in `DOMINIO`. Provato in locale con `DOMINIO=localhost` (certificato locale di Caddy):

| Controllo | Risultato |
|---|---|
| `http://localhost/` | 308, redirect a `https://localhost/` |
| `https://localhost/` | 200 su HTTP/2 |
| HSTS | `max-age=31536000; includeSubDomains`, un solo header |
| Content Security Policy | contiene `upgrade-insecure-requests` |
| Cookie di sessione dopo l'accesso | `HttpOnly; Secure; SameSite=Strict` |
| Porta 3000 dell'app | solo sul computer (`PORTA_APP=127.0.0.1:3000`) |

Resta da ripetere il controllo sul server pubblicato, con il suo dominio.

### RNF-S03 — Controllo degli accessi per ruolo

[`tests/backend/ruoli.test.js`](../tests/backend/ruoli.test.js) prova ognuna delle 29 rotte riservate (amministrazione, importazione, moderazione, account) in tre modi: senza accesso deve rispondere 401, con un ruolo insufficiente 403 e con il ruolo giusto deve superare il controllo. Un altro test verifica che un token di accesso modificato a mano non valga. Il ruolo si rilegge dal database a ogni richiesta, quindi una revoca vale subito (test in `utenti.test.js`).

### RNF-S04 — GDPR

Vedi la [checklist GDPR](checklist-gdpr.md).

---

## 6. Portabilità

### RNF-PO02 — Installabile come PWA

Manifest con icone PNG (192 e 512 px, una "maskable"), `apple-touch-icon` per iOS e un service worker che conserva il guscio dell'app. Prove in Chromium:

- `Page.getInstallabilityErrors` (Chrome DevTools Protocol): nessun errore, il sito è installabile;
- il service worker è attivo dopo la prima visita;
- senza rete il sito si apre dalla cache e mostra l'avviso "Serve una connessione a Internet" con "Riprova" (UC-01 E2).

I dati dell'API e le foto non vengono conservati: devono essere aggiornati e alcuni sono personali. Manca la prova sui telefoni (§8.3).

### RNF-PO03 — Avvio con un solo comando

Su volumi Docker vuoti e senza file `.env`:

```bash
docker compose up --build
```

Il server crea da solo il segreto per i token e lo conserva nel volume dei dati; il sito risponde su http://localhost:3000 con il database PostgreSQL, 45 luoghi caricati e i nuovi pacchetti di dati. Nel computer delle prove la rete dei container era limitata, quindi l'immagine è stata costruita con la rete del computer e il suo certificato; su un computer normale basta il comando sopra.

### RNF-PO04 — Dati esportabili

- **Esportazione:** luoghi in GeoJSON (`/api/esporta/poi.geojson`), con tutti i campi e le traduzioni, e itinerari in JSON (`/api/esporta/itinerari.json`), dal profilo e dal pannello di amministrazione.
- **Reimportazione:** dal pannello di amministrazione, scheda "Esporta e importa".
- **Prove automatiche** in `tests/backend/luoghi.test.js`: un file esportato e reimportato dà lo stesso file all'esportazione successiva; un itinerario eliminato torna con le stesse tappe; se una voce non è valida non si importa niente.

### RNF-PO01 — Compatibilità con i browser

Il codice è compilato da Vite per i browser "baseline widely available" (Chrome ed Edge 111, Firefox 114, Safari e iOS 16.4 e successivi), che comprendono le ultime due versioni richieste. In Chromium le prove automatiche passano a 360, 768 e 1280 px. Le prove sugli altri browser e sui telefoni sono in §8.3.

---

## 7. Vincoli

**RNF-V01 (fonti):** ogni luogo ha almeno una fonte; i 9 nuovi affreschi e le correzioni del pacchetto `002` citano fonti consultabili. Nei testi non restano note "da verificare" (un test lo controlla).

**RNF-V02 (immagini dei beni culturali):** il sito pubblica solo foto con licenza libera e ne mostra sempre autore, licenza e fonte. Lo script `npm run scarica-foto` le prende da Wikimedia Commons con i crediti; da questo computer Commons non era raggiungibile, quindi le foto dei luoghi vanno scaricate da un computer con la rete aperta. Resta da fare la verifica con la Soprintendenza prevista dalla Fase 2 §6.

---

## 8. Da fare con persone e dispositivi reali

### 8.1 RNF-U03 — Test di usabilità

**Obiettivo:** almeno 4 persone su 5 trovano un POI vicino entro 30 secondi, senza istruzioni.

**Protocollo:**

1. Cinque persone che non hanno mai visto il sito, possibilmente due turisti e tre residenti (Fase 1).
2. Telefono con il sito aperto sulla schermata di benvenuto, posizione attiva, in Piazza Duomo o nel centro.
3. Consegna, sempre uguale: «Trova un luogo da visitare qui vicino e aprine la scheda.» Nessun altro aiuto.
4. Si cronometra dal primo tocco all'apertura della scheda; si annotano esitazioni e commenti.
5. Esito: superato se almeno 4 persone ci riescono entro 30 secondi.

| Persona | Profilo | Tempo (s) | Riuscita | Note |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

### 8.2 RNF-U04 — Controllo manuale di accessibilità

- Navigazione solo da tastiera di mappa, scheda, itinerario, registrazione e invio di un ricordo: ordine del focus, focus visibile, "Salta al contenuto".
- Lettura con uno screen reader (VoiceOver su iPhone, TalkBack su Android, NVDA su Windows) delle stesse pagine.
- Zoom del testo al 200% senza perdita di contenuti.
- Riduzione del movimento attiva nel sistema operativo.

### 8.3 RNF-PO01 e RNF-PO02 — Browser e telefoni

Per ogni combinazione: mappa con la posizione, scheda, itinerario fino alla fine, registrazione e accesso, invio di un ricordo con foto, gioco, "Cosa sto guardando?" (fotocamera e bussola) e, sui telefoni, installazione sulla schermata home.

| Browser | Dispositivo | Versione | Esito | Note |
|---|---|---|---|---|
| Chrome | Windows o macOS | | | |
| Edge | Windows | | | |
| Firefox | Windows o macOS | | | |
| Safari | macOS | | | |
| Safari | iPhone | | | |
| Chrome | Android | | | |
