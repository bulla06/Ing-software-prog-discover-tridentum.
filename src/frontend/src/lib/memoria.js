// Preferenze salvate nel browser (lingua, preferiti, record del gioco).
// Non sostituisce il database: sono comodità del singolo dispositivo e
// l'app funziona anche se il browser blocca lo storage.

const PREFISSO = 'tridentum:'

export function leggi(chiave, predefinito) {
  try {
    const valore = localStorage.getItem(PREFISSO + chiave)
    return valore == null ? predefinito : JSON.parse(valore)
  } catch {
    return predefinito
  }
}

export function scrivi(chiave, valore) {
  try {
    localStorage.setItem(PREFISSO + chiave, JSON.stringify(valore))
  } catch {
    // storage non disponibile (es. navigazione privata): si continua senza salvare
  }
}
