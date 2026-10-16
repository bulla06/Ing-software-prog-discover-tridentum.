# Spot da 30 secondi di Discover Tridentum

Prima prova di spot per il sito: 1280 × 720, 30 secondi, con musica originale. Bozza, non ancora nella presentazione.

**Storia in 7 scene:** foto storica del Duomo («Trento ha una storia che non trovi su Google») · Palazzo Geremia («Basta alzare gli occhi») · mappa · schede · itinerari · «Dov'era?» · schermata finale con il sito.

| File | A cosa serve |
|---|---|
| `ad-30s.webm` | Il video registrato, con la musica |
| `ad-30s-musica.wav` | La sola colonna sonora (stereo, 44,1 kHz), per montarla altrove |
| `ad.html` | L'animazione (canvas) e la colonna sonora: testi, tempi e scene. Aperta nel browser gira in ciclo, senza audio |
| `registra.mjs` | Registra `ad.html` in un WebM con Chrome, senza programmi esterni (`node registra.mjs`). Con `--frame 2,10,20` salva solo alcuni fotogrammi per controllare l'aspetto |
| `cattura.mjs` | Cattura le schermate del sito online in `catture/` (solo letture, nessun account) |
| `catture/` | Le schermate del sito usate nello spot |

Le foto non sono in questa cartella: `registra.mjs` le prende dal repository. La foto storica del Duomo (pubblico dominio) è quella del benvenuto del sito; la foto di Palazzo Geremia è di `ai/test-0.1/foto` (le foto di Marco, che non vanno su GitHub).

La musica è composta dal codice (pad, basso, arpeggio, battito leggero e una campana sul finale), senza campioni né brani di altri, quindi non ci sono diritti da pagare; cambia accordo a ogni scena. I livelli sono controllati (picco a -4 dB), ma non è una produzione professionale: va ascoltata.

Il WebM si apre in Chrome, Edge e Firefox; per PowerPoint o i social va convertito in MP4.
