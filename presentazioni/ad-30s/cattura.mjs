// Cattura le schermate del sito online (telefono 390 x 844, doppia densità) per lo spot da 30 secondi.
// Solo letture: nessun account e nessuna scrittura sul sito.
// Uso: node cattura.mjs [indirizzo del sito]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = path.dirname(fileURLToPath(import.meta.url))
const SITO = (process.argv[2] ?? 'https://discover-tridentum.duckdns.org').replace(/\/$/, '')
const USCITA = path.join(QUI, 'catture')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORTA = 9555
const profilo = fs.mkdtempSync(path.join(os.tmpdir(), 'spot-chrome-'))
fs.mkdirSync(USCITA, { recursive: true })
const attesa = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(CHROME, [`--remote-debugging-port=${PORTA}`, `--user-data-dir=${profilo}`, '--headless=new', '--no-first-run', '--disable-extensions', 'about:blank'], { stdio: 'ignore' })
setTimeout(() => { try { chrome.kill() } catch {} process.exit(3) }, 240000).unref()

async function connetti() {
  for (let i = 0; i < 60; i++) {
    try { const v = await (await fetch(`http://127.0.0.1:${PORTA}/json/version`)).json(); return new WebSocket(v.webSocketDebuggerUrl) } catch { await attesa(250) }
  }
  throw new Error('Chrome non risponde')
}
const ws = await connetti()
await new Promise((r) => (ws.onopen = r))
let id = 0
const attese = new Map()
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && attese.has(d.id)) { const { ok, no } = attese.get(d.id); attese.delete(d.id); d.error ? no(new Error(d.error.message)) : ok(d.result) }
}
const invia = (method, params = {}, sessionId) => new Promise((ok, no) => { const i = ++id; attese.set(i, { ok, no }); ws.send(JSON.stringify({ id: i, method, params, sessionId })) })

async function scheda({ scuro, visto = true }) {
  const { browserContextId } = await invia('Target.createBrowserContext', { disposeOnDetach: true })
  const { targetId } = await invia('Target.createTarget', { url: 'about:blank', browserContextId })
  const { sessionId } = await invia('Target.attachToTarget', { targetId, flatten: true })
  const s = (m, p) => invia(m, p, sessionId)
  await s('Page.enable'); await s('Runtime.enable')
  await s('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scuro ? 'dark' : 'light' }] })
  await s('Page.addScriptToEvaluateOnNewDocument', { source: `try { ${visto ? "localStorage.setItem('tridentum:benvenuto-visto','true');" : ''} localStorage.setItem('tridentum:lingua','"it"') } catch {}` })
  const valuta = async (e) => (await s('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value
  return { s, valuta, chiudi: async () => { await invia('Target.closeTarget', { targetId }).catch(() => {}); await invia('Target.disposeBrowserContext', { browserContextId }).catch(() => {}) } }
}

async function scatta(nome, rotta, { scuro = false, visto = true, pronto, extra = 2500, dopo } = {}) {
  const t = await scheda({ scuro, visto })
  await t.s('Page.navigate', { url: `${SITO}/${rotta}` })
  const inizio = Date.now()
  while (Date.now() - inizio < 20000) { if (pronto && (await t.valuta(pronto).catch(() => false))) break; await attesa(250) }
  await attesa(extra)
  if (dopo) { await t.valuta(dopo).catch(() => {}); await attesa(1800) }
  const r = await t.s('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.join(USCITA, `${nome}.png`), Buffer.from(r.data, 'base64'))
  console.log('catturata', nome)
  await t.chiudi()
}

const solo = process.argv[3] ? process.argv[3].split(',') : null
const voglio = (n) => !solo || solo.includes(n)
const chiudiAvviso = `document.querySelector('.banner button')?.click()`
const tessere = `document.querySelectorAll('.leaflet-marker-icon').length > 0`
try {
  if (voglio('mappa-chiaro')) await scatta('mappa-chiaro', '#/', { pronto: tessere, extra: 4500, dopo: chiudiAvviso })
  if (voglio('mappa-scuro')) await scatta('mappa-scuro', '#/', { scuro: true, pronto: tessere, extra: 4500, dopo: chiudiAvviso })
  await scatta('scheda-geremia', '#/poi/palazzo-geremia', { pronto: `document.querySelector('.scheda h1') !== null`, extra: 3500 })
  await scatta('itinerario', '#/itinerari/trento-dipinta', { pronto: `document.querySelector('h1') !== null`, extra: 5000 })
  await scatta('itinerari', '#/itinerari', { pronto: `document.querySelectorAll('a').length > 8`, extra: 2500 })
  await scatta('gioco', '#/gioco', { pronto: `document.querySelector('h1') !== null`, extra: 3000 })
  await scatta('scopri', '#/scopri', { pronto: `document.querySelector('h1') !== null`, extra: 3500 })
  await scatta('benvenuto', '#/', { visto: false, pronto: `document.querySelectorAll('.vetrina__foto').length > 0`, extra: 2500 })
} finally {
  await invia('Browser.close').catch(() => {})
  await attesa(500)
  chrome.kill()
}
