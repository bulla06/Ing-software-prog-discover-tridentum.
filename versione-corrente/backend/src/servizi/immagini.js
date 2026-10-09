// Preparazione delle foto caricate (RNF-P03, RNF-S05): controllo del formato,
// riduzione a WebP sotto i 500 KB e rimozione dei metadati EXIF (posizione GPS, dispositivo…).

import sharp from 'sharp'
import { ErroreHttp } from '../gateway/errori.js'

const FORMATI_AMMESSI = ['jpeg', 'png', 'webp']
const PESO_MASSIMO = 500 * 1024
const LATO_STANDARD = 1600
const LATO_MINI = 480

export async function preparaFoto(buffer) {
  let info
  try {
    info = await sharp(buffer).metadata()
  } catch {
    throw new ErroreHttp(400, 'foto_non_valida', 'Il file non è un\'immagine valida')
  }
  if (!FORMATI_AMMESSI.includes(info.format)) {
    throw new ErroreHttp(400, 'foto_non_valida', 'Sono ammesse solo foto JPEG, PNG o WebP')
  }

  // rotate() applica l'orientamento indicato nell'EXIF prima di eliminarlo;
  // sharp non copia i metadati nell'immagine prodotta.
  const base = sharp(buffer, { failOn: 'error' }).rotate()

  let qualita = 82
  let standard
  do {
    standard = await base
      .clone()
      .resize({ width: LATO_STANDARD, height: LATO_STANDARD, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: qualita })
      .toBuffer({ resolveWithObject: true })
    qualita -= 12
  } while (standard.data.length > PESO_MASSIMO && qualita > 30)

  const mini = await base
    .clone()
    .resize({ width: LATO_MINI, height: LATO_MINI, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer()

  return { standard: standard.data, mini, larghezza: standard.info.width, altezza: standard.info.height }
}
