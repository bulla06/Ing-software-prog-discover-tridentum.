// RNF-P01 e RNF-P02 misurati nel browser, con rete e processore rallentati (Chrome DevTools Protocol):
// - P01: dall'apertura del sito al momento in cui i segnaposti dei luoghi sono visibili sulla mappa
// - P02: dal tocco su un luogo dell'elenco alla scheda con il titolo visibile
// I tempi vengono dal cronometro del browser (performance.now), non da Playwright.
//
//   node tempi.mjs http://localhost:3000
//   TESSERE_FINTE=1 node tempi.mjs …   se OpenStreetMap non è raggiungibile: tessere locali di peso
//                                       realistico, con un ritardo che simula la stessa rete
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:3000'
const TESSERA = readFileSync(new URL('./tessera.png', import.meta.url))
// "4G lento" è il profilo mobile predefinito di Lighthouse; "4G" una rete 4G normale
const RETI = {
  '4G lento (Lighthouse)': { latency: 150, download: (1.6 * 1024 * 1024) / 8, upload: (750 * 1024) / 8, cpu: 4 },
  '4G': { latency: 60, download: (9 * 1024 * 1024) / 8, upload: (1.5 * 1024 * 1024) / 8, cpu: 4 },
}
const RIPETIZIONI = 5
const mediana = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]

const browser = await chromium.launch()
for (const [nome, rete] of Object.entries(RETI)) {
  const mappa = []
  const scheda = []
  for (let i = 0; i < RIPETIZIONI; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'it-IT', serviceWorkers: 'block' })
    await ctx.addInitScript(() => {
      localStorage.setItem('tridentum:benvenuto-visto', 'true')
      new MutationObserver(() => {
        if (!window.__segnaposti && document.querySelector('.leaflet-marker-icon')) window.__segnaposti = performance.now()
        if (window.__tocco && !window.__scheda && document.querySelector('.scheda h1')) window.__scheda = performance.now()
      }).observe(document, { childList: true, subtree: true })
      addEventListener('pointerdown', () => { window.__tocco = performance.now() }, true)
    })
    const page = await ctx.newPage()
    if (process.env.TESSERE_FINTE) {
      let inCoda = 0
      await page.route(/(tile\.openstreetmap\.org|api\.maptiler\.com)/, async (r) => {
        // Ogni tessera aspetta quelle prima di lei: la banda è una sola
        inCoda++
        await new Promise((ok) => setTimeout(ok, rete.latency + (inCoda * TESSERA.length * 1000) / rete.download))
        await r.fulfill({ contentType: 'image/png', body: TESSERA })
      })
    }
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: rete.latency, downloadThroughput: rete.download, uploadThroughput: rete.upload,
    })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: rete.cpu })

    await page.goto(`${base}/#/`)
    await page.locator('.leaflet-marker-icon').first().waitFor({ state: 'visible', timeout: 30000 })
    mappa.push(Math.round(await page.evaluate(() => window.__segnaposti)))

    // Il codice della scheda si scarica nei momenti liberi dopo la mappa, come per un visitatore
    await page.waitForTimeout(3000)
    await page.getByRole('button', { name: /Elenco/ }).click()
    const primo = page.locator('.riga-poi').first()
    await primo.waitFor()
    await primo.click()
    await page.locator('.scheda h1').waitFor({ state: 'visible', timeout: 30000 })
    scheda.push(Math.round(await page.evaluate(() => window.__scheda - window.__tocco)))
    await ctx.close()
  }
  console.log(JSON.stringify({ rete: nome, mappa_ms: mappa, mappa_mediana: mediana(mappa), scheda_ms: scheda, scheda_mediana: mediana(scheda) }))
}
await browser.close()
console.log('\nRequisiti: mappa con i luoghi sotto 3000 ms (RNF-P01), scheda sotto 1500 ms (RNF-P02)')
