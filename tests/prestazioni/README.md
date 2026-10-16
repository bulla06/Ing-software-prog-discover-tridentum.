# Misure di prestazioni, accessibilità e carico

Script per ripetere le misure dei requisiti non funzionali (l’elenco di quelle ancora da fare è in [`docs/compiti.xlsx`](../../docs/compiti.xlsx)). Non fanno parte di `npm test`: servono un server avviato e un browser.

```bash
cd tests/prestazioni
npm install                         # solo la prima volta
npx playwright install chromium     # solo la prima volta
```

Il sito va avviato in versione di produzione, per esempio con Docker Compose (dalla cartella principale):

```bash
LIMITE_RICHIESTE=1000000 docker compose up --build -d   # il limite alto serve solo al test di carico
```

| Script | Requisiti | Cosa misura |
|---|---|---|
| `node lighthouse.mjs http://localhost:3000 risultati/` | RNF-U04, RNF-P01 | Accessibilità, prestazioni e buone pratiche di Lighthouse su 11 pagine, profilo mobile ("4G lento", processore rallentato 4 volte) |
| `node tempi.mjs http://localhost:3000` | RNF-P01, RNF-P02 | Tempo fino ai segnaposti dei luoghi sulla mappa e dal tocco alla scheda, su 4G lento e 4G (mediana di 5 prove) |
| `node carico.mjs http://localhost:3000` | RNF-P04 | 100 connessioni contemporanee per 20 secondi su 7 indirizzi del sito e dell'API |

Se il computer non raggiunge OpenStreetMap o Google Maps, con `TESSERE_FINTE=1` le tessere della mappa vengono servite da `tessera.png` (33 kB, peso realistico) con un ritardo che simula la rete. Con `CHROME_PATH` si sceglie un altro Chrome o Chromium per Lighthouse.
