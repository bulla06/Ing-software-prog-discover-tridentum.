# Test 0.1 · DINOv2 small distingue due affreschi?

**Data:** 16/10/2026 · **Modello:** [`onnx-community/dinov2-small`](https://huggingface.co/onnx-community/dinov2-small) (DINOv2 small, circa 22 milioni di parametri) · **Foto:** 72 (casa-balduini: 23, palazzo-geremia: 49), caricate da Marco su Drive (cartella «FOTO LUOGHI TN») e scattate il 14/10/2026 con un iPhone 13. Non sono state usate altre foto.

## In breve

- **Nella prova onesta (a blocchi, senza le foto gemelle tra i riferimenti) il modello assegna al luogo giusto 72 foto su 72 (100%)** con il modello in precisione piena (fp32), e 72 su 72 (100%) con il modello a 8 bit da 24 MB, quello che andrebbe nel browser.
- **Con una sola foto di riferimento per affresco**: 62 su 62 corrette (100%). Con 3 foto per affresco: 42 su 42 (100%).
- **I due affreschi sono molto diversi per il modello:** la somiglianza media tra foto dello stesso affresco è 0,73 (casa-balduini) e 0,74 (palazzo-geremia), tra affreschi diversi solo 0,43.
- **Quanto somiglia una foto giusta alla più simile tra i riferimenti:** 0,85 in mediana e 0,59 nel caso peggiore. Un valore molto più basso vuol dire che la foto non assomiglia a nessuno dei due affreschi.
- **Tempo:** circa 286 ms a foto con fp32 e 236 ms con int8 su questo computer (solo CPU, Node.js). Nel browser di un telefono andrà più lento: va misurato.

## Le foto

Una cartella per luogo in `foto/` (non va su GitHub: le foto hanno dentro posizione GPS e data). I nomi dei file sono quelli di Drive.

| Cartella | Luogo | Foto | Cosa si vede |
|---|---|---|---|
| `casa-balduini` | Casa Balduini, piazza Duomo | 23 (IMG_0297–0319) | facciata con decori a grottesche chiari, vista dalla terrazza del ristorante Scrigno del Duomo |
| `palazzo-geremia` | Palazzo Geremia, via Belenzani | 49 (IMG_0421–0469) | facciata rossa e ocra con portale ad arco, trifora e balcone; anche dettagli da vicino |

> **Attenzione:** con due soli luoghi molto diversi (uno grigio-azzurro, uno rosso e ocra) è il caso facile. Dice che il modello e il metodo funzionano, non che riconoscerà bene tutti i 45 luoghi: palazzi vicini con affreschi simili (via Belenzani) saranno la vera prova.

## Come si è provato

1. **Impronta di ogni foto.** DINOv2 small riceve la foto ridotta a 224 × 224 pixel (lato corto a 256 e ritaglio al centro) e restituisce un vettore di numeri, l’«impronta». Foto simili hanno impronte vicine; la vicinanza si misura con la *somiglianza del coseno* (1 = uguali, 0 = niente in comune). Non si cambiano i pesi del modello: «addestrare» qui vuol dire calcolare e conservare le impronte delle foto di riferimento (`costruisci-indice.mjs`).
2. **Riconoscimento.** Una foto nuova prende il luogo della foto di riferimento più simile (*vicino*, il metodo principale); in alternativa si confronta con il vettore medio di ogni luogo (*prototipo*). Il *margine* è la distanza tra il punteggio del luogo scelto e quello dell’altro: più è alto, più la scelta è netta.
3. **Prova onesta.** Le foto di uno stesso affresco sono scattate a raffica e sono quasi uguali. Se una foto di prova avesse la «gemella» tra i riferimenti il risultato sarebbe gonfiato. Quindi: (a) *una foto alla volta* (la più ottimista, solo confronto); (b) *a blocchi*: 5 blocchi di foto consecutive per luogo, ognuno tenuto da parte a turno e tolto dai riferimenti insieme alle 2 foto che lo circondano per lato; (c) *poche foto di riferimento* (1, 2, 3, 5, 8 per luogo, distribuite lungo la serie), provando sulle foto lontane almeno 3 posti dai riferimenti.

## Risultati

Foto giuste, metodo *vicino*, impronta CLS (le altre varianti sono nel file `risultati.json`).

| Prova | modello fp32 | modello int8 |
|---|---|---|
| Una foto alla volta (ottimista) | 72/72 (100%) | 72/72 (100%) |
| **A blocchi, senza gemelle (onesta)** | **72/72 (100%)** | **72/72 (100%)** |
| 1 foto di riferimento per luogo | 62/62 (100%) | 62/62 (100%) |
| 2 foto di riferimento per luogo | 52/52 (100%) | 51/52 (98,1%) |
| 3 foto di riferimento per luogo | 42/42 (100%) | 42/42 (100%) |
| 5 foto di riferimento per luogo | 24/24 (100%) | 24/24 (100%) |
| 8 foto di riferimento per luogo | 9/9 (100%) | 9/9 (100%) |
| Margine mediano / minimo (a blocchi) | 0,324 / 0,089 | 0,332 / 0,103 |

### Varianti dell’impronta (prova a blocchi, foto giuste)

| Variante | fp32: vicino | int8: vicino | fp32: prototipo | int8: prototipo | 1 foto per luogo (fp32) |
|---|---|---|---|---|---|
| cls: token CLS (384 numeri) | 72/72 (100%) | 72/72 (100%) | 72/72 (100%) | 72/72 (100%) | 62/62 (100%) |
| media: media delle patch (384 numeri) | 72/72 (100%) | 72/72 (100%) | 72/72 (100%) | 72/72 (100%) | 60/62 (96,8%) |
| cls_media: CLS + media delle patch (768 numeri) | 72/72 (100%) | 72/72 (100%) | 72/72 (100%) | 72/72 (100%) | 62/62 (100%) |

### Foto sbagliate e foto incerte

Nessuna foto sbagliata nella prova a blocchi (fp32, CLS, vicino).

Le 5 foto più incerte (margine più basso):

| Foto | Luogo vero | Scelto | Somiglianza scelto / altro | Margine |
|---|---|---|---|---|
| `palazzo-geremia/IMG_0465.JPEG` | palazzo-geremia | palazzo-geremia | 0,59 / 0,50 | 0,089 |
| `palazzo-geremia/IMG_0466.JPEG` | palazzo-geremia | palazzo-geremia | 0,63 / 0,52 | 0,104 |
| `casa-balduini/IMG_0318.JPEG` | casa-balduini | casa-balduini | 0,83 / 0,62 | 0,204 |
| `casa-balduini/IMG_0297.JPEG` | casa-balduini | casa-balduini | 0,84 / 0,63 | 0,210 |
| `casa-balduini/IMG_0298.JPEG` | casa-balduini | casa-balduini | 0,83 / 0,62 | 0,212 |

Le due più incerte sono foto in cui l’edificio si vede poco: `IMG_0465` è quasi tutta strada e selciato, `IMG_0466` mostra solo il portone e un pezzo di muro.

Errori nelle altre prove (le foto sono tutte giuste nella prova a blocchi): `IMG_0465.JPEG` (fp32, cls, prototipo, 2 foto di riferimento per luogo); `IMG_0441.JPEG` (fp32, media, vicino, 1 foto di riferimento per luogo); `IMG_0442.JPEG` (fp32, media, vicino, 1 foto di riferimento per luogo); `IMG_0441.JPEG` (fp32, media, prototipo, 1 foto di riferimento per luogo); `IMG_0442.JPEG` (fp32, media, prototipo, 1 foto di riferimento per luogo); `IMG_0441.JPEG` (fp32, media, prototipo, 2 foto di riferimento per luogo); `IMG_0465.JPEG` (int8, cls, vicino, 2 foto di riferimento per luogo); `IMG_0465.JPEG` (int8, cls, prototipo, 2 foto di riferimento per luogo); `IMG_0465.JPEG` (int8, cls_media, prototipo, 2 foto di riferimento per luogo).

## Soglie provvisorie per «non lo riconosco»

Senza foto di altri luoghi non si può misurare quando il modello sbaglia scambiando per un affresco qualcosa che non lo è. Le soglie di `prova.mjs` guardano solo quanto somigliano alla foto più simile le foto giuste della prova a blocchi: **riconosciuto** da 0,77 in su (5° percentile delle foto giuste) e con margine almeno 0,05; **non sono sicuro** tra 0,47 e 0,77; **non assomiglia a nessuno dei due** sotto 0,47 (80% della somiglianza minima delle foto giuste). Sono valori provvisori, da rifare con più luoghi.

## Cosa non dice questo test

- **Solo due luoghi e molto diversi.** Il vero problema sono i palazzi vicini con affreschi simili: servono più luoghi e più foto.
- **Foto di una sola persona, in una sola giornata** (14/10/2026, tra le 14:45 e le 14:50, stessa luce e stesso telefono). Servono foto di altre ore, di altre persone e con altre fotocamere.
- **Foto a raffica.** Anche con le gemelle tolte, le foto di una serie hanno punti di vista simili: la prova a blocchi è onesta ma resta ottimistica rispetto a chi inquadra da un angolo diverso.
- **Il browser non è stato misurato.** Qui si usa Node.js sul computer; nel browser del telefono tempi e consumi vanno provati.

## Come rifare la prova

Vedi il [README](../README.md).
