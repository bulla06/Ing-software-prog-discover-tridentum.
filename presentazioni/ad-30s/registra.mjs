// Registra lo spot da 30 secondi (ad.html) in un file WebM con Chrome, senza programmi esterni.
//
// Uso:  node registra.mjs                       registra ad-30s.webm
//       node registra.mjs --frame 2,10,20 [--cartella dove]   salva solo alcuni fotogrammi in PNG, per controllare l'aspetto
//
// Le immagini non stanno in questa cartella: il piccolo server le prende dal repository.
// La foto di Palazzo Geremia viene da ai/test-0.1/foto (le foto di Marco, che non vanno su GitHub).

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = path.dirname(fileURLToPath(import.meta.url))
const RADICE = path.resolve(QUI, '../..')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORTA_SERVER = 8765
const PORTA_CHROME = 9666
const args = process.argv.slice(2)
const opzione = (nome) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : null }
const fotogrammi = opzione('--frame')?.split(',').map(Number)
const cartellaFrame = path.resolve(opzione('--cartella') ?? path.join(os.tmpdir(), 'spot-frame'))

const FILE = {
  '/ad.html': path.join(QUI, 'ad.html'),
  '/font.woff2': path.join(RADICE, 'node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2'),
  '/icon.svg': path.join(RADICE, 'versione-corrente/frontend/public/icon.svg'),
  '/storica-duomo.webp': path.join(RADICE, 'versione-corrente/frontend/public/benvenuto/01.webp'),
  '/geremia-1.jpg': path.join(RADICE, 'ai/test-0.1/foto/palazzo-geremia/IMG_0421.JPEG'),
}
const TIPI = { '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' }

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  let file = FILE[url]
  if (!file && url.startsWith('/catture/') && !url.includes('..')) file = path.join(QUI, url)
  if (!file || !fs.existsSync(file)) { res.writeHead(404); return res.end('manca ' + url) }
  res.writeHead(200, { 'Content-Type': TIPI[path.extname(file).toLowerCase()] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((ok) => server.listen(PORTA_SERVER, '127.0.0.1', ok))

const profilo = fs.mkdtempSync(path.join(os.tmpdir(), 'spot-reg-'))
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORTA_CHROME}`, `--user-data-dir=${profilo}`, '--headless=new', '--no-first-run', '--disable-extensions',
  '--autoplay-policy=no-user-gesture-required', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
  '--window-size=1280,720', 'about:blank',
], { stdio: 'ignore' })
setTimeout(() => { try { chrome.kill() } catch {} process.exit(3) }, 200000).unref()
const attesa = (ms) => new Promise((r) => setTimeout(r, ms))

let ws
for (let i = 0; i < 60; i++) {
  try { const v = await (await fetch(`http://127.0.0.1:${PORTA_CHROME}/json/version`)).json(); ws = new WebSocket(v.webSocketDebuggerUrl); break } catch { await attesa(250) }
}
await new Promise((r) => (ws.onopen = r))
let id = 0
const attese = new Map()
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && attese.has(d.id)) { const { ok, no } = attese.get(d.id); attese.delete(d.id); d.error ? no(new Error(d.error.message)) : ok(d.result) } }
const invia = (method, params = {}, sessionId) => new Promise((ok, no) => { const i = ++id; attese.set(i, { ok, no }); ws.send(JSON.stringify({ id: i, method, params, sessionId })) })

async function pagina(url) {
  const { targetId } = await invia('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await invia('Target.attachToTarget', { targetId, flatten: true })
  const s = (m, p) => invia(m, p, sessionId)
  await s('Page.enable'); await s('Runtime.enable')
  await s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false })
  await s('Page.navigate', { url })
  const valuta = async (e) => { const r = await s('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'errore'); return r.result.value }
  return { s, valuta }
}

try {
  if (fotogrammi) {
    fs.mkdirSync(cartellaFrame, { recursive: true })
    for (const t of fotogrammi) {
      const p = await pagina(`http://127.0.0.1:${PORTA_SERVER}/ad.html?t=${t}`)
      for (let i = 0; i < 80 && !(await p.valuta('window.__pronto === true').catch(() => false)); i++) await attesa(250)
      await attesa(300)
      const r = await p.s('Page.captureScreenshot', { format: 'png' })
      const file = path.join(cartellaFrame, `t-${String(t).replace('.', '_')}.png`)
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'))
      console.log('fotogramma', t, '→', file)
    }
  } else {
    const p = await pagina(`http://127.0.0.1:${PORTA_SERVER}/ad.html?registra=1`)
    console.log('Registrazione in corso (30 secondi)…')
    let fine = null
    for (let i = 0; i < 120 && !fine; i++) { await attesa(500); fine = await p.valuta('window.__fine ?? null').catch(() => null) }
    if (!fine) throw new Error('La registrazione non è finita')
    const totale = await p.valuta('window.__dati.length')
    let base64 = ''
    for (let da = 0; da < totale; da += 600000) base64 += await p.valuta(`window.__dati.substring(${da}, ${da + 600000})`)
    const destinazione = path.join(QUI, 'ad-30s.webm')
    fs.writeFileSync(destinazione, Buffer.from(base64, 'base64'))
    console.log(`Salvato ${destinazione} (${(fs.statSync(destinazione).size / 1e6).toFixed(1)} MB, ${fine.tipo})`)
    const totaleWav = await p.valuta('window.__wav.length')
    let wav = ''
    for (let da = 0; da < totaleWav; da += 600000) wav += await p.valuta(`window.__wav.substring(${da}, ${da + 600000})`)
    const fileWav = path.join(QUI, 'ad-30s-musica.wav')
    fs.writeFileSync(fileWav, Buffer.from(wav, 'base64'))
    console.log(`Salvata la musica ( ${fileWav}, ${(fs.statSync(fileWav).size / 1e6).toFixed(1)} MB)`)
    const info = await p.valuta('window.__audioInfo')
    console.log('Livelli: picco', info.picco_dB, 'dB; volume medio per secondo (dB):')
    console.log(info.rms_per_secondo_dB.map((v, i) => String(i).padStart(2) + 's ' + '#'.repeat(Math.max(0, Math.round((v + 45) * 1.2))) + ' ' + v).join('\n'))
  }
} finally {
  await invia('Browser.close').catch(() => {})
  await attesa(400)
  chrome.kill()
  server.close()
}
