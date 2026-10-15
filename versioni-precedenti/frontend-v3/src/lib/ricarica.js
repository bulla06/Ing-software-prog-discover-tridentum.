/**
 * Ricarica la pagina, ma al massimo una volta ogni 10 secondi: se il problema resta (per esempio
 * il server è giù) non si entra in un ciclo di ricaricamenti.
 */
export function ricaricaUnaVolta() {
  try {
    const ultima = Number(sessionStorage.getItem('ultima-ricarica') ?? 0)
    if (Date.now() - ultima < 10_000) return false
    sessionStorage.setItem('ultima-ricarica', String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}
