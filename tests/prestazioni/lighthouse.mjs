// Misure con Lighthouse (RNF-U04 accessibilità; prestazioni con il profilo mobile predefinito,
// "4G lento" e processore rallentato 4 volte). Ogni pagina si apre con un browser nuovo, come alla
// prima visita, con la schermata di benvenuto già vista.
//
//   node lighthouse.mjs http://localhost:3000 [cartella-per-i-risultati]
//   TESSERE_FINTE=1 …           se OpenStreetMap non è raggiungibile (tessere locali di peso realistico)
//   PAGINE="/#/ /#/scopri" …    solo alcune pagine
import { readFileSync, writeFileSync } from 'node:fs'
import { startFlow } from 'lighthouse'
import { chromium } from 'playwright'
import puppeteer from 'puppeteer-core'

const base = process.argv[2] ?? 'http://localhost:3000'
const uscita = process.argv[3]
const TESSERA = readFileSync(new URL('./tessera.png', import.meta.url))
const PAGINE = process.env.PAGINE
  ? process.env.PAGINE.split(' ')
  : ['/#/', '/#/poi/duomo', '/#/poi/palazzo-niccolini', '/#/itinerari', '/#/itinerari/trento-dipinta', '/#/scopri', '/#/gioco', '/#/profilo', '/#/privacy', '/#/accesso?scheda=registrati', '/#/inquadra']

const risultati = []
for (const pagina of PAGINE) {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox', '--headless=new'],
  })
  const page = await browser.newPage()
  if (process.env.TESSERE_FINTE) {
    await page.setRequestInterception(true)
    page.on('request', (r) => (/tile\.openstreetmap\.org/.test(r.url()) ? r.respond({ status: 200, contentType: 'image/png', body: TESSERA }) : r.continue()))
  }
  // Benvenuto già visto, impostato da un file statico dello stesso sito senza scaricare l'app
  await page.goto(`${base}/manifest.webmanifest`)
  await page.evaluate(() => localStorage.setItem('tridentum:benvenuto-visto', 'true'))
  await page.goto('about:blank')
  const flow = await startFlow(page, {
    config: { extends: 'lighthouse:default', settings: { disableStorageReset: true, onlyCategories: ['accessibility', 'performance', 'best-practices'] } },
  })
  await flow.navigate(base + pagina)
  const { lhr } = (await flow.createFlowResult()).steps[0]
  const audit = (id) => lhr.audits[id].numericValue
  const voce = {
    pagina,
    accessibilita: Math.round(lhr.categories.accessibility.score * 100),
    prestazioni: Math.round(lhr.categories.performance.score * 100),
    buone_pratiche: Math.round(lhr.categories['best-practices'].score * 100),
    fcp_ms: Math.round(audit('first-contentful-paint')),
    lcp_ms: Math.round(audit('largest-contentful-paint')),
    tbt_ms: Math.round(audit('total-blocking-time')),
    cls: Number(audit('cumulative-layout-shift').toFixed(3)),
    problemi_accessibilita: lhr.categories.accessibility.auditRefs
      .map((r) => lhr.audits[r.id])
      .filter((a) => a.score !== null && a.score < 1)
      .map((a) => a.id),
  }
  risultati.push(voce)
  console.log(JSON.stringify(voce))
  if (uscita && pagina === PAGINE[0]) writeFileSync(`${uscita}/lighthouse-${PAGINE[0].replace(/\W+/g, '') || 'mappa'}.html`, await flow.generateReport())
  await browser.close()
}
if (uscita) writeFileSync(`${uscita}/lighthouse.json`, `${JSON.stringify(risultati, null, 2)}\n`)
console.log(`\nAccessibilità minima: ${Math.min(...risultati.map((r) => r.accessibilita))} (requisito RNF-U04: almeno 90)`)
