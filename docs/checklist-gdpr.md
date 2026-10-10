# Checklist GDPR

**Progetto:** Discover Tridentum — Trento Nascosta
**Corso:** Ingegneria del Software · Prof. Paolo Giorgini · A.A. 2026-2027
**Team:** Manuel Bulla · Marco Buffa · Pietro Crea
**Versione:** 0.1 · **Stato:** Bozza
**Documenti di riferimento:** [Fase 2 — Specifiche dei requisiti](fase-2-specifiche-requisiti.md) (RNF-S04) · [Verifica dei requisiti non funzionali](verifica-requisiti-non-funzionali.md)

### Storico delle revisioni

| Versione | Data | Autore | Modifiche |
|---|---|---|---|
| 0.1 | 10/10/2026 | Manuel Bulla (con Claude Code) | Prima stesura: revisione della versione corrente del sito rispetto al Regolamento (UE) 2016/679 |

---

RNF-S04 chiede "informativa privacy, consenso esplicito, cancellazione dei dati entro 30 giorni dalla richiesta", da verificare con una checklist GDPR. Questa è la checklist. Ogni voce indica dove si trova nel sito o nel codice ed è:

- **Fatto:** il sito lo soddisfa;
- **Del titolare:** non dipende dal codice ma da chi pubblica il sito, ed è da fare prima della pubblicazione.

Non è una consulenza legale: prima di una pubblicazione reale va fatta rivedere da chi se ne occupa all'Università o al Comune.

## 1. Trasparenza e consenso

| Voce | Articoli | Esito | Dove |
|---|---|---|---|
| Informativa completa e in linguaggio semplice: titolare e contatti, finalità, basi giuridiche, destinatari, tempi di conservazione, diritti, reclamo al Garante | 12, 13 | Fatto | Pagina "Informativa privacy" (`#/privacy`), in italiano e inglese, raggiungibile da registrazione e profilo |
| I tempi di conservazione scritti nell'informativa sono quelli applicati dal server | 13.2.a | Fatto | L'informativa li legge da `GET /api/informazioni` (`servizi/pulizia.js`) |
| Consenso esplicito alla registrazione: casella non spuntata, obbligatoria, data salvata | 6.1.a, 7 | Fatto | Modulo di registrazione; colonna `consenso_privacy_il` |
| Età minima di 14 anni dichiarata nella casella | 8; art. 2-quinquies D.Lgs. 196/2003 | Fatto | Testo della casella e informativa |
| Consenso separato e facoltativo per usare la propria foto nel gioco | 6.1.a, 7.2 | Fatto | Casella in "Aggiungi un ricordo"; senza consenso il moderatore non può farne un livello (`contenuti_livello_con_consenso`) |
| Indirizzo per le richieste sui dati | 13.1.b | Del titolare | Variabile `EMAIL_PRIVACY` (il server avvisa all'avvio se manca) |

## 2. Minimizzazione e limitazione

| Voce | Articoli | Esito | Dove |
|---|---|---|---|
| Per l'account solo nome visualizzato, e-mail e password | 5.1.c | Fatto | Tabella `utenti` |
| Password solo come hash (bcrypt) | 32 | Fatto | `servizi/password.js` |
| Foto ridotte e senza dati EXIF, compresa la posizione GPS | 5.1.c, 25 | Fatto | `servizi/immagini.js`; test in `contenuti.test.js` |
| La posizione dell'utente resta nel browser; al server arriva solo per l'itinerario su misura, senza essere salvata | 5.1.c | Fatto | `lib/posizione.jsx`, `GET /api/itinerari/su-misura` |
| "Cosa sto guardando?": immagini della fotocamera e bussola elaborate solo nel browser | 5.1.c, 25 | Fatto | `pages/Inquadra.jsx` |
| Punto dello scatto salvato solo con il consenso al gioco | 5.1.b | Fatto | `POST /api/poi/:id/contenuti`; test in `contenuti.test.js` |
| Il registro delle richieste non contiene indirizzi IP; gli IP restano in memoria al massimo un giorno per i limiti contro gli abusi | 5.1.c, 6.1.f | Fatto | `app.js`, `gateway/limiti.js` |
| Cancellazione automatica: account mai confermati dopo 30 giorni, ricordi rifiutati o rimossi dopo 90, sessioni scadute | 5.1.e | Fatto | `servizi/pulizia.js`, eseguita all'avvio e ogni giorno; test in `privacy.test.js` |

## 3. Diritti dell'interessato

| Voce | Articoli | Esito | Dove |
|---|---|---|---|
| Accesso e portabilità: tutti i propri dati in un file JSON | 15, 20 | Fatto | Profilo → "Scarica i miei dati" (`GET /api/me/dati`) |
| Rettifica del nome visualizzato | 16 | Fatto | Profilo → "Cambia nome" (`PATCH /api/me`) |
| Rettifica dell'e-mail, limitazione, opposizione | 16, 18, 21 | Del titolare | Su richiesta all'indirizzo dell'informativa, entro 30 giorni (art. 12.3) |
| Cancellazione immediata, con la password; i ricordi pubblicati si cancellano o restano anonimi a scelta, quelli non pubblicati si cancellano sempre | 17 | Fatto | Profilo → "Elimina il mio account" (`DELETE /api/me`); test in `utenti.test.js` e `contenuti.test.js` |
| Revoca del consenso al gioco | 7.3 | Fatto | Eliminando il ricordo con l'account; per un singolo ricordo su richiesta |
| Reclamo all'autorità di controllo indicato nell'informativa | 77 | Fatto | Informativa, sezione "I tuoi diritti" |

## 4. Sicurezza e cookie

| Voce | Articoli | Esito | Dove |
|---|---|---|---|
| Comunicazioni cifrate (HTTPS) | 32 | Fatto | Proxy HTTPS in `docker-compose.yml` (vedi RNF-S01) |
| Sessione: token di accesso di 15 minuti in memoria, token di rinnovo in un cookie `HttpOnly`, `Secure`, `SameSite=Strict` | 32 | Fatto | `gateway/autenticazione.js` |
| Controllo degli accessi per ruolo su ogni rotta riservata | 25, 32 | Fatto | `tests/backend/ruoli.test.js` |
| Foto in attesa di moderazione visibili solo all'autore e ai moderatori | 25 | Fatto | `GET /api/foto/:id` |
| Limiti contro i tentativi di accesso ripetuti | 32 | Fatto | `gateway/limiti.js` |
| Un solo cookie, tecnico, solo dopo l'accesso; nessun cookie di profilazione o di terze parti: non serve il banner | Direttiva ePrivacy; Linee guida del Garante sui cookie (2021) | Fatto | Informativa, sezione "Cookie e memoria del browser" |
| Le mappe di OpenStreetMap ricevono l'indirizzo IP del visitatore: indicato nell'informativa | 13.1.e | Fatto | Informativa, sezione "Chi riceve i dati" |

## 5. Compiti del titolare prima della pubblicazione

| Voce | Articoli | Esito |
|---|---|---|
| Indicare l'indirizzo per le richieste sui dati (`EMAIL_PRIVACY`) e, se il titolare non è il team, aggiornare la sezione "Chi tratta i dati" | 13 | Del titolare |
| Accordi con i fornitori che trattano dati per conto del titolare: hosting, servizio di posta (SMTP) | 28 | Del titolare |
| Registro delle attività di trattamento | 30 | Del titolare |
| Procedura per le violazioni di dati: chi se ne accorge, chi avvisa il Garante entro 72 ore | 33, 34 | Del titolare |
| Copie di sicurezza del database con gli stessi tempi di conservazione | 5.1.e, 32 | Del titolare |
| Valutazione d'impatto (DPIA): non sembra necessaria, perché non ci sono trattamenti su larga scala di dati particolari né profilazione; da confermare | 35 | Del titolare |
