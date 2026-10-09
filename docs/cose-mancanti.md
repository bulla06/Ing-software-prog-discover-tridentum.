# Cose mancanti rispetto alla Fase 2

**Progetto:** Discover Tridentum — Trento Nascosta
**Corso:** Ingegneria del Software · Prof. Paolo Giorgini · A.A. 2026-2027
**Team:** Manuel Bulla · Marco Buffa · Pietro Crea
**Versione:** 0.1 · **Stato:** Bozza
**Documento di riferimento:** [Fase 2 — Specifiche dei requisiti](fase-2-specifiche-requisiti.md) (v0.4)

### Storico delle revisioni

| Versione | Data | Autore | Modifiche |
|---|---|---|---|
| 0.1 | 09/10/2026 | Manuel Bulla | Prima stesura: controllo della versione corrente del sito rispetto ai requisiti della Fase 2 |

---

## Indice

1. [Scopo e metodo](#1-scopo-e-metodo)
2. [In sintesi](#2-in-sintesi)
3. [Requisiti mancanti o incompleti](#3-requisiti-mancanti-o-incompleti)
4. [Casi d'uso: flussi ed eccezioni non realizzati](#4-casi-duso-flussi-ed-eccezioni-non-realizzati)
5. [Rinvii già decisi](#5-rinvii-già-decisi)

---

## 1. Scopo e metodo

Questo documento elenca ciò che nella **versione corrente del sito** ([`versione-corrente/`](../versione-corrente)) manca, o c'è solo in parte, rispetto ai requisiti della [Fase 2](fase-2-specifiche-requisiti.md): requisiti funzionali (RF), requisiti non funzionali (RNF) e casi d'uso (UC) con i loro flussi alternativi ed eccezioni. Non elenca ciò che è presente e funziona.

Ogni voce ha un **tipo**:

| Tipo | Significato |
|---|---|
| **Mancante** | Non c'è nel sito. |
| **Parziale** | C'è, ma non copre tutto quello che chiede il requisito. |
| **Senza evidenza** | Dal repository non si può dire se il requisito è soddisfatto: serve una misura o una prova. |

**Come è stato fatto il controllo** (9 ottobre 2026, commit `3c1664a`):

- lettura della Fase 2 (v0.4) e del codice di frontend e backend;
- esecuzione dei test automatici (`npm test`): 153 test, tutti superati (7 del frontend, 146 del backend);
- sito avviato in locale e provato a 360 px di larghezza, sulle pagine pubbliche e su quelle riservate (con gli account di prova);
- assenza di connessione simulata bloccando le chiamate all'API;
- build di produzione del frontend, riuscita.

**Non è stato fatto:** l'avvio con Docker Compose (Docker non disponibile), le misure con Lighthouse, le prove su altri browser, l'invio di e-mail vere. I flussi di registrazione, ricordi, moderazione e gioco sono stati verificati attraverso i test automatici, non provati uno per uno dall'interfaccia.

---

## 2. In sintesi

- Tutti i 14 requisiti funzionali *Must* e i 5 *Should* sono presenti nel sito. Restano difetti in RF-13 (eliminazione dell'account), nei contenuti di RF-02 e RF-03 e nei flussi ed eccezioni dei casi d'uso (§4).
- Tra i requisiti funzionali *Could* mancano RF-06 (fotocamera) e, in parte, RF-08 (itinerario generato).
- Tra i requisiti non funzionali *Must* hanno punti aperti RNF-U01, RNF-S01, RNF-S03, RNF-S04, RNF-PO01 e RNF-V02.
- Molte verifiche misurabili previste dalla Fase 2 (accessibilità, tempi di caricamento, test di usabilità, browser) non hanno evidenza nel repository.

---

## 3. Requisiti mancanti o incompleti

### 3.1 Must

| Requisito | Tipo | Cosa manca | Dove |
|---|---|---|---|
| **RNF-U01** Responsive da 360 px, senza scroll orizzontale | Parziale | Nell'area di **Amministrazione**, a 360 px, la barra con le 4 schede (Luoghi, Itinerari, Tradizioni, Utenti e ruoli) è larga 386 px e porta la pagina a 402 px. Le pagine pubbliche e le altre aree riservate sono a posto. | [`stile.css`](../versione-corrente/frontend/src/stile.css) (`.schede-tab`), [`Amministrazione.jsx`](../versione-corrente/frontend/src/pages/Amministrazione.jsx) |
| **RNF-S04** GDPR: informativa privacy | Parziale | L'informativa è un paragrafo di tre frasi nel modulo di registrazione. Mancano: titolare del trattamento e contatti, base giuridica, tempi di conservazione, diritti dell'interessato (accesso, rettifica, cancellazione, reclamo al Garante), uso del cookie di sessione e della memoria del browser. Non c'è nemmeno la checklist GDPR prevista come metodo di verifica. | [`it.js`](../versione-corrente/frontend/src/i18n/it.js) (`accesso.informativaTesto`) |
| **RNF-S04**, **RF-13** Eliminazione dell'account | Parziale | Scegliendo "lascia in forma anonima" restano anche i ricordi **non pubblicati** (in attesa, rifiutati, rimossi), con testo e foto; quelli in attesa restano nella coda di moderazione e possono ancora essere pubblicati. UC-08 (passo 4) prevede la scelta solo per i contributi già pubblicati. I test coprono soltanto il ricordo pubblicato. | [`utenti/rotte.js`](../versione-corrente/backend/src/moduli/utenti/rotte.js) (`DELETE /api/me`) |
| **RNF-S01** Tutto il traffico in HTTPS | Parziale | Il server è pronto (cookie `Secure`, HSTS e `upgrade-insecure-requests` quando `INDIRIZZO_PUBBLICO` è in https), ma nel repository non c'è la configurazione che serve il sito in HTTPS: `docker-compose.yml` espone `http://localhost:3000` e il README rimanda a un proxy esterno da configurare. Non esiste ancora una versione pubblicata su cui verificarlo. | [`docker-compose.yml`](../docker-compose.yml), [`README.md`](../README.md) |
| **RNF-S03** Controllo degli accessi per ruolo | Parziale | Il controllo c'è su tutte le rotte di amministrazione e moderazione, ma i test verificano il rifiuto solo per: creazione di un luogo, caricamento di una foto, elenco degli utenti, coda di moderazione. Non sono coperti: modifica ed eliminazione di luoghi e foto, itinerari, tradizioni, cambio di ruolo, decisioni di moderazione. | [`tests/backend/`](../tests/backend) |
| **RNF-PO01** Compatibilità con i browser | Senza evidenza | Non c'è traccia dei test manuali su Chrome, Safari, Firefox ed Edge (ultime 2 versioni, anche su iOS e Android). | — |
| **RF-02**, **RF-03**, **RNF-V02** Immagini e affreschi | Parziale | Nessuno dei 36 luoghi iniziali ha una foto ufficiale: il caricamento esiste, ma non c'è nessun pacchetto `foto.json`, quindi le schede mostrano il ritaglio della mappa. Gli affreschi sono 6 (la Fase 4, WBS 3.3, ne prevede almeno 15, con foto a licenza libera) e per 3 di essi l'autore è "da verificare". Nei testi dei luoghi "da verificare" compare 11 volte e ogni scheda mostra l'avviso "Contenuti dimostrativi". La verifica con la Soprintendenza (Fase 2, §6) è ancora aperta. | [`001-luoghi-iniziali/`](../versione-corrente/backend/src/db/dati/001-luoghi-iniziali) |

### 3.2 Should

| Requisito | Tipo | Cosa manca | Dove |
|---|---|---|---|
| **RNF-U05** Italiano e inglese | Parziale | È tradotta solo l'interfaccia: sintesi e storia dei luoghi restano in italiano, mentre la Fase 2 chiede anche le "schede principali". Le aree di moderazione e amministrazione sono solo in italiano (scelta dichiarata nel codice). | [`i18n/`](../versione-corrente/frontend/src/i18n), [`dati/`](../versione-corrente/backend/src/db/dati) |
| **RNF-U03** Un nuovo utente trova un POI vicino in 30 s | Senza evidenza | Il test di usabilità con 5 persone non risulta fatto. | — |
| **RNF-U04** Accessibilità (WCAG 2.1 AA, Lighthouse ≥ 90) | Senza evidenza | Nessuna misura nel repository. Il codice contiene accorgimenti (link "Salta al contenuto", etichette ARIA, focus visibile, riduzione del movimento), ma non sono stati verificati con Lighthouse. | — |
| **RNF-P01** Mappa visibile in meno di 3 s su 4G | Senza evidenza | Nessuna misura. Dato utile: la build di produzione ha un JavaScript principale di circa 614 kB (179 kB compressi) e 67 kB di CSS (17,5 kB compressi). | — |
| **RNF-P02** Scheda aperta in meno di 1,5 s | Senza evidenza | Nessuna misura. | — |
| **RNF-PO03** Avvio con un solo comando | Senza evidenza | Da provare su una macchina pulita: `docker compose up --build` richiede prima di creare `.env` e scegliere `JWT_SEGRETO`. | [`docker-compose.yml`](../docker-compose.yml), [`.env.esempio`](../.env.esempio) |

### 3.3 Could

| Requisito | Tipo | Cosa manca | Dove |
|---|---|---|---|
| **RF-06** Riconoscere un luogo con la fotocamera | Mancante | Non c'è nessun codice: né l'AI Service né lo *spike* previsto dalla Fase 4 (WBS 10.1). Il README lo dichiara. | — |
| **RF-08** Itinerario generato in base al tempo e alla posizione di partenza | Parziale | C'è solo il filtro per durata (1 ora, 2 ore, mezza giornata) sugli itinerari già pronti: non si genera un itinerario e non si usa la posizione di partenza. | [`Itinerari.jsx`](../versione-corrente/frontend/src/pages/Itinerari.jsx) |
| **RF-23** Foto della community come livelli del gioco | Parziale | L'attore previsto è il moderatore, ma nel sito la foto diventa un livello in automatico all'approvazione, se l'autore ha dato il consenso: il moderatore non può scegliere. Il livello usa la posizione del luogo, non quella esatta della foto. | [`gioco/rotte.js`](../versione-corrente/backend/src/moduli/gioco/rotte.js) |
| **RNF-PO02** Installabile come PWA | Parziale | C'è il manifest con la sola icona SVG; mancano service worker, icone PNG (192 e 512 px) e `apple-touch-icon`, quindi l'installazione non è garantita (in particolare su iOS). | [`manifest.webmanifest`](../versione-corrente/frontend/public/manifest.webmanifest), [`index.html`](../versione-corrente/frontend/index.html) |
| **RNF-PO04** Dati esportabili | Parziale | Si esportano solo i luoghi, in GeoJSON. Mancano gli itinerari e il reimport (il metodo di verifica è "export e reimport"). | [`luoghi/rotte.js`](../versione-corrente/backend/src/moduli/luoghi/rotte.js) (`/api/esporta/poi.geojson`) |
| **RNF-P04** Risposta sotto 1 s con 100 utenti | Mancante | Il test di carico non è stato fatto. | — |

---

## 4. Casi d'uso: flussi ed eccezioni non realizzati

| Caso d'uso | Tipo | Cosa manca | Dove |
|---|---|---|---|
| **UC-01 E3** Nessun luogo entro 1 km | Mancante | Non c'è l'allargamento della vista: la mappa si centra sull'utente a zoom 16 e, se questi è lontano dai luoghi, non ne vede nessuno. Resta solo l'elenco ordinato per distanza. | [`Mappa.jsx`](../versione-corrente/frontend/src/pages/Mappa.jsx) |
| **UC-01 E2**, **UC-02 E2** Connessione assente | Parziale | Il comportamento previsto (avviso che serve una connessione e proposta di riprovare) c'è solo in parte. Provato bloccando l'API: la mappa dice "Il server è avviato?" invece di parlare di connessione (con "Riprova"); la scheda del luogo ha il messaggio giusto ma niente "Riprova"; **Itinerari** dice "Nessun itinerario per questo tempo"; il dettaglio di un itinerario dice "Itinerario non trovato"; **Scopri** resta vuota, senza nessun messaggio. | [`Mappa.jsx`](../versione-corrente/frontend/src/pages/Mappa.jsx), [`Scheda.jsx`](../versione-corrente/frontend/src/pages/Scheda.jsx), [`Itinerari.jsx`](../versione-corrente/frontend/src/pages/Itinerari.jsx), [`Itinerario.jsx`](../versione-corrente/frontend/src/pages/Itinerario.jsx), [`Scopri.jsx`](../versione-corrente/frontend/src/pages/Scopri.jsx), [`it.js`](../versione-corrente/frontend/src/i18n/it.js) (`mappa.erroreCaricamento`) |
| **UC-02 passo 8** Fine dell'itinerario | Parziale | All'ultima tappa il pulsante diventa "Fine del percorso" (disabilitato): non c'è un messaggio di fine né la proposta di altri itinerari vicini. | [`Itinerario.jsx`](../versione-corrente/frontend/src/pages/Itinerario.jsx) |
| **UC-02 7a** Raggiungere una tappa | Parziale | Nella pagina dell'itinerario non c'è "Come arrivare" verso un servizio di mappe esterno: il link c'è solo nella scheda del luogo. | [`Itinerario.jsx`](../versione-corrente/frontend/src/pages/Itinerario.jsx), [`Scheda.jsx`](../versione-corrente/frontend/src/pages/Scheda.jsx) |
| **UC-02 E1** Tappa rimossa | Mancante | Se un amministratore elimina un luogo, la tappa sparisce dagli itinerari senza che il visitatore ne sia avvisato. | [`001_schema_iniziale.sql`](../versione-corrente/backend/src/db/migrazioni/001_schema_iniziale.sql) (tabella `tappe`, `ON DELETE CASCADE`) |
| **UC-10 passo 4** Voci in corso o vicine | Parziale | Si mettono in evidenza solo le voci del mese in corso, non quelle "vicine". | [`Scopri.jsx`](../versione-corrente/frontend/src/pages/Scopri.jsx) |
| **UC-10 passo 6**, **RF-19** Luoghi collegati sulla mappa | Parziale | I luoghi collegati a una tradizione sono solo link, non compaiono sulla mappa. Inoltre "Carnevale e grostoli" e "Santa Lucia" non hanno nessun luogo collegato. | [`Scopri.jsx`](../versione-corrente/frontend/src/pages/Scopri.jsx), [`tradizioni.json`](../versione-corrente/backend/src/db/dati/001-luoghi-iniziali/tradizioni.json) |

---

## 5. Rinvii già decisi

La [Fase 4](fase-4-pianificazione.md#22-cosa-entra) aveva già escluso dall'MVP alcune voci di questo elenco:

- **RF-06** e l'AI Service: era previsto solo uno *spike* di riconoscimento, che nel repository non c'è;
- **RF-08**: tra i requisiti *Could* entra nell'MVP solo RF-21 (gioco);
- **RNF-U05**: l'inglese solo per l'interfaccia, con le schede in italiano;
- **RNF-P04**: test di carico rinviato.

Gli altri punti di questo documento erano previsti dal piano e non risultano rinviati.
