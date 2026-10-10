import { useId } from 'react'

/**
 * Campo di un modulo con etichetta, testo di aiuto ed eventuale errore,
 * collegati al controllo per gli screen reader (RNF-U04).
 * `children` riceve le proprietà da passare al controllo: id, aria-describedby, aria-invalid.
 */
export default function Campo({ etichetta, aiuto, errore, children }) {
  const id = useId()
  const descrizione = [aiuto && `${id}-aiuto`, errore && `${id}-errore`].filter(Boolean).join(' ') || undefined
  return (
    <div className={`campo ${errore ? 'campo--errore' : ''}`}>
      <label htmlFor={id} className="campo__etichetta">
        {etichetta}
      </label>
      {children({ id, 'aria-describedby': descrizione, 'aria-invalid': errore ? true : undefined })}
      {aiuto && (
        <p id={`${id}-aiuto`} className="campo__aiuto">
          {aiuto}
        </p>
      )}
      {errore && (
        <p id={`${id}-errore`} className="campo__errore" role="alert">
          {errore}
        </p>
      )}
    </div>
  )
}
