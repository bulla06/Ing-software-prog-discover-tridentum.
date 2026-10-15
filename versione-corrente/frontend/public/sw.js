// Service worker di Discover Tridentum (RNF-PO02): rende il sito installabile e lo fa aprire anche
// senza rete, per mostrare l'avviso "serve una connessione" invece della pagina d'errore del browser
// (UC-01 E2). Tiene in cache solo il "guscio" dell'app (HTML, JavaScript, CSS, font, icone):
// i dati dell'API e le foto vengono sempre dalla rete, perché devono essere aggiornati e alcuni sono personali.

const CACHE = 'tridentum-guscio-v4'
const GUSCIO = ['./', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png']

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await cache.addAll(GUSCIO)
      // Anche i file di JavaScript e CSS citati dalla pagina (hanno nomi diversi a ogni build)
      const html = await (await cache.match('./')).text()
      const risorse = [...html.matchAll(/(?:src|href)="(\.?\/assets\/[^"]+)"/g)].map((m) => m[1])
      await cache.addAll(risorse)
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      for (const nome of await caches.keys()) if (nome !== CACHE) await caches.delete(nome)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  const url = new URL(request.url)
  // Solo le richieste GET del sito; l'API, le foto e le mappe di OpenStreetMap passano sempre dalla rete
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return

  if (request.mode === 'navigate') {
    // Pagina: prima la rete (versione aggiornata), senza rete quella in cache
    evento.respondWith(
      fetch(request).then(
        (risposta) => {
          const copia = risposta.clone()
          caches.open(CACHE).then((cache) => cache.put('./', copia))
          return risposta
        },
        async () => (await caches.match('./')) ?? Response.error(),
      ),
    )
    return
  }

  // File con il nome che cambia a ogni versione (assets/…) e icone: prima la cache
  evento.respondWith(
    (async () => {
      const inCache = await caches.match(request)
      if (inCache) return inCache
      const risposta = await fetch(request)
      if (risposta.ok && (url.pathname.includes('/assets/') || /\.(png|svg|webmanifest)$/.test(url.pathname))) {
        const copia = risposta.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copia))
      }
      return risposta
    })(),
  )
})
