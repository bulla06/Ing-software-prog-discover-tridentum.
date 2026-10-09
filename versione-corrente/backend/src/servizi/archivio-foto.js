// Archivio delle foto (Fase 3 §5.6) su cartella locale, con due aree:
// "privata" per i contenuti in attesa, "pubblica" per quelli approvati.
// Per ogni foto: <id>.webp (versione standard) e <id>-mini.webp (miniatura).
// Un archivio S3 dovrà offrire le stesse quattro funzioni.

import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const AREE = ['privata', 'pubblica']
const FORMATI = ['standard', 'mini']

export async function creaArchivioFoto(cartella) {
  for (const area of AREE) await mkdir(path.join(cartella, area), { recursive: true })

  const percorso = (area, id, formato) => {
    if (!AREE.includes(area) || !FORMATI.includes(formato) || !/^[0-9a-f-]{36}$/.test(id)) {
      throw new Error('Riferimento a una foto non valido')
    }
    return path.join(cartella, area, formato === 'mini' ? `${id}-mini.webp` : `${id}.webp`)
  }

  return {
    async salva(area, id, { standard, mini }) {
      await writeFile(percorso(area, id, 'standard'), standard)
      await writeFile(percorso(area, id, 'mini'), mini)
    },
    leggi: (area, id, formato) => readFile(percorso(area, id, formato)),
    async sposta(id, da, a) {
      for (const formato of FORMATI) await rename(percorso(da, id, formato), percorso(a, id, formato))
    },
    async elimina(area, id) {
      for (const formato of FORMATI) await rm(percorso(area, id, formato), { force: true })
    },
  }
}
