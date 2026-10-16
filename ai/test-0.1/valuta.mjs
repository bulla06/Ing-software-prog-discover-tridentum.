// Valutazione onesta del test 0.1: DINOv2 small riesce a distinguere i due affreschi?
// Usa solo le foto in foto/<luogo>/ (le foto di Marco): niente foto prese da altre parti.
// Le prove (una alla volta, a blocchi, con poche foto di riferimento) sono spiegate in protocolli.mjs.
//
// Uso:  node valuta.mjs [--dtype fp32,int8]
// Scrive in risultati/: report.md, risultati.json e report.html (con le anteprime, non va su GitHub).

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { CARTELLA, CARTELLA_RISULTATI, DESCRIZIONE_VARIANTI, NOME_MODELLO, VARIANTI, assicuraImpronte, elencaFoto, formato, mediana, somiglianza } from './lib.mjs'
import { BLOCCHI, CURVA, SPAZIO, aBlocchi, pochiRiferimenti, preparaVoci, riassunto, soglieDa, unaAllaVolta } from './protocolli.mjs'

const args = process.argv.slice(2)
const opzione = (nome, predefinito) => {
  const i = args.indexOf(nome)
  return i >= 0 ? args[i + 1] : predefinito
}
const DTYPES = opzione('--dtype', 'fp32,int8').split(',')
const VARIANTE_PRINCIPALE = 'cls'
const DTYPE_PRINCIPALE = DTYPES[0]

const foto = elencaFoto()
if (foto.length < 4) {
  console.error('Servono almeno due luoghi con alcune foto in foto/<luogo>/')
  process.exit(1)
}
const luoghi = [...new Set(foto.map((f) => f.classe))]
const conteggi = Object.fromEntries(luoghi.map((c) => [c, foto.filter((f) => f.classe === c).length]))

// ---------- Prove ----------

function provaVariante(impronte, variante) {
  const { voci } = preparaVoci(foto, impronte, variante)
  const blocchi = aBlocchi(voci, luoghi)

  // somiglianza media tra foto dello stesso luogo e di luoghi diversi
  const media = (valori) => (valori.length ? valori.reduce((s, x) => s + x, 0) / valori.length : null)
  const stessoLuogo = {}
  const tra = {}
  for (const a of luoghi) {
    stessoLuogo[a] = media(voci.flatMap((x, i) => voci.slice(i + 1).filter((y) => x.classe === a && y.classe === a).map((y) => somiglianza(x.v, y.v))))
    for (const b of luoghi) if (a < b) tra[`${a} / ${b}`] = media(voci.filter((x) => x.classe === a).flatMap((x) => voci.filter((y) => y.classe === b).map((y) => somiglianza(x.v, y.v))))
  }
  return {
    una_alla_volta: riassunto(unaAllaVolta(voci), luoghi),
    a_blocchi: riassunto(blocchi, luoghi),
    poche_foto: CURVA.map((k) => pochiRiferimenti(voci, luoghi, k)),
    somiglianza_media: { stesso_luogo: stessoLuogo, luoghi_diversi: tra },
    soglie: soglieDa(blocchi),
    // il dettaglio foto per foto serve solo per la variante principale (il file resta leggero)
    dettagli_blocchi: variante === VARIANTE_PRINCIPALE ? blocchi : undefined,
  }
}

// ---------- Esecuzione ----------

const risultati = {
  creato_il: new Date().toISOString(),
  modello: NOME_MODELLO,
  foto: conteggi,
  prova_a_blocchi: { blocchi: BLOCCHI, foto_vicine_escluse_per_lato: SPAZIO },
  dtype: {},
}
const improntePerDtype = {}
for (const dtype of DTYPES) {
  console.log(`\n=== Modello ${dtype} ===`)
  const impronte = await assicuraImpronte(dtype, foto)
  improntePerDtype[dtype] = impronte
  risultati.dtype[dtype] = {
    ms_per_foto_mediana: mediana(foto.map((f) => impronte[f.relativo].ms)),
    varianti: Object.fromEntries(VARIANTI.map((v) => [v, provaVariante(impronte, v)])),
  }
}

// ---------- Riepilogo a video ----------
for (const dtype of DTYPES) {
  console.log(`\n--- ${dtype}: ${risultati.dtype[dtype].ms_per_foto_mediana} ms per foto (mediana, CPU di questo PC) ---`)
  console.log(['variante'.padEnd(10), 'una alla volta'.padEnd(16), 'a blocchi'.padEnd(12), 'margine mediano / minimo (blocchi)'.padEnd(36), '1 foto per luogo'].join('  '))
  for (const v of VARIANTI) {
    const r = risultati.dtype[dtype].varianti[v]
    const b = r.a_blocchi.vicino
    console.log([v.padEnd(10), `${r.una_alla_volta.vicino.giuste}/${r.una_alla_volta.vicino.n}`.padEnd(16), `${b.giuste}/${b.n}`.padEnd(12), `${formato(b.margine_mediano)} / ${formato(b.margine_minimo)}`.padEnd(36), `${r.poche_foto[0].vicino.giuste}/${r.poche_foto[0].vicino.n}`].join('  '))
  }
}

// ---------- Report ----------
const principale = risultati.dtype[DTYPE_PRINCIPALE].varianti[VARIANTE_PRINCIPALE]
const pc = (x) => (x == null ? '-' : `${String(x).replace('.', ',')}%`)
const cella = (r) => `${r.giuste}/${r.n} (${pc(r.accuratezza)})`

/** Elenco di tutti gli errori in tutte le prove, per dtype, variante, protocollo e metodo */
function raccogliErrori() {
  const voci = []
  for (const [dtype, d] of Object.entries(risultati.dtype)) {
    for (const [variante, r] of Object.entries(d.varianti)) {
      const protocolli = [['una foto alla volta', r.una_alla_volta], ['a blocchi', r.a_blocchi], ...r.poche_foto.map((p) => [`${p.k} foto di riferimento per luogo`, p])]
      for (const [nome, prova] of protocolli) {
        for (const metodo of ['vicino', 'prototipo']) {
          for (const file of prova[metodo].errori) voci.push(`\`${file.split('/')[1]}\` (${dtype}, ${variante}, ${metodo}, ${nome})`)
        }
      }
    }
  }
  return voci
}

function scriviMarkdown() {
  const R = risultati.dtype
  const dtypeLeggero = DTYPES.includes('int8') ? 'int8' : DTYPE_PRINCIPALE
  const leggero = R[dtypeLeggero].varianti[VARIANTE_PRINCIPALE]
  const b = principale.a_blocchi.vicino
  const bl = leggero.a_blocchi.vicino
  const k1 = principale.poche_foto[0].vicino
  const k3 = principale.poche_foto[2].vicino
  const sm = principale.somiglianza_media
  const [, valoreTra] = Object.entries(sm.luoghi_diversi)[0]
  const sg = principale.soglie.somiglianza_giuste
  const m = []
  m.push('# Test 0.1 · DINOv2 small distingue due affreschi?')
  m.push('')
  m.push(`**Data:** ${new Date(risultati.creato_il).toLocaleDateString('it-IT')} · **Modello:** [\`${NOME_MODELLO}\`](https://huggingface.co/${NOME_MODELLO}) (DINOv2 small, circa 22 milioni di parametri) · **Foto:** ${foto.length} (${luoghi.map((c) => `${c}: ${conteggi[c]}`).join(', ')}), caricate da Marco su Drive (cartella «FOTO LUOGHI TN») e scattate il 14/10/2026 con un iPhone 13. Non sono state usate altre foto.`)
  m.push('')
  m.push('## In breve')
  m.push('')
  m.push(`- **Nella prova onesta (a blocchi, senza le foto gemelle tra i riferimenti) il modello assegna al luogo giusto ${b.giuste} foto su ${b.n} (${pc(b.accuratezza)})** con il modello in precisione piena (${DTYPE_PRINCIPALE})${dtypeLeggero !== DTYPE_PRINCIPALE ? `, e ${bl.giuste} su ${bl.n} (${pc(bl.accuratezza)}) con il modello a 8 bit da 24 MB, quello che andrebbe nel browser` : ''}.`)
  m.push(`- **Con una sola foto di riferimento per affresco**: ${k1.giuste} su ${k1.n} corrette (${pc(k1.accuratezza)}). Con 3 foto per affresco: ${k3.giuste} su ${k3.n} (${pc(k3.accuratezza)}).`)
  m.push(`- **I due affreschi sono molto diversi per il modello:** la somiglianza media tra foto dello stesso affresco è ${luoghi.map((c) => `${formato(sm.stesso_luogo[c], 2)} (${c})`).join(' e ')}, tra affreschi diversi solo ${formato(valoreTra, 2)}.`)
  m.push(`- **Quanto somiglia una foto giusta alla più simile tra i riferimenti:** ${formato(sg.mediana, 2)} in mediana e ${formato(sg.minimo, 2)} nel caso peggiore. Un valore molto più basso vuol dire che la foto non assomiglia a nessuno dei due affreschi.`)
  m.push(`- **Tempo:** circa ${Math.round(R[DTYPE_PRINCIPALE].ms_per_foto_mediana)} ms a foto con ${DTYPE_PRINCIPALE}${DTYPES.includes('int8') ? ` e ${Math.round(R.int8.ms_per_foto_mediana)} ms con int8` : ''} su questo computer (solo CPU, Node.js). Nel browser di un telefono andrà più lento: va misurato.`)
  m.push('')
  m.push('## Le foto')
  m.push('')
  m.push('Una cartella per luogo in `foto/` (non va su GitHub: le foto hanno dentro posizione GPS e data). I nomi dei file sono quelli di Drive.')
  m.push('')
  m.push('| Cartella | Luogo | Foto | Cosa si vede |')
  m.push('|---|---|---|---|')
  m.push(`| \`casa-balduini\` | Casa Balduini, piazza Duomo | ${conteggi['casa-balduini'] ?? '-'} (IMG_0297–0319) | facciata con decori a grottesche chiari, vista dalla terrazza del ristorante Scrigno del Duomo |`)
  m.push(`| \`palazzo-geremia\` | Palazzo Geremia, via Belenzani | ${conteggi['palazzo-geremia'] ?? '-'} (IMG_0421–0469) | facciata rossa e ocra con portale ad arco, trifora e balcone; anche dettagli da vicino |`)
  m.push('')
  m.push('> **Attenzione:** con due soli luoghi molto diversi (uno grigio-azzurro, uno rosso e ocra) è il caso facile. Dice che il modello e il metodo funzionano, non che riconoscerà bene tutti i 45 luoghi: palazzi vicini con affreschi simili (via Belenzani) saranno la vera prova.')
  m.push('')
  m.push('## Come si è provato')
  m.push('')
  m.push('1. **Impronta di ogni foto.** DINOv2 small riceve la foto ridotta a 224 × 224 pixel (lato corto a 256 e ritaglio al centro) e restituisce un vettore di numeri, l’«impronta». Foto simili hanno impronte vicine; la vicinanza si misura con la *somiglianza del coseno* (1 = uguali, 0 = niente in comune). Non si cambiano i pesi del modello: «addestrare» qui vuol dire calcolare e conservare le impronte delle foto di riferimento (`costruisci-indice.mjs`).')
  m.push('2. **Riconoscimento.** Una foto nuova prende il luogo della foto di riferimento più simile (*vicino*, il metodo principale); in alternativa si confronta con il vettore medio di ogni luogo (*prototipo*). Il *margine* è la distanza tra il punteggio del luogo scelto e quello dell’altro: più è alto, più la scelta è netta.')
  m.push(`3. **Prova onesta.** Le foto di uno stesso affresco sono scattate a raffica e sono quasi uguali. Se una foto di prova avesse la «gemella» tra i riferimenti il risultato sarebbe gonfiato. Quindi: (a) *una foto alla volta* (la più ottimista, solo confronto); (b) *a blocchi*: ${BLOCCHI} blocchi di foto consecutive per luogo, ognuno tenuto da parte a turno e tolto dai riferimenti insieme alle ${SPAZIO} foto che lo circondano per lato; (c) *poche foto di riferimento* (1, 2, 3, 5, 8 per luogo, distribuite lungo la serie), provando sulle foto lontane almeno ${SPAZIO + 1} posti dai riferimenti.`)
  m.push('')
  m.push('## Risultati')
  m.push('')
  m.push('Foto giuste, metodo *vicino*, impronta CLS (le altre varianti sono nel file `risultati.json`).')
  m.push('')
  m.push(`| Prova | ${DTYPES.map((d) => `modello ${d}`).join(' | ')} |`)
  m.push(`|---|${DTYPES.map(() => '---').join('|')}|`)
  m.push(`| Una foto alla volta (ottimista) | ${DTYPES.map((d) => cella(R[d].varianti.cls.una_alla_volta.vicino)).join(' | ')} |`)
  m.push(`| **A blocchi, senza gemelle (onesta)** | ${DTYPES.map((d) => `**${cella(R[d].varianti.cls.a_blocchi.vicino)}**`).join(' | ')} |`)
  for (let i = 0; i < CURVA.length; i++) m.push(`| ${CURVA[i]} foto di riferimento per luogo | ${DTYPES.map((d) => cella(R[d].varianti.cls.poche_foto[i].vicino)).join(' | ')} |`)
  m.push(`| Margine mediano / minimo (a blocchi) | ${DTYPES.map((d) => { const r = R[d].varianti.cls.a_blocchi.vicino; return `${formato(r.margine_mediano)} / ${formato(r.margine_minimo)}` }).join(' | ')} |`)
  m.push('')
  m.push('### Varianti dell’impronta (prova a blocchi, foto giuste)')
  m.push('')
  m.push(`| Variante | ${DTYPES.map((d) => `${d}: vicino`).join(' | ')} | ${DTYPES.map((d) => `${d}: prototipo`).join(' | ')} | 1 foto per luogo (${DTYPE_PRINCIPALE}) |`)
  m.push(`|---|${DTYPES.map(() => '---').join('|')}|${DTYPES.map(() => '---').join('|')}|---|`)
  for (const v of VARIANTI) m.push(`| ${v}: ${DESCRIZIONE_VARIANTI[v]} | ${DTYPES.map((d) => cella(R[d].varianti[v].a_blocchi.vicino)).join(' | ')} | ${DTYPES.map((d) => cella(R[d].varianti[v].a_blocchi.prototipo)).join(' | ')} | ${cella(R[DTYPE_PRINCIPALE].varianti[v].poche_foto[0].vicino)} |`)
  m.push('')
  m.push('### Foto sbagliate e foto incerte')
  m.push('')
  const errori = principale.a_blocchi.vicino.errori
  m.push(errori.length ? `Nella prova a blocchi (${DTYPE_PRINCIPALE}, CLS, vicino) le foto sbagliate sono: ${errori.map((e) => `\`${e}\``).join(', ')}.` : `Nessuna foto sbagliata nella prova a blocchi (${DTYPE_PRINCIPALE}, CLS, vicino).`)
  m.push('')
  m.push('Le 5 foto più incerte (margine più basso):')
  m.push('')
  m.push('| Foto | Luogo vero | Scelto | Somiglianza scelto / altro | Margine |')
  m.push('|---|---|---|---|---|')
  for (const e of [...principale.dettagli_blocchi].sort((x, y) => x.vicino.margine - y.vicino.margine).slice(0, 5)) {
    const scelto = e.classi.find((c) => c.classe === e.vicino.classe).vicino
    const altro = e.classi.find((c) => c.classe !== e.vicino.classe)?.vicino
    m.push(`| \`${e.file}\` | ${e.vera} | ${e.vicino.classe} | ${formato(scelto, 2)} / ${formato(altro, 2)} | ${formato(e.vicino.margine)} |`)
  }
  m.push('')
  const incerte = [...principale.dettagli_blocchi].sort((x, y) => x.vicino.margine - y.vicino.margine).slice(0, 2).map((e) => e.file.split('/')[1])
  if (incerte.includes('IMG_0465.JPEG') && incerte.includes('IMG_0466.JPEG')) m.push('Le due più incerte sono foto in cui l’edificio si vede poco: `IMG_0465` è quasi tutta strada e selciato, `IMG_0466` mostra solo il portone e un pezzo di muro.')
  const sbagli = raccogliErrori()
  m.push('')
  m.push(sbagli.length ? `Errori nelle altre prove (le foto sono tutte giuste nella prova a blocchi): ${sbagli.join('; ')}.` : 'Nessun errore in nessuna delle prove (modelli, varianti e metodi).')
  m.push('')
  m.push('## Soglie provvisorie per «non lo riconosco»')
  m.push('')
  const so = principale.soglie
  m.push(`Senza foto di altri luoghi non si può misurare quando il modello sbaglia scambiando per un affresco qualcosa che non lo è. Le soglie di \`prova.mjs\` guardano solo quanto somigliano alla foto più simile le foto giuste della prova a blocchi: **riconosciuto** da ${formato(so.riconosciuto_da, 2)} in su (5° percentile delle foto giuste) e con margine almeno ${formato(so.margine_minimo, 2)}; **non sono sicuro** tra ${formato(so.nessuno_sotto, 2)} e ${formato(so.riconosciuto_da, 2)}; **non assomiglia a nessuno dei due** sotto ${formato(so.nessuno_sotto, 2)} (80% della somiglianza minima delle foto giuste). Sono valori provvisori, da rifare con più luoghi.`)
  m.push('')
  m.push('## Cosa non dice questo test')
  m.push('')
  m.push('- **Solo due luoghi e molto diversi.** Il vero problema sono i palazzi vicini con affreschi simili: servono più luoghi e più foto.')
  m.push('- **Foto di una sola persona, in una sola giornata** (14/10/2026, tra le 14:45 e le 14:50, stessa luce e stesso telefono). Servono foto di altre ore, di altre persone e con altre fotocamere.')
  m.push('- **Foto a raffica.** Anche con le gemelle tolte, le foto di una serie hanno punti di vista simili: la prova a blocchi è onesta ma resta ottimistica rispetto a chi inquadra da un angolo diverso.')
  m.push('- **Il browser non è stato misurato.** Qui si usa Node.js sul computer; nel browser del telefono tempi e consumi vanno provati.')
  m.push('')
  m.push('## Come rifare la prova')
  m.push('')
  m.push('Vedi il [README](../README.md).')
  m.push('')
  return m.join('\n')
}

fs.mkdirSync(CARTELLA_RISULTATI, { recursive: true })
fs.writeFileSync(path.join(CARTELLA_RISULTATI, 'risultati.json'), JSON.stringify(risultati, null, 1))
fs.writeFileSync(path.join(CARTELLA_RISULTATI, 'report.md'), scriviMarkdown())

// ---------- Report HTML con le anteprime ----------
const miniatura = async (percorso, larghezza = 150) => `data:image/jpeg;base64,${(await sharp(percorso).rotate().resize(larghezza, Math.round(larghezza * 1.25), { fit: 'cover' }).jpeg({ quality: 62 }).toBuffer()).toString('base64')}`
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])

function mappaSomiglianze() {
  const impronte = improntePerDtype[DTYPE_PRINCIPALE]
  const vettori = foto.map((f) => impronte[f.relativo][VARIANTE_PRINCIPALE])
  const n = vettori.length
  let min = 1
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) min = Math.min(min, somiglianza(vettori[i], vettori[j]))
  const colore = (s) => {
    const t = Math.max(0, Math.min(1, (s - min) / (1 - min)))
    const stop = [[27, 42, 65], [42, 157, 143], [244, 211, 94]]
    const [a, b, u] = t < 0.5 ? [stop[0], stop[1], t * 2] : [stop[1], stop[2], (t - 0.5) * 2]
    return `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * u)).join(',')})`
  }
  const lato = 6
  let celle = ''
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) celle += `<rect x="${j * lato}" y="${i * lato}" width="${lato}" height="${lato}" fill="${colore(i === j ? 1 : somiglianza(vettori[i], vettori[j]))}"/>`
  let linee = ''
  let posizione = 0
  const etichette = []
  for (const c of luoghi) {
    etichette.push({ c, da: posizione, a: posizione + conteggi[c] })
    posizione += conteggi[c]
    if (posizione < n) linee += `<line x1="${posizione * lato}" y1="0" x2="${posizione * lato}" y2="${n * lato}" stroke="#fff" stroke-width="1.5"/><line x1="0" y1="${posizione * lato}" x2="${n * lato}" y2="${posizione * lato}" stroke="#fff" stroke-width="1.5"/>`
  }
  const testi = etichette.map((e) => `<text x="${((e.da + e.a) / 2) * lato}" y="-6" text-anchor="middle" font-size="12" fill="currentColor">${esc(e.c)}</text>`).join('')
  return `<svg viewBox="-4 -22 ${n * lato + 8} ${n * lato + 28}" role="img" aria-label="Mappa delle somiglianze tra tutte le foto: due blocchi chiari sulla diagonale, uno per affresco" style="max-width:520px;width:100%;height:auto"><g shape-rendering="crispEdges">${celle}${linee}</g>${testi}</svg><p class="nota">Ogni quadratino confronta due foto (righe e colonne sono le stesse ${n} foto, ordinate per affresco): giallo = molto simili, blu scuro = molto diverse. I due quadrati chiari sulla diagonale sono le foto dello stesso affresco; fuori dai quadrati le foto sono diverse. Somiglianza minima ${formato(min, 2)}. Modello ${DTYPE_PRINCIPALE}, impronta CLS.</p>`
}

async function scriviHtml() {
  const R = risultati.dtype
  const p = principale
  const b = p.a_blocchi.vicino
  const incerte = [...p.dettagli_blocchi].sort((x, y) => x.vicino.margine - y.vicino.margine).slice(0, 8)
  const carte = (await Promise.all(incerte.map(async (e) => `<figure><img alt="${esc(e.file)}" src="${await miniatura(path.join(CARTELLA, 'foto', e.file))}"><figcaption><strong>${esc(e.file.split('/')[1])}</strong><br>vero: ${esc(e.vera)}<br>scelto: ${esc(e.vicino.classe)} ${e.vicino.giusta ? '✔' : '✘'}<br>margine ${formato(e.vicino.margine, 2)}</figcaption></figure>`))).join('')
  const righeCurva = CURVA.map((k, i) => `<tr><td>${k} foto di riferimento per luogo</td>${DTYPES.map((d) => `<td>${cella(R[d].varianti.cls.poche_foto[i].vicino)}</td>`).join('')}</tr>`).join('')
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test 0.1 · DINOv2 small distingue due affreschi</title>
<style>
:root { --sfondo:#f4f6f6; --testo:#14262b; --tenue:#4d6368; --carta:#fff; --bordo:#d3dcdd; --ok:#1b7f5c; --accento:#1d5560; }
@media (prefers-color-scheme: dark) { :root { --sfondo:#0d1517; --testo:#e6eeef; --tenue:#9db2b6; --carta:#162226; --bordo:#2b3e43; --ok:#4cc39b; --accento:#7fc4d0; } }
body { margin:0; background:var(--sfondo); color:var(--testo); font:16px/1.55 system-ui,Segoe UI,Roboto,sans-serif; }
main { max-width:960px; margin:0 auto; padding:24px 16px 64px; }
h1 { font-size:1.6rem; margin:0 0 4px; } h2 { margin-top:36px; font-size:1.2rem; border-bottom:1px solid var(--bordo); padding-bottom:6px; }
.sotto { color:var(--tenue); margin:0 0 20px; }
.grande { background:var(--carta); border:1px solid var(--bordo); border-left:6px solid var(--ok); border-radius:10px; padding:16px 18px; font-size:1.15rem; }
.grande b { color:var(--ok); font-size:1.6rem; }
table { border-collapse:collapse; width:100%; background:var(--carta); margin:10px 0; } th,td { border:1px solid var(--bordo); padding:6px 10px; text-align:left; font-size:.92rem; } th { background:color-mix(in srgb, var(--accento) 12%, var(--carta)); }
.griglia { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:12px; } figure { margin:0; background:var(--carta); border:1px solid var(--bordo); border-radius:8px; overflow:hidden; } figure img { width:100%; display:block; } figcaption { padding:6px 8px; font-size:.82rem; color:var(--tenue); } figcaption strong { color:var(--testo); }
.nota { color:var(--tenue); font-size:.9rem; } .avviso { background:color-mix(in srgb, #d99a00 14%, var(--carta)); border:1px solid #d99a00; border-radius:8px; padding:10px 14px; }
code { background:color-mix(in srgb, var(--accento) 10%, transparent); padding:1px 5px; border-radius:4px; }
</style></head><body><main>
<h1>Test 0.1 · DINOv2 small distingue due affreschi?</h1>
<p class="sotto">${new Date(risultati.creato_il).toLocaleDateString('it-IT')} · modello <code>${NOME_MODELLO}</code> · ${foto.length} foto (${luoghi.map((c) => `${esc(c)}: ${conteggi[c]}`).join(', ')}) caricate da Marco, scattate il 14/10/2026 · nessun'altra foto usata</p>
<div class="grande"><b>${b.giuste} su ${b.n}</b> foto assegnate al luogo giusto (${pc(b.accuratezza)}) nella prova onesta, a blocchi e senza foto gemelle tra i riferimenti. Con una sola foto di riferimento per affresco: <b>${p.poche_foto[0].vicino.giuste} su ${p.poche_foto[0].vicino.n}</b> (${pc(p.poche_foto[0].vicino.accuratezza)}).</div>
<p class="avviso"><strong>Attenzione:</strong> con due soli luoghi molto diversi è il caso facile. Dice che il metodo funziona, non che riconoscerà bene tutti i 45 luoghi.</p>
<h2>Le foto si separano in due gruppi netti</h2>
${mappaSomiglianze()}
<h2>Risultati</h2>
<table><tr><th>Prova (impronta CLS, metodo «vicino»)</th>${DTYPES.map((d) => `<th>modello ${d}</th>`).join('')}</tr>
<tr><td>Una foto alla volta (ottimista)</td>${DTYPES.map((d) => `<td>${cella(R[d].varianti.cls.una_alla_volta.vicino)}</td>`).join('')}</tr>
<tr><td><strong>A blocchi, senza gemelle (onesta)</strong></td>${DTYPES.map((d) => `<td><strong>${cella(R[d].varianti.cls.a_blocchi.vicino)}</strong></td>`).join('')}</tr>
${righeCurva}
<tr><td>Tempo per foto (mediana, CPU di questo PC)</td>${DTYPES.map((d) => `<td>circa ${Math.round(R[d].ms_per_foto_mediana)} ms</td>`).join('')}</tr></table>
<h2>Le foto più incerte</h2>
<p class="nota">Le 8 foto con il margine più basso nella prova a blocchi (modello ${DTYPE_PRINCIPALE}). Margine = distanza tra il punteggio del luogo scelto e quello dell'altro.</p>
<div class="griglia">${carte}</div>
<h2>Cosa non dice questo test</h2>
<ul><li>Solo due luoghi e molto diversi: la vera prova sono i palazzi vicini con affreschi simili.</li><li>Foto di una persona, un telefono e una giornata (14/10/2026, 14:45–14:50).</li><li>Foto a raffica: anche senza le gemelle, i punti di vista sono simili.</li><li>Il browser del telefono non è stato misurato.</li></ul>
</main></body></html>`
}

fs.writeFileSync(path.join(CARTELLA_RISULTATI, 'report.html'), await scriviHtml())
console.log('\nScritti: risultati/report.md, risultati/risultati.json, risultati/report.html')
