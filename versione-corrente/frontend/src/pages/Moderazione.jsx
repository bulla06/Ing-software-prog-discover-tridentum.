import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Avviso from '../components/Avviso.jsx'
import FotoProtetta from '../components/FotoProtetta.jsx'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import { decidiContenuto, decidiSegnalazione, getCodaModerazione } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { messaggioErrore } from '../lib/errori.js'
import { distanzaMetri, formattaDistanza } from '../lib/geo.js'
import { puoModerare, useSessione } from '../lib/sessione.jsx'

// S-13 Moderazione (UC-05, RF-16…RF-18). Area interna del team: solo in italiano.
const LICENZE = { 'cc-by': 'CC BY 4.0', 'cc-by-nc': 'CC BY-NC 4.0', riservata: 'Tutti i diritti riservati' }
const MOTIVI = { errato: 'Informazione errata', inappropriato: 'Contenuto inappropriato', altro: 'Altro' }

export default function Moderazione() {
  const { t } = useT()
  const { utente, pronta } = useSessione()
  const [coda, setCoda] = useState(null)
  const [scheda, setScheda] = useState('contenuti')
  const [avviso, setAvviso] = useState(null)
  const chiudiAvviso = useCallback(() => setAvviso(null), [])

  const carica = useCallback(() => getCodaModerazione().then(setCoda, (err) => setAvviso(messaggioErrore(t, err))), [t])

  useEffect(() => {
    if (puoModerare(utente)) carica()
  }, [utente, carica])

  if (!pronta) return <div className="pagina" aria-busy="true" />
  // E2: chi non ha il ruolo non vede la coda (il server la nega comunque)
  if (!puoModerare(utente)) {
    return (
      <div className="pagina pagina--centrata">
        <p>Questa area è riservata ai moderatori.</p>
        <Link className="pulsante" to="/profilo">{t('profilo.titolo')}</Link>
      </div>
    )
  }

  const esegui = async (azione, messaggio) => {
    try {
      await azione()
      setAvviso(messaggio)
    } catch (err) {
      // E1: un altro moderatore ha già deciso
      setAvviso(messaggioErrore(t, err))
    }
    carica()
  }

  return (
    <div className="pagina">
      <header className="intestazione-pagina">
        <Link className="collegamento" to="/profilo">← {t('profilo.titolo')}</Link>
        <h1>Moderazione</h1>
        <p>Nessun contenuto è pubblico prima della tua approvazione. Controlla pertinenza, correttezza e rispetto delle regole.</p>
      </header>

      <div className="schede-tab" role="tablist">
        <button type="button" role="tab" aria-selected={scheda === 'contenuti'} className="schede-tab__voce" onClick={() => setScheda('contenuti')}>
          Ricordi in attesa {coda && <span className="contatore">{coda.contenuti.length}</span>}
        </button>
        <button type="button" role="tab" aria-selected={scheda === 'segnalazioni'} className="schede-tab__voce" onClick={() => setScheda('segnalazioni')}>
          Segnalazioni {coda && <span className="contatore">{coda.segnalazioni.length}</span>}
        </button>
      </div>

      {!coda ? (
        <div aria-busy="true" />
      ) : scheda === 'contenuti' ? (
        coda.contenuti.length === 0 ? (
          <p className="vuoto">La coda è vuota: nessun ricordo da verificare.</p>
        ) : (
          <ul className="elenco-schede">
            {coda.contenuti.map((c) => (
              <ContenutoInAttesa
                key={c.id}
                contenuto={c}
                onApprova={(livelloGioco) =>
                  esegui(
                    () => decidiContenuto(c.id, 'approva', { livelloGioco }),
                    livelloGioco ? 'Ricordo pubblicato e aggiunto a "Dov\'era?"' : 'Ricordo pubblicato',
                  )
                }
                onRifiuta={(motivazione) => esegui(() => decidiContenuto(c.id, 'rifiuta', { motivazione }), 'Ricordo rifiutato')}
              />
            ))}
          </ul>
        )
      ) : coda.segnalazioni.length === 0 ? (
        <p className="vuoto">Nessuna segnalazione aperta.</p>
      ) : (
        <ul className="elenco-schede">
          {coda.segnalazioni.map((s) => (
            <li key={s.id} className="riquadro moderazione">
              <p className="stato stato--in_attesa">{MOTIVI[s.motivo]}</p>
              <p>
                {s.contenuto ? 'Ricordo su ' : 'Scheda di '}
                <Link to={`/poi/${s.poi.id}`}>{s.poi.nome}</Link>
                {' · '}
                <span className="nota">{new Date(s.creata_il).toLocaleString('it')}</span>
              </p>
              {s.nota && <blockquote className="citazione">{s.nota}</blockquote>}
              {s.contenuto && (
                <div className="moderazione__contenuto">
                  {s.contenuto.foto && <FotoProtetta id={s.contenuto.foto} className="moderazione__foto" />}
                  {s.contenuto.testo && <p>{s.contenuto.testo}</p>}
                </div>
              )}
              <div className="riga-pulsanti">
                {s.contenuto ? (
                  <>
                    <button type="button" className="pulsante" onClick={() => esegui(() => decidiSegnalazione(s.id, 'mantieni'), 'Il ricordo resta pubblicato')}>
                      Lascia pubblicato
                    </button>
                    <button type="button" className="pulsante pulsante--pericolo" onClick={() => esegui(() => decidiSegnalazione(s.id, 'rimuovi'), 'Ricordo rimosso')}>
                      Rimuovi il ricordo
                    </button>
                  </>
                ) : (
                  <button type="button" className="pulsante" onClick={() => esegui(() => decidiSegnalazione(s.id, 'mantieni'), 'Segnalazione chiusa')}>
                    Chiudi (la correzione la fa un amministratore)
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Avviso testo={avviso} onChiudi={chiudiAvviso} />
    </div>
  )
}

function ContenutoInAttesa({ contenuto: c, onApprova, onRifiuta }) {
  const [rifiuto, setRifiuto] = useState(false)
  const [motivazione, setMotivazione] = useState('')
  // RF-23: è il moderatore a scegliere se la foto diventa un livello del gioco (solo con il consenso)
  const [livello, setLivello] = useState(false)
  const puoEssereLivello = Boolean(c.foto && c.consenso_gioco)
  const segnaposti = useMemo(
    () =>
      c.posizione_foto
        ? [
            { id: 'luogo', posizione: c.poi.posizione, tipo: 'tappa', etichetta: 'L' },
            { id: 'scatto', posizione: c.posizione_foto, tipo: 'ipotesi' },
          ]
        : [],
    [c],
  )

  return (
    <li className="riquadro moderazione">
      <p>
        <Link to={`/poi/${c.poi.id}`}><strong>{c.poi.nome}</strong></Link>
        <br />
        <span className="nota">
          {c.autore ?? 'Autore eliminato'} · {new Date(c.creato_il).toLocaleString('it')}
        </span>
      </p>
      <div className="moderazione__contenuto">
        {c.foto && <FotoProtetta id={c.foto} formato="standard" className="moderazione__foto" alt="Foto da verificare" />}
        {c.testo && <p>{c.testo}</p>}
      </div>
      <dl className="dati">
        <dt>Anno</dt>
        <dd>{c.anno || '—'}</dd>
        <dt>Licenza</dt>
        <dd>{LICENZE[c.licenza]}</dd>
        {c.foto && (
          <>
            <dt>Gioco</dt>
            <dd>{c.consenso_gioco ? 'L\'autore consente di usare la foto in "Dov\'era?"' : 'Non usare nel gioco'}</dd>
          </>
        )}
        {c.posizione_foto && (
          <>
            <dt>Scatto</dt>
            <dd>
              Punto indicato dall'autore (● sulla mappa), a {formattaDistanza(distanzaMetri(c.posizione_foto, c.poi.posizione), 'it')} dal
              luogo (L)
            </dd>
          </>
        )}
      </dl>
      {c.posizione_foto && (
        <div className="moderazione__mappa">
          <MappaLeaflet statica etichetta="Punto dello scatto e posizione del luogo" vista={{ centro: c.posizione_foto, zoom: 16 }} segnaposti={segnaposti} inquadra={[c.poi.posizione, c.posizione_foto]} />
        </div>
      )}
      {rifiuto ? (
        <form
          className="modulo"
          onSubmit={(e) => {
            e.preventDefault()
            onRifiuta(motivazione)
          }}
        >
          <label className="campo">
            <span className="campo__etichetta">Motivazione per l'autore</span>
            <textarea rows={3} value={motivazione} onChange={(e) => setMotivazione(e.target.value)} maxLength={500} required minLength={5} />
          </label>
          <div className="riga-pulsanti">
            <button type="button" className="pulsante" onClick={() => setRifiuto(false)}>Annulla</button>
            <button type="submit" className="pulsante pulsante--pericolo" disabled={motivazione.trim().length < 5}>Rifiuta</button>
          </div>
        </form>
      ) : (
        <>
          {puoEssereLivello && (
            <label className="scelta">
              <input type="checkbox" checked={livello} onChange={(e) => setLivello(e.target.checked)} />
              <span>Usa la foto come livello di "Dov'era?" (è una foto d'epoca riconoscibile e il punto è credibile)</span>
            </label>
          )}
          <div className="riga-pulsanti">
            <button type="button" className="pulsante pulsante--primario" onClick={() => onApprova(livello)}>Approva e pubblica</button>
            <button type="button" className="pulsante" onClick={() => setRifiuto(true)}>Rifiuta…</button>
          </div>
        </>
      )}
    </li>
  )
}
