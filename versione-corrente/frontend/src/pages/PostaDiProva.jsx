import { useEffect, useState } from 'react'
import { getPostaDiProva } from '../data/api.js'

// Solo in sviluppo: le e-mail che il server non spedisce (non c'è SMTP_URL).
// Serve per aprire i link di conferma e di reimpostazione della password. Pagina interna, solo in italiano.
export default function PostaDiProva() {
  const [posta, setPosta] = useState(null)

  useEffect(() => {
    const aggiorna = () => getPostaDiProva().then(setPosta, () => setPosta(false))
    aggiorna()
    const timer = setInterval(aggiorna, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="pagina">
      <header className="intestazione-pagina">
        <h1>Posta di prova</h1>
        <p>In sviluppo le e-mail non vengono spedite: compaiono qui. La pagina si aggiorna da sola.</p>
      </header>
      {posta === false && <p className="vuoto">Disponibile solo con il backend in modalità sviluppo.</p>}
      {posta?.length === 0 && <p className="vuoto">Nessuna e-mail ancora.</p>}
      <ul className="elenco-schede">
        {posta?.map((m, i) => (
          <li key={`${m.inviata_il}-${i}`} className="riquadro">
            <p className="nota">A: {m.a} · {new Date(m.inviata_il).toLocaleString('it')}</p>
            <h2>{m.oggetto}</h2>
            <p className="testo-email">
              {m.testo.split(/(https?:\/\/\S+)/).map((parte, j) =>
                /^https?:\/\//.test(parte) ? (
                  <a key={j} href={parte.replace(/^https?:\/\/[^/]+/, '')}>Apri il link</a>
                ) : (
                  <span key={j}>{parte}</span>
                ),
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
