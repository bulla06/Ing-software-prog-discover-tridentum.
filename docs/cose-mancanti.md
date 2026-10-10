# Cose mancanti rispetto alla Fase 2

**Progetto:** Discover Tridentum — Trento Nascosta
**Corso:** Ingegneria del Software · Prof. Paolo Giorgini · A.A. 2026-2027
**Team:** Manuel Bulla · Marco Buffa · Pietro Crea
**Versione:** 0.2 · **Stato:** Bozza
**Documenti di riferimento:** [Fase 2 — Specifiche dei requisiti](fase-2-specifiche-requisiti.md) (v0.4) · [Verifica dei requisiti non funzionali](verifica-requisiti-non-funzionali.md) · [Checklist GDPR](checklist-gdpr.md)

### Storico delle revisioni

| Versione | Data | Autore | Modifiche |
|---|---|---|---|
| 0.1 | 09/10/2026 | Manuel Bulla | Prima stesura: controllo della versione corrente del sito rispetto ai requisiti della Fase 2 |
| 0.2 | 10/10/2026 | Manuel Bulla | Secondo controllo sul frontend v3 (commit `182f99f`): 17 voci su 26 chiuse e verificate; restano le foto dei luoghi, i compiti del titolare per la privacy, le prove con persone e dispositivi reali e il riconoscimento dall'immagine; aggiunte le sezioni sulle voci chiuse, su quelle non riverificabili e sulla documentazione da riallineare |

---

## Indice

1. [Scopo e metodo](#1-scopo-e-metodo)
2. [In sintesi](#2-in-sintesi)
3. [Ancora aperti](#3-ancora-aperti)
4. [Dichiarati dal team, non riverificati](#4-dichiarati-dal-team-non-riverificati)
5. [Chiusi dalla v0.1](#5-chiusi-dalla-v01)
6. [Documentazione da riallineare](#6-documentazione-da-riallineare)
7. [Rinvii già decisi](#7-rinvii-già-decisi)

---

## 1. Scopo e metodo

Questo documento elenca ciò che nella **versione corrente del sito** ([`versione-corrente/`](../versione-corrente), frontend v3) manca, o c'è solo in parte, rispetto ai requisiti della [Fase 2](fase-2-specifiche-requisiti.md): requisiti funzionali (RF), requisiti non funzionali (RNF) e casi d'uso (UC) con i loro flussi alternativi ed eccezioni. Le voci chiuse restano nel §5, così si vede cosa è cambiato.

La v0.1 (9 ottobre) aveva **26 voci**: 7 *Must*, 6 *Should*, 6 *Could* e 7 flussi dei casi d'uso. Il team ne ha completate molte (commit `44b52b7`, `c9c6181` e `976c0ad`, uniti in `182f99f`). Questa versione ricontrolla ogni voce sul codice e sul sito in funzione, senza fidarsi dei messaggi dei commit, e cerca lacune nuove.

Ogni voce aperta ha un **tipo**:

| Tipo | Significato |
|---|---|
| **Mancante** | Non c'è nel sito. |
| **Parziale** | C'è, ma non copre tutto quello che chiede il requisito. |
| **Senza evidenza** | Dal repository non si può dire se il requisito è soddisfatto: serve una misura o una prova. |

**Come è stato fatto il controllo** (10 ottobre 2026, commit `182f99f`):

- lettura delle modifiche dal commit `9e68299` (frontend v3, backend, pacchetti di dati, documenti di verifica);
- test automatici: 285 superati (11 del frontend e 274 del backend), contro i 153 della v0.1;
- build di produzione e sito avviato in locale (JavaScript iniziale: 168 kB compressi);
- browser integrato a 360 px di larghezza: 17 schermate da visitatore e 8 con l'account amministratore di prova, senza scorrimento orizzontale; assenza di connessione simulata su 7 pagine;
- Chrome headless con un profilo temporaneo (protocollo CDP): installabilità come app, service worker, apertura senza rete, tempi con rete e processore rallentati, mappa allargata, pagina "Cosa sto guardando?";
- controlli sui dati con l'API (45 luoghi, traduzioni, esportazioni, itinerario su misura), confronto tra le rotte protette del codice e i test dei ruoli, `npm ci --dry-run` sul lockfile committato, prova a secco dello script delle foto e controllo di accessibilità di base sul DOM di 19 pagine.

**Non è stato fatto:** l'avvio con Docker Compose e il proxy HTTPS (Docker non è disponibile in questo ambiente), Lighthouse, il test di carico, le prove con Edge, Firefox, Safari e telefoni, la bussola reale, l'invio di e-mail vere e le prove con persone. I flussi di registrazione, ricordi, moderazione e gioco sono stati verificati attraverso i test automatici, non provati uno per uno dall'interfaccia.

---

## 2. In sintesi

- Delle 26 voci della v0.1, **17 sono chiuse** e verificate (§5): tutti i flussi dei casi d'uso e i requisiti *Could* RF-08, RF-23, RNF-PO02 e RNF-PO04.
- **9 restano aperte**: per 6 c'è ancora qualcosa da fare (§3), le altre 3 sono dichiarate dal team ma non si sono potute rifare qui (§4).
- Le aperte sono quasi tutte cose che il codice non chiude da solo: le foto dei luoghi (lo script è pronto ma non è stato eseguito, e la scelta automatica va rivista), i compiti del titolare per la privacy, la verifica con la Soprintendenza e le prove con persone e dispositivi reali.
- Non ho trovato nuove lacune nel funzionamento del sito. I punti nuovi sono piccoli: un errore di grammatica nell'informativa, il poco margine sul tempo di apertura della scheda (§5) e la documentazione da riallineare (§6).

---

## 3. Ancora aperti

### 3.1 Must

| Requisito | Tipo | Cosa manca | Dove |
|---|---|---|---|
| **RF-02**, **RF-03**, **RNF-V02** Foto dei luoghi e Soprintendenza | Parziale | Nessuno dei 45 luoghi ha ancora una foto ufficiale: le schede mostrano il ritaglio della mappa. Lo script `npm run scarica-foto` c'è ma non è stato eseguito (non esiste nessun pacchetto con `foto.json`). Dalla prova a secco (`npm run scarica-foto -- --prova`) risulta che da questo computer Wikimedia Commons è raggiungibile e che per 37 luoghi su 39 esiste una foto con licenza libera; restano senza `fogolino-torrion-da-basso` e `calisio`. La scelta automatica però va rivista a mano prima del commit: per esempio propone per `villa-margon` la foto di una forma di formaggio e per `nettuno` la stessa foto del Duomo. La verifica con la Soprintendenza (Fase 2, §6) è ancora da fare. Il resto di RF-03 è chiuso: 16 affreschi (la Fase 4 ne chiede almeno 15), nessuna nota "da verificare" nei testi e almeno una fonte per ogni luogo. | [`foto-da-scaricare.json`](../versione-corrente/backend/src/db/dati/foto-da-scaricare.json), [`scarica-foto.js`](../versione-corrente/backend/src/strumenti/scarica-foto.js) |
| **RNF-S04** GDPR: indirizzo e compiti del titolare | Parziale | L'informativa ora è completa (7 sezioni, in italiano e inglese: titolari, basi giuridiche, tempi di conservazione, destinatari, cookie, diritti, reclamo al Garante) e il sito applica diritti e conservazione. Resta da impostare l'indirizzo per le richieste sui dati (`EMAIL_PRIVACY`): finché è vuoto la pagina dice «scrivi a l’indirizzo indicato da chi gestisce il sito» (con un errore di grammatica) e il server lo segnala soltanto in produzione. Restano anche i compiti del titolare elencati nel §5 della [checklist GDPR](checklist-gdpr.md): accordi con hosting e posta, registro dei trattamenti, procedura per le violazioni, copie di sicurezza, valutazione d'impatto. | [`informativa.js`](../versione-corrente/frontend/src/i18n/informativa.js), [`.env.esempio`](../.env.esempio) |
| **RNF-PO01** Compatibilità con i browser | Senza evidenza | Il sito è stato provato soltanto su Chrome (browser integrato e Chrome headless). Non c'è traccia di prove su Edge, Firefox, Safari, iPhone e Android: la tabella del protocollo (§8.3 della [verifica](verifica-requisiti-non-funzionali.md)) è vuota. Su un telefono vanno provate anche l'installazione come app e la bussola di "Cosa sto guardando?". | — |

### 3.2 Should

| Requisito | Tipo | Cosa manca | Dove |
|---|---|---|---|
| **RNF-U03** Un nuovo utente trova un POI vicino in 30 s | Senza evidenza | Il test di usabilità con 5 persone non è stato fatto: c'è il protocollo (§8.1 della [verifica](verifica-requisiti-non-funzionali.md)), ma la tabella dei risultati è vuota. | — |
| **RNF-U04** Accessibilità (WCAG 2.1 AA, Lighthouse ≥ 90) | Parziale | Il controllo manuale con tastiera, screen reader, zoom al 200% e riduzione del movimento non è stato fatto (protocollo nel §8.2 della [verifica](verifica-requisiti-non-funzionali.md)). Lighthouse 100 su 11 pagine è dichiarato dal team, ma non l'ho rifatto (qui non è installato). Un controllo di base sul DOM di 19 pagine non ha trovato problemi: immagini con testo alternativo, controlli con un nome, titoli in ordine, nessun id duplicato. | — |

### 3.3 Could

| Requisito | Tipo | Cosa manca | Dove |
|---|---|---|---|
| **RF-06** Riconoscere un luogo con la fotocamera | Parziale | "Cosa sto guardando?" mostra la fotocamera e propone il luogo che si ha davanti usando posizione e bussola, poi apre la scheda; non riconosce l'immagine (l'AI Service della Fase 3 §5.4 non c'è e il README lo dice). Provato in Chrome headless in Piazza Duomo, dove la bussola non c'è: elenca i luoghi entro 150 m (Fontana del Nettuno a 30 m, Cattedrale di San Vigilio, gli affreschi del Trecento nel Duomo). Con la bussola la scelta dipende dalla direzione: la logica ha test unitari, ma l'evento della bussola non si è potuto simulare. | [`Inquadra.jsx`](../versione-corrente/frontend/src/pages/Inquadra.jsx), [`geo.js`](../versione-corrente/frontend/src/lib/geo.js) |

---

## 4. Dichiarati dal team, non riverificati

Il documento [Verifica dei requisiti non funzionali](verifica-requisiti-non-funzionali.md) dà come superate tre prove che qui non si sono potute rifare, perché servono Docker o strumenti non installati. Non sono lacune del sito: sono prove da ripetere o da confermare.

| Requisito | Cosa dichiara il team | Cosa ho potuto controllare |
|---|---|---|
| **RNF-S01** Tutto il traffico in HTTPS | Proxy Caddy provato in locale: redirect 308, HTTP/2, HSTS, cookie `Secure`, porta 3000 chiusa | `docker-compose.yml` e `Caddyfile` sono coerenti con quanto dichiarato; il server manda HSTS e compressione gzip. Resta da provare sul server pubblicato, con il suo dominio. |
| **RNF-PO03** Avvio con un solo comando | `docker compose up --build` senza preparare niente: 45 luoghi caricati, segreto dei token creato da solo | `npm ci --dry-run` sul lockfile committato riesce (è il passo del Dockerfile), la build di produzione funziona e il segreto si crea da solo in produzione ([`config.js`](../versione-corrente/backend/src/config.js)). |
| **RNF-P04** Risposta sotto 1 s con 100 utenti | 99° percentile tra 109 e 280 ms con 100 connessioni, nessun errore (Docker e PostgreSQL) | Niente: servono Docker e autocannon, e il limite di 600 richieste al minuto per indirizzo IP andrebbe alzato con `LIMITE_RICHIESTE`. Gli script sono in [`tests/prestazioni/`](../tests/prestazioni). |

---

## 5. Chiusi dalla v0.1

| Voce della v0.1 | Cosa è stato fatto | Come l'ho verificato |
|---|---|---|
| **RNF-U01** Responsive da 360 px | Le 5 schede dell'amministrazione vanno a capo su due righe | Browser integrato a 360 px su 25 schermate (17 da visitatore, 8 con l'account amministratore di prova): la larghezza della pagina è sempre 360 px |
| **RNF-S04**, **RF-13**, UC-08 Eliminazione dell'account | I ricordi non pubblicati si cancellano sempre, con le foto; "in forma anonima" vale solo per quelli pubblicati; il testo della finestra lo dice | Codice di `DELETE /api/me` e test del backend superati |
| **RNF-S03** Accesso per ruolo | [`ruoli.test.js`](../tests/backend/ruoli.test.js) prova 29 rotte riservate senza accesso (401), con un ruolo insufficiente (403) e con quello giusto | Le 29 rotte protette del codice sono tutte nel test; i test passano |
| **RNF-U05** Italiano e inglese | Schede, itinerari, tradizioni, piatti e informativa anche in inglese (`?lingua=en`) | Dal vivo in inglese: scheda, affresco, itinerario, Scopri e informativa. Nell'API nessuna sintesi o storia resta in italiano; uguali all'italiano restano solo 8 nomi propri (per esempio "Palazzo Thun") |
| **RNF-P01** Mappa in meno di 3 s su 4G | JavaScript iniziale a 168 kB compressi, pagine caricate quando servono, compressione gzip | Chrome con processore 4 volte più lento e mappe vere di OpenStreetMap: luoghi sulla mappa in 2,4 s con il 4G lento (da 2,26 a 2,47 s su 5 prove) e in 1,4 s con il 4G |
| **RNF-P02** Scheda in meno di 1,5 s | Il codice della scheda si scarica in anticipo appena la mappa ha i luoghi | Stesse condizioni, dal tocco al titolo della scheda: mediana 1,2 s (da 1,03 a 1,49 s). Dentro il limite, ma con poco margine; il valore del documento di verifica (0,65–0,75 s) non si è riprodotto |
| **RF-08** Itinerario su misura | "Crea il tuo itinerario": tempo disponibile, tema e punto di partenza (posizione o Piazza Duomo) | API: 120 minuti dal Duomo danno 10 tappe, da un punto lontano risponde 404 (nessun itinerario possibile); la pagina dell'itinerario su misura si apre a 360 px senza problemi |
| **RF-23** Foto della community come livelli del gioco | Il moderatore sceglie se la foto diventa un livello di "Dov'era?" (solo con il consenso dell'autore); l'autore può indicare il punto dello scatto | Codice, migrazione 004 e test del backend |
| **RNF-PO02** Installabile come PWA | Manifest con icone PNG, `apple-touch-icon` e service worker | Chrome headless: nessun errore di installabilità (solo "in-incognito", dovuto al profilo temporaneo), service worker attivo con la cache dell'app, pagina aperta senza rete con l'avviso "Serve una connessione a Internet" e "Riprova" che ricarica i luoghi. Nel browser integrato i service worker non funzionano |
| **RNF-PO04** Dati esportabili | Esportazione di luoghi (GeoJSON, con le traduzioni) e itinerari (JSON); importazione dal pannello di amministrazione | API: 45 luoghi e 10 itinerari esportati; scheda "Esporta e importa" presente; importazioni coperte dai test |
| **UC-01 E3** Nessun luogo entro 1 km | La mappa si allarga fino ai luoghi più vicini | Chrome con posizione simulata a 5–6 km da Piazza Duomo: avviso "Nessun luogo entro 1 km da te" e 4 segnaposti più la posizione dell'utente nella vista |
| **UC-01 E2**, **UC-02 E2** Connessione assente | Un solo avviso "Serve una connessione a Internet" con "Riprova", in tutte le pagine con dati | API bloccata su 7 pagine (mappa, scheda, itinerari, itinerario, itinerario su misura, tradizioni, mappa del gusto) e Chrome senza rete |
| **UC-02 passo 8** Fine dell'itinerario | "Percorso completato!" e fino a 3 itinerari vicini | Dal vivo: messaggio e tre itinerari vicini |
| **UC-02 7a** Raggiungere una tappa | "Come arrivare" (Google Maps a piedi) per ogni tappa dell'itinerario | Dal vivo |
| **UC-02 E1** Tappa rimossa | Le tappe dei luoghi eliminati restano come "rimosse" (migrazione 004) e la pagina avvisa che il percorso le salta | Codice, migrazione e test (`tappe_rimosse`); non provato dal vivo |
| **UC-10 passo 4** Voci in corso o vicine | Prima le voci in corso, poi "Tra poco", poi il resto dell'anno | Dal vivo: in ottobre i "Mercatini di Natale" compaiono sotto "Tra poco" |
| **UC-10 passo 6**, **RF-19** Luoghi collegati sulla mappa | Ogni tradizione ha "Sulla mappa" (filtro `?tradizione=`) e tutte e 6 hanno luoghi collegati | Dal vivo e con l'API: "Luoghi di: Mercatini di Natale" mostra 2 luoghi |

---

## 6. Documentazione da riallineare

- **Fase 2 (v0.4):** non è cambiata dal 1° ottobre. Lo stato dei requisiti, i "Punti aperti" (§6, per esempio RF-06) e le matrici di tracciabilità non riflettono quanto realizzato. Mancano anche le funzioni nate dalla privacy (scarica i miei dati, cambio del nome, conservazione automatica) e l'importazione dei dati: il [CONTRIBUTING](../CONTRIBUTING.md) chiede di aggiornare le matrici quando un requisito cambia.
- **Fase 3 (v0.2):** il §8 dice ancora che il proxy HTTPS "resta da configurare con l'hosting", ma ora esiste il profilo `https` con Caddy. Non risultano registrate le nuove decisioni (proxy HTTPS, traduzioni salvate nei dati, service worker, pulizia dei dati scaduti).
- **Verifica dei requisiti non funzionali (v0.1):** rimanda ancora alla v0.1 di questo documento; inoltre il tempo di apertura della scheda (0,65–0,75 s) è più ottimistico di quello rifatto qui (1,0–1,5 s): conviene ripeterlo con le mappe vere.

---

## 7. Rinvii già decisi

La [Fase 4](fase-4-pianificazione.md#22-cosa-entra) aveva già escluso dall'MVP alcune voci:

- **RF-06:** il riconoscimento dall'immagine (AI Service e coda dei lavori) resta rinviato; il sito ha la versione per posizione e bussola.
- **RF-08, RNF-U05 (schede) e RNF-P04** non sono più rinviati: il 10 ottobre il team ha realizzato l'itinerario su misura e i contenuti in inglese, e ha dichiarato la misura del carico (§4).

Gli altri punti di questo documento erano previsti dal piano e non risultano rinviati.
