// RNF-P04 Test di carico: 100 utenti contemporanei per ogni indirizzo, 20 secondi ciascuno.
//   node carico.mjs http://localhost:3000
// Il server va avviato con LIMITE_RICHIESTE alto (es. 1000000): tutte le richieste arrivano dallo
// stesso indirizzo IP e il limite contro gli abusi (600 al minuto) le bloccherebbe.
import autocannon from 'autocannon'

const base = process.argv[2] ?? 'http://localhost:3000'
const PERCORSI = [
  '/',
  '/api/poi',
  '/api/poi/duomo',
  '/api/itinerari',
  '/api/tradizioni',
  '/api/gusto',
  '/api/itinerari/su-misura?lat=46.067&lng=11.1214&minuti=120',
]

const righe = []
for (const p of PERCORSI) {
  const r = await autocannon({ url: base + p, connections: 100, duration: 20, headers: { 'accept-encoding': 'gzip' } })
  righe.push({
    percorso: p,
    richieste: r.requests.total,
    al_secondo: Math.round(r.requests.average),
    p50_ms: r.latency.p50,
    p90_ms: r.latency.p90,
    p99_ms: r.latency.p99,
    max_ms: r.latency.max,
    errori: r.errors + r.timeouts + r.non2xx,
  })
  console.log(JSON.stringify(righe.at(-1)))
}
const peggiore = Math.max(...righe.map((r) => r.p99_ms))
console.log(`\n99° percentile peggiore: ${peggiore} ms (requisito: sotto 1000 ms)`)
