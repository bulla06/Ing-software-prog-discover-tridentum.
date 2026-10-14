// Lingua dei contenuti (RNF-U05): le schede, gli itinerari, le tradizioni e i piatti hanno i testi
// in italiano nelle loro colonne e le traduzioni nella colonna "traduzioni" (migrazione 005).
// Il frontend chiede la lingua con ?lingua=en (o de); un testo senza traduzione resta in italiano.

export const LINGUE = ['it', 'en', 'de']
/** Le lingue che stanno nella colonna "traduzioni" (tutte tranne l'italiano) */
export const LINGUE_TRADOTTE = LINGUE.filter((l) => l !== 'it')

export const linguaRichiesta = (req) => (LINGUE.includes(req.query?.lingua) ? req.query.lingua : 'it')

// La lingua viene sempre da LINGUE, quindi si può scrivere direttamente nell'SQL
const controlla = (lingua) => {
  if (!LINGUE.includes(lingua)) throw new Error(`Lingua non prevista: ${lingua}`)
  return lingua
}

/** Espressione SQL di un campo di testo nella lingua scelta: es. testo('en', 'p', 'nome') */
export function testo(lingua, alias, campo) {
  if (controlla(lingua) === 'it') return `${alias}.${campo}`
  return `coalesce(${alias}.traduzioni->'${lingua}'->>'${campo}', ${alias}.${campo})`
}

/** Come testo(), per i campi che sono elenchi di paragrafi (text[]) */
export function testi(lingua, alias, campo) {
  if (controlla(lingua) === 'it') return `${alias}.${campo}`
  const tradotto = `${alias}.traduzioni->'${lingua}'->'${campo}'`
  return `CASE WHEN jsonb_typeof(${tradotto}) = 'array' AND jsonb_array_length(${tradotto}) > 0
    THEN ARRAY(SELECT jsonb_array_elements_text(${tradotto})) ELSE ${alias}.${campo} END`
}
