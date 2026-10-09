// Compressione delle foto prima dell'invio (RNF-P03): lato più lungo al massimo 2000 px, JPEG.
// Ridisegnare l'immagine su un canvas elimina anche i metadati EXIF, come la posizione GPS (RNF-S05);
// il server li toglie comunque una seconda volta.

const LATO_MASSIMO = 2000
export const FORMATI_AMMESSI = ['image/jpeg', 'image/png', 'image/webp']
export const DIMENSIONE_MASSIMA = 10 * 1024 * 1024

export async function comprimiFoto(file) {
  const immagine = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scala = Math.min(1, LATO_MASSIMO / Math.max(immagine.width, immagine.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(immagine.width * scala)
  canvas.height = Math.round(immagine.height * scala)
  canvas.getContext('2d').drawImage(immagine, 0, 0, canvas.width, canvas.height)
  immagine.close()
  return new Promise((risolvi, rifiuta) =>
    canvas.toBlob((blob) => (blob ? risolvi(blob) : rifiuta(new Error('Compressione non riuscita'))), 'image/jpeg', 0.85),
  )
}

/** Data URL di un blob, per conservare la foto scelta se l'utente deve prima accedere (UC-04 1a, E4) */
export const inDataUrl = (blob) =>
  new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader()
    lettore.onload = () => risolvi(lettore.result)
    lettore.onerror = rifiuta
    lettore.readAsDataURL(blob)
  })

export const daDataUrl = async (dataUrl) => (await fetch(dataUrl)).blob()
