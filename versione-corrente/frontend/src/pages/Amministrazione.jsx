import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Avviso from '../components/Avviso.jsx'
import Icona from '../components/Icona.jsx'
import MappaLeaflet from '../components/MappaLeaflet.jsx'
import { URL_GEOJSON, URL_ITINERARI_JSON, admin, getPoiById } from '../data/api.js'
import { useT } from '../i18n/index.jsx'
import { CENTRO_TRENTO } from '../lib/geo.js'
import { urlFoto } from '../lib/http.js'
import { eAmministratore, useSessione } from '../lib/sessione.jsx'

// S-14 Amministrazione (UC-07, UC-09, RF-24, RF-25, RNF-PO04). Area interna del team: solo in italiano.
// I testi delle schede si scrivono in italiano e, facoltativamente, in inglese (RNF-U05).

const CATEGORIE = { storia: 'Storia', arte: 'Arte', tradizioni: 'Tradizioni', gastronomia: 'Gastronomia' }
const TEMI_BASE = ['tridentum', 'principi-vescovi', 'concilio', 'trento-austriaca', 'guerra', 'adige', 'trento-contemporanea', 'gusto', 'arte']
const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const SCHEDE = { luoghi: 'Luoghi', itinerari: 'Itinerari', tradizioni: 'Tradizioni', utenti: 'Utenti e ruoli', dati: 'Esporta e importa' }

export default function Amministrazione() {
  const { t } = useT()
  const { utente, pronta } = useSessione()
  const [params, setParams] = useSearchParams()
  const scheda = SCHEDE[params.get('scheda')] ? params.get('scheda') : 'luoghi'
  const [avviso, setAvviso] = useState(null)
  const chiudiAvviso = useCallback(() => setAvviso(null), [])

  if (!pronta) return <div className="pagina" aria-busy="true" />
  if (!eAmministratore(utente)) {
    return (
      <div className="pagina pagina--centrata">
        <p>Questa area è riservata agli amministratori.</p>
        <Link className="pulsante" to="/profilo">{t('profilo.titolo')}</Link>
      </div>
    )
  }

  return (
    <div className="pagina pagina--larga">
      <header className="intestazione-pagina">
        <Link className="collegamento" to="/profilo">← {t('profilo.titolo')}</Link>
        <h1>Amministrazione</h1>
      </header>
      <div className="schede-tab schede-tab--a-capo" role="tablist">
        {Object.entries(SCHEDE).map(([chiave, nome]) => (
          <button key={chiave} type="button" role="tab" aria-selected={scheda === chiave} className="schede-tab__voce" onClick={() => setParams({ scheda: chiave }, { replace: true })}>
            {nome}
          </button>
        ))}
      </div>
      {scheda === 'luoghi' && <GestioneLuoghi avvisa={setAvviso} />}
      {scheda === 'itinerari' && <GestioneItinerari avvisa={setAvviso} />}
      {scheda === 'tradizioni' && <GestioneTradizioni avvisa={setAvviso} />}
      {scheda === 'utenti' && <GestioneUtenti avvisa={setAvviso} />}
      {scheda === 'dati' && <GestioneDati avvisa={setAvviso} />}
      <Avviso testo={avviso} onChiudi={chiudiAvviso} durata={5000} />
    </div>
  )
}

// ---------- Componenti comuni ----------

function useEtichettaTema() {
  const { t } = useT()
  return (tema) => {
    const etichetta = t(`tema.${tema}`)
    return etichetta === `tema.${tema}` ? tema : etichetta
  }
}

/** Errore di un campo restituito dal server (le chiavi sono percorsi come "fonti.0.url") */
const erroreCampo = (errori, campo) =>
  Object.entries(errori).find(([k]) => k === campo || k.startsWith(`${campo}.`))?.[1]

function CampoTesto({ etichetta, valore, onCambia, errore, multilinea, aiuto, ...altro }) {
  const Controllo = multilinea ? 'textarea' : 'input'
  return (
    <label className={`campo ${errore ? 'campo--errore' : ''}`}>
      <span className="campo__etichetta">{etichetta}</span>
      <Controllo value={valore} onChange={(e) => onCambia(e.target.value)} aria-invalid={errore ? true : undefined} {...altro} />
      {aiuto && <span className="campo__aiuto">{aiuto}</span>}
      {errore && <span className="campo__errore">{errore}</span>}
    </label>
  )
}

/**
 * Testi in inglese (RNF-U05), facoltativi: un campo vuoto nel sito inglese mostra il testo italiano.
 * `campi`: [{ campo, etichetta, multilinea }]; `valori` e `onCambia` lavorano su { campo: testo }.
 */
function Traduzioni({ campi, valori, onCambia }) {
  const compilati = campi.filter(({ campo }) => valori?.[campo]).length
  return (
    <details className="traduzioni" open={compilati > 0}>
      <summary>
        Testi in inglese <span className="nota">({compilati} di {campi.length} compilati)</span>
      </summary>
      <p className="campo__aiuto">I campi vuoti nel sito in inglese mostrano il testo italiano.</p>
      {campi.map(({ campo, etichetta, multilinea }) => (
        <CampoTesto
          key={campo}
          etichetta={`${etichetta} (EN)`}
          valore={valori?.[campo] ?? ''}
          onCambia={(v) => onCambia({ ...valori, [campo]: v })}
          multilinea={multilinea}
          rows={multilinea ? 6 : undefined}
          lang="en"
        />
      ))}
    </details>
  )
}

/** Traduzioni dal formato del modulo (descrizione come testo unico) a quello dell'API */
const traduzioniPerApi = (en = {}, paragrafi = []) => ({
  en: Object.fromEntries(
    Object.entries(en).map(([campo, valore]) =>
      paragrafi.includes(campo) ? [campo, valore.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)] : [campo, valore.trim()],
    ),
  ),
})

/** Elenco ordinato di luoghi (tappe di un itinerario, luoghi di una tradizione) */
function SceltaLuoghi({ luoghi, scelti, onCambia, ordinabile, errore }) {
  const [aggiunta, setAggiunta] = useState('')
  const nome = (id) => luoghi.find((l) => l.id === id)?.nome ?? id
  const sposta = (i, delta) => {
    const nuovi = [...scelti]
    ;[nuovi[i], nuovi[i + delta]] = [nuovi[i + delta], nuovi[i]]
    onCambia(nuovi)
  }
  return (
    <div className={`campo ${errore ? 'campo--errore' : ''}`}>
      <ol className="scelta-luoghi">
        {scelti.map((id, i) => (
          <li key={`${id}-${i}`}>
            <span>{ordinabile && <strong>{i + 1}. </strong>}{nome(id)}</span>
            {ordinabile && (
              <>
                <button type="button" className="pulsante-mini" disabled={i === 0} onClick={() => sposta(i, -1)} aria-label="Sposta su">↑</button>
                <button type="button" className="pulsante-mini" disabled={i === scelti.length - 1} onClick={() => sposta(i, 1)} aria-label="Sposta giù">↓</button>
              </>
            )}
            <button type="button" className="pulsante-mini" onClick={() => onCambia(scelti.filter((_, j) => j !== i))} aria-label={`Togli ${nome(id)}`}>✕</button>
          </li>
        ))}
      </ol>
      <div className="riga-pulsanti">
        <select value={aggiunta} onChange={(e) => setAggiunta(e.target.value)} aria-label="Luogo da aggiungere">
          <option value="">Scegli un luogo…</option>
          {luoghi.map((l) => (
            <option key={l.id} value={l.id}>{l.nome}</option>
          ))}
        </select>
        <button
          type="button"
          className="pulsante"
          disabled={!aggiunta}
          onClick={() => {
            onCambia([...scelti, aggiunta])
            setAggiunta('')
          }}
        >
          Aggiungi
        </button>
      </div>
      {errore && <span className="campo__errore">{errore}</span>}
    </div>
  )
}

/** Salvataggio con richiesta di conferma quando il server la chiede (409) */
async function salvaConConferma(salva, avvisa) {
  try {
    await salva(false)
    return true
  } catch (err) {
    if (err.stato === 409 && window.confirm(`${err.message}.\n\nVuoi procedere comunque?`)) {
      await salva(true)
      return true
    }
    throw err
  }
}

// ---------- Luoghi (UC-07) ----------

const POI_VUOTO = {
  nome: '', categoria: 'storia', temi: [], posizione: null, indirizzo: '', epoca: '', sintesi: '', descrizione: '',
  affresco_autore: '', affresco_epoca: '', piatto_consigliato: '', parole_chiave: '', fonti: [{ titolo: '', url: '' }],
  en: {},
}

function GestioneLuoghi({ avvisa }) {
  const [luoghi, setLuoghi] = useState(null)
  const [filtro, setFiltro] = useState('')
  const [modifica, setModifica] = useState(null) // { id?, dati }

  const carica = useCallback(() => admin.getPoi().then(setLuoghi), [])
  useEffect(() => {
    carica()
  }, [carica])

  const elimina = async (poi) => {
    if (!window.confirm(`Eliminare "${poi.nome}"? I ricordi collegati verranno eliminati.`)) return
    try {
      await salvaConConferma((conferma) => admin.eliminaPoi(poi.id, conferma))
      avvisa(`"${poi.nome}" eliminato`)
      carica()
    } catch (err) {
      if (err.stato !== 409) avvisa(err.message)
    }
  }

  if (modifica) {
    return (
      <ModuloPoi
        iniziale={modifica}
        tutti={luoghi ?? []}
        onAnnulla={() => setModifica(null)}
        onSalvato={(nome) => {
          avvisa(`"${nome}" salvato`)
          setModifica(null)
          carica()
        }}
      />
    )
  }

  const visibili = (luoghi ?? []).filter((l) => l.nome.toLowerCase().includes(filtro.toLowerCase()))
  return (
    <section>
      <div className="barra-strumenti">
        <input type="search" placeholder="Cerca un luogo…" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Cerca un luogo" />
        <button type="button" className="pulsante pulsante--primario" onClick={() => setModifica({ dati: POI_VUOTO })}>
          + Nuovo luogo
        </button>
      </div>
      {!luoghi ? (
        <div aria-busy="true" />
      ) : (
        <table className="tabella">
          <thead>
            <tr><th>Nome</th><th>Categoria</th><th>Tappe</th><th><span className="nascosto">Azioni</span></th></tr>
          </thead>
          <tbody>
            {visibili.map((l) => (
              <tr key={l.id}>
                <td>
                  <Link to={`/poi/${l.id}`}>{l.nome}</Link>
                  {l.categoria === 'arte' && l.foto === 0 && <span className="stato stato--rifiutato etichetta-tabella">senza foto</span>}
                </td>
                <td>{CATEGORIE[l.categoria]}</td>
                <td>{l.tappe || '—'}</td>
                <td className="tabella__azioni">
                  <button type="button" className="pulsante-mini" onClick={() => setModifica({ id: l.id, dati: daPoi(l) })}>Modifica</button>
                  <button type="button" className="pulsante-mini pulsante-mini--pericolo" onClick={() => elimina(l)}>Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

const daPoi = (l) => ({
  ...POI_VUOTO,
  ...l,
  descrizione: l.descrizione.join('\n\n'),
  parole_chiave: l.parole_chiave.join(', '),
  affresco_autore: l.affresco_autore ?? '',
  affresco_epoca: l.affresco_epoca ?? '',
  piatto_consigliato: l.piatto_consigliato ?? '',
  en: { ...l.traduzioni?.en, descrizione: l.traduzioni?.en?.descrizione?.join('\n\n') ?? '' },
})

function ModuloPoi({ iniziale, tutti, onAnnulla, onSalvato }) {
  const etichettaTema = useEtichettaTema()
  const [d, setD] = useState(iniziale.dati)
  const [errori, setErrori] = useState({})
  const [occupato, setOccupato] = useState(false)
  const imposta = (campo) => (valore) => setD((x) => ({ ...x, [campo]: valore }))

  const temi = useMemo(() => [...new Set([...TEMI_BASE, ...tutti.flatMap((l) => l.temi), ...d.temi])].sort(), [tutti, d.temi])
  const vistaIniziale = useMemo(() => ({ centro: iniziale.dati.posizione ?? CENTRO_TRENTO, zoom: 16 }), [iniziale])
  const segnaposti = useMemo(
    () => (d.posizione ? [{ id: 'posizione', posizione: d.posizione, colore: `var(--c-${d.categoria})`, attivo: true }] : []),
    [d.posizione, d.categoria],
  )

  const salva = async (e) => {
    e.preventDefault()
    setOccupato(true)
    setErrori({})
    const { en, ...resto } = d
    const dati = {
      ...resto,
      posizione: d.posizione,
      descrizione: d.descrizione.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
      parole_chiave: d.parole_chiave.split(',').map((p) => p.trim()).filter(Boolean),
      fonti: d.fonti.filter((f) => f.titolo.trim() || f.url.trim()),
      traduzioni: traduzioniPerApi(en, ['descrizione']),
    }
    try {
      await salvaConConferma((conferma) => (iniziale.id ? admin.modificaPoi(iniziale.id, dati, conferma) : admin.creaPoi(dati, conferma)))
      onSalvato(d.nome)
    } catch (err) {
      setErrori(err.campi ?? (err.stato === 409 ? {} : { _: err.message }))
    } finally {
      setOccupato(false)
    }
  }

  return (
    <form className="modulo modulo--admin" onSubmit={salva} noValidate>
      <h2>{iniziale.id ? `Modifica "${iniziale.dati.nome}"` : 'Nuovo luogo'}</h2>
      <div className="griglia-campi">
        <CampoTesto etichetta="Nome *" valore={d.nome} onCambia={imposta('nome')} errore={errori.nome} maxLength={120} />
        <label className="campo">
          <span className="campo__etichetta">Categoria *</span>
          <select value={d.categoria} onChange={(e) => imposta('categoria')(e.target.value)}>
            {Object.entries(CATEGORIE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>

      <div className={`campo ${errori.posizione ? 'campo--errore' : ''}`}>
        <span className="campo__etichetta">Posizione * — tocca la mappa per fissarla</span>
        <div className="mappa-scelta">
          <MappaLeaflet etichetta="Scelta della posizione" vista={vistaIniziale} segnaposti={segnaposti} onClickMappa={(p) => imposta('posizione')(p.map((n) => Math.round(n * 1e6) / 1e6))} />
        </div>
        <span className="campo__aiuto">{d.posizione ? `Lat ${d.posizione[0]}, Lng ${d.posizione[1]}` : 'Nessuna posizione'}</span>
        {errori.posizione && <span className="campo__errore">{errori.posizione}</span>}
      </div>

      <fieldset className="scelte scelte--righe">
        <legend className="campo__etichetta">Temi</legend>
        {temi.map((tema) => (
          <label key={tema} className="scelta">
            <input
              type="checkbox"
              checked={d.temi.includes(tema)}
              onChange={(e) => imposta('temi')(e.target.checked ? [...d.temi, tema] : d.temi.filter((x) => x !== tema))}
            />
            <span>{etichettaTema(tema)}</span>
          </label>
        ))}
      </fieldset>

      <div className="griglia-campi">
        <CampoTesto etichetta="Indirizzo" valore={d.indirizzo} onCambia={imposta('indirizzo')} maxLength={200} />
        <CampoTesto etichetta="Epoca" valore={d.epoca} onCambia={imposta('epoca')} maxLength={100} />
      </div>
      <CampoTesto etichetta="Sintesi * (una frase, compare nell'anteprima)" valore={d.sintesi} onCambia={imposta('sintesi')} errore={errori.sintesi} maxLength={300} />
      <CampoTesto
        etichetta="Storia"
        aiuto="Lascia una riga vuota tra un paragrafo e l'altro"
        valore={d.descrizione}
        onCambia={imposta('descrizione')}
        errore={erroreCampo(errori, 'descrizione')}
        multilinea
        rows={8}
      />
      {d.categoria === 'arte' && (
        <div className="griglia-campi">
          <CampoTesto etichetta="Autore dell'affresco" valore={d.affresco_autore} onCambia={imposta('affresco_autore')} />
          <CampoTesto etichetta="Epoca dell'affresco" valore={d.affresco_epoca} onCambia={imposta('affresco_epoca')} />
        </div>
      )}
      {d.categoria === 'gastronomia' && (
        <CampoTesto etichetta="Piatto consigliato" valore={d.piatto_consigliato} onCambia={imposta('piatto_consigliato')} />
      )}
      <CampoTesto etichetta="Parole chiave per la ricerca" aiuto="Separate da virgole" valore={d.parole_chiave} onCambia={imposta('parole_chiave')} />

      <Traduzioni
        valori={d.en}
        onCambia={imposta('en')}
        campi={[
          { campo: 'nome', etichetta: 'Nome' },
          { campo: 'sintesi', etichetta: 'Sintesi' },
          { campo: 'descrizione', etichetta: 'Storia', multilinea: true },
          { campo: 'epoca', etichetta: 'Epoca' },
          ...(d.categoria === 'arte'
            ? [{ campo: 'affresco_autore', etichetta: "Autore dell'affresco" }, { campo: 'affresco_epoca', etichetta: "Epoca dell'affresco" }]
            : []),
          ...(d.categoria === 'gastronomia' ? [{ campo: 'piatto_consigliato', etichetta: 'Piatto consigliato' }] : []),
        ]}
      />

      <fieldset className={`campo ${erroreCampo(errori, 'fonti') ? 'campo--errore' : ''}`}>
        <legend className="campo__etichetta">Fonti * (almeno una, RNF-V01)</legend>
        {d.fonti.map((f, i) => (
          <div key={i} className="riga-fonte">
            <input placeholder="Titolo" value={f.titolo} aria-label={`Titolo della fonte ${i + 1}`} onChange={(e) => imposta('fonti')(d.fonti.map((x, j) => (j === i ? { ...x, titolo: e.target.value } : x)))} />
            <input placeholder="https://…" type="url" value={f.url} aria-label={`Indirizzo della fonte ${i + 1}`} onChange={(e) => imposta('fonti')(d.fonti.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
            <button type="button" className="pulsante-mini" aria-label="Togli la fonte" onClick={() => imposta('fonti')(d.fonti.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className="pulsante-mini" onClick={() => imposta('fonti')([...d.fonti, { titolo: '', url: '' }])}>+ Aggiungi fonte</button>
        {erroreCampo(errori, 'fonti') && <span className="campo__errore">{erroreCampo(errori, 'fonti')}</span>}
      </fieldset>

      {iniziale.id ? (
        <FotoDelLuogo id={iniziale.id} obbligatoria={d.categoria === 'arte'} />
      ) : (
        <p className="nota"><Icona nome="info" size={16} />Le foto si aggiungono dopo aver salvato il luogo{d.categoria === 'arte' ? ': per gli affreschi almeno una è obbligatoria' : ''}.</p>
      )}

      {errori._ && <p className="messaggio messaggio--errore" role="alert">{errori._}</p>}
      {Object.keys(errori).length > 0 && !errori._ && <p className="messaggio messaggio--errore" role="alert">Controlla i campi evidenziati.</p>}
      <div className="modulo__azioni">
        <button type="button" className="pulsante" onClick={onAnnulla}>Annulla</button>
        <button type="submit" className="pulsante pulsante--primario" disabled={occupato}>Salva</button>
      </div>
    </form>
  )
}

/** Foto ufficiali del luogo, con autore e licenza obbligatori */
function FotoDelLuogo({ id, obbligatoria }) {
  const [foto, setFoto] = useState([])
  const [file, setFile] = useState(null)
  const [crediti, setCrediti] = useState({ autore: '', licenza: '', url_licenza: '', fonte: '', didascalia: '' })
  const [errori, setErrori] = useState({})
  const [occupato, setOccupato] = useState(false)

  const carica = useCallback(() => getPoiById(id).then((p) => setFoto(p.foto)), [id])
  useEffect(() => {
    carica()
  }, [carica])

  const imposta = (campo) => (valore) => setCrediti((c) => ({ ...c, [campo]: valore }))

  // Questo non è un <form>: sta dentro il modulo del luogo, che ha già il suo invio
  const invia = async () => {
    setErrori({})
    if (!file) return setErrori({ foto: 'Scegli una foto' })
    const dati = new FormData()
    dati.append('foto', file)
    for (const [k, v] of Object.entries(crediti)) dati.append(k, v)
    setOccupato(true)
    try {
      await admin.caricaFotoPoi(id, dati)
      setFile(null)
      setCrediti((c) => ({ ...c, didascalia: '' }))
      carica()
    } catch (err) {
      setErrori(err.campi && Object.keys(err.campi).length ? err.campi : { _: err.message })
    } finally {
      setOccupato(false)
    }
  }

  const elimina = async (f) => {
    if (!window.confirm('Eliminare questa foto?')) return
    await admin.eliminaFotoPoi(id, f.id)
    carica()
  }

  return (
    <fieldset className="campo foto-luogo">
      <legend className="campo__etichetta">Foto del luogo{obbligatoria ? ' * (obbligatoria per gli affreschi)' : ''}</legend>
      {foto.length === 0 && <p className={obbligatoria ? 'messaggio messaggio--errore' : 'nota'}>Nessuna foto ancora.</p>}
      <ul className="foto-luogo__elenco">
        {foto.map((f) => (
          <li key={f.id}>
            <img src={urlFoto(f.id, 'mini')} alt={f.didascalia} />
            <span>
              {f.didascalia && <strong>{f.didascalia}</strong>}
              <small>{f.autore} · {f.licenza}</small>
            </span>
            <button type="button" className="pulsante-mini pulsante-mini--pericolo" onClick={() => elimina(f)}>Elimina</button>
          </li>
        ))}
      </ul>
      <div className="foto-luogo__nuova">
        <label className={`campo ${errori.foto ? 'campo--errore' : ''}`}>
          <span className="campo__etichetta">Nuova foto (JPEG, PNG o WebP, fino a 10 MB)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {errori.foto && <span className="campo__errore">{errori.foto}</span>}
        </label>
        <div className="griglia-campi">
          <CampoTesto etichetta="Autore *" valore={crediti.autore} onCambia={imposta('autore')} errore={errori.autore} />
          <CampoTesto etichetta="Licenza * (es. CC BY-SA 4.0)" valore={crediti.licenza} onCambia={imposta('licenza')} errore={errori.licenza} />
          <CampoTesto etichetta="Link alla licenza" valore={crediti.url_licenza} onCambia={imposta('url_licenza')} errore={errori.url_licenza} />
          <CampoTesto etichetta="Fonte (pagina della foto)" valore={crediti.fonte} onCambia={imposta('fonte')} errore={errori.fonte} />
        </div>
        <CampoTesto etichetta="Didascalia" valore={crediti.didascalia} onCambia={imposta('didascalia')} maxLength={300} />
        {errori._ && <p className="messaggio messaggio--errore" role="alert">{errori._}</p>}
        <button type="button" className="pulsante" onClick={invia} disabled={occupato}>Carica la foto</button>
      </div>
    </fieldset>
  )
}

// ---------- Itinerari (RF-24) ----------

function GestioneItinerari({ avvisa }) {
  const etichettaTema = useEtichettaTema()
  const [itinerari, setItinerari] = useState(null)
  const [luoghi, setLuoghi] = useState([])
  const [modifica, setModifica] = useState(null)

  const carica = useCallback(() => admin.getItinerari().then(setItinerari), [])
  useEffect(() => {
    carica()
    admin.getPoi().then(setLuoghi)
  }, [carica])

  const elimina = async (it) => {
    if (!window.confirm(`Eliminare l'itinerario "${it.titolo}"?`)) return
    await admin.eliminaItinerario(it.id).catch((err) => avvisa(err.message))
    carica()
  }

  if (modifica) {
    return (
      <ModuloGenerico
        titolo={modifica.id ? `Modifica "${modifica.dati.titolo}"` : 'Nuovo itinerario'}
        iniziale={modifica.dati}
        salva={({ en, ...dati }) => {
          const corpo = { ...dati, traduzioni: traduzioniPerApi(en) }
          return modifica.id ? admin.modificaItinerario(modifica.id, corpo) : admin.creaItinerario(corpo)
        }}
        onAnnulla={() => setModifica(null)}
        onSalvato={() => {
          avvisa('Itinerario salvato')
          setModifica(null)
          carica()
        }}
      >
        {(d, imposta, errori) => (
          <>
            <CampoTesto etichetta="Titolo *" valore={d.titolo} onCambia={imposta('titolo')} errore={errori.titolo} />
            <div className="griglia-campi">
              <label className="campo">
                <span className="campo__etichetta">Tema</span>
                <select value={d.tema} onChange={(e) => imposta('tema')(e.target.value)}>
                  {TEMI_BASE.map((tema) => <option key={tema} value={tema}>{etichettaTema(tema)}</option>)}
                </select>
              </label>
              <CampoTesto etichetta="Durata (minuti) *" type="number" min={10} valore={d.durata_minuti} onCambia={(v) => imposta('durata_minuti')(Number(v))} errore={errori.durata_minuti} />
            </div>
            <CampoTesto etichetta="Descrizione" valore={d.descrizione} onCambia={imposta('descrizione')} multilinea rows={3} />
            <span className="campo__etichetta">Tappe * (in ordine)</span>
            {d.tappe_rimosse?.length > 0 && (
              <p className="messaggio messaggio--attenzione">
                <Icona nome="attenzione" size={18} />
                <span>
                  Luoghi eliminati, che il sito salta: {d.tappe_rimosse.map((r) => r.nome).join(', ')}. Salvando l'itinerario spariscono
                  anche da qui: se serve, sostituiscili con un altro luogo.
                </span>
              </p>
            )}
            <SceltaLuoghi luoghi={luoghi} scelti={d.tappe} onCambia={imposta('tappe')} ordinabile errore={erroreCampo(errori, 'tappe')} />
            <Traduzioni
              valori={d.en}
              onCambia={imposta('en')}
              campi={[
                { campo: 'titolo', etichetta: 'Titolo' },
                { campo: 'descrizione', etichetta: 'Descrizione', multilinea: true },
              ]}
            />
          </>
        )}
      </ModuloGenerico>
    )
  }

  return (
    <section>
      <div className="barra-strumenti">
        <button type="button" className="pulsante pulsante--primario" onClick={() => setModifica({ dati: { titolo: '', tema: 'principi-vescovi', durata_minuti: 60, descrizione: '', tappe: [], en: {} } })}>
          + Nuovo itinerario
        </button>
      </div>
      <table className="tabella">
        <thead><tr><th>Titolo</th><th>Durata</th><th>Tappe</th><th><span className="nascosto">Azioni</span></th></tr></thead>
        <tbody>
          {(itinerari ?? []).map((it) => (
            <tr key={it.id}>
              <td><Link to={`/itinerari/${it.id}`}>{it.titolo}</Link></td>
              <td>{it.durata_minuti} min</td>
              <td>
                {it.tappe.length}
                {it.tappe_rimosse.length > 0 && <span className="stato stato--rifiutato etichetta-tabella">{it.tappe_rimosse.length} rimosse</span>}
              </td>
              <td className="tabella__azioni">
                <button type="button" className="pulsante-mini" onClick={() => setModifica({ id: it.id, dati: { ...it, tappe: it.tappe.map((p) => p.id), en: it.traduzioni?.en ?? {} } })}>Modifica</button>
                <button type="button" className="pulsante-mini pulsante-mini--pericolo" onClick={() => elimina(it)}>Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

// ---------- Tradizioni (RF-24) ----------

function GestioneTradizioni({ avvisa }) {
  const [tradizioni, setTradizioni] = useState(null)
  const [luoghi, setLuoghi] = useState([])
  const [modifica, setModifica] = useState(null)

  const carica = useCallback(() => admin.getTradizioni().then(setTradizioni), [])
  useEffect(() => {
    carica()
    admin.getPoi().then(setLuoghi)
  }, [carica])

  const elimina = async (tr) => {
    if (!window.confirm(`Eliminare "${tr.nome}"?`)) return
    await admin.eliminaTradizione(tr.id).catch((err) => avvisa(err.message))
    carica()
  }

  if (modifica) {
    return (
      <ModuloGenerico
        titolo={modifica.id ? `Modifica "${modifica.dati.nome}"` : 'Nuova tradizione'}
        iniziale={modifica.dati}
        salva={({ en, ...dati }) => {
          const corpo = { ...dati, traduzioni: traduzioniPerApi(en) }
          return modifica.id ? admin.modificaTradizione(modifica.id, corpo) : admin.creaTradizione(corpo)
        }}
        onAnnulla={() => setModifica(null)}
        onSalvato={() => {
          avvisa('Tradizione salvata')
          setModifica(null)
          carica()
        }}
      >
        {(d, imposta, errori) => (
          <>
            <div className="griglia-campi">
              <CampoTesto etichetta="Nome *" valore={d.nome} onCambia={imposta('nome')} errore={errori.nome} />
              <CampoTesto etichetta="Periodo * (come appare nel sito)" valore={d.periodo} onCambia={imposta('periodo')} errore={errori.periodo} />
            </div>
            <fieldset className="scelte scelte--righe">
              <legend className="campo__etichetta">Mesi (per mettere in evidenza le feste in corso)</legend>
              {MESI.map((m, i) => (
                <label key={m} className="scelta">
                  <input type="checkbox" checked={d.mesi.includes(i + 1)} onChange={(e) => imposta('mesi')(e.target.checked ? [...d.mesi, i + 1].sort((a, b) => a - b) : d.mesi.filter((x) => x !== i + 1))} />
                  <span>{m}</span>
                </label>
              ))}
            </fieldset>
            <CampoTesto etichetta="Descrizione" valore={d.descrizione} onCambia={imposta('descrizione')} multilinea rows={4} />
            <span className="campo__etichetta">Luoghi collegati</span>
            <SceltaLuoghi luoghi={luoghi} scelti={d.luoghi} onCambia={imposta('luoghi')} />
            <Traduzioni
              valori={d.en}
              onCambia={imposta('en')}
              campi={[
                { campo: 'nome', etichetta: 'Nome' },
                { campo: 'periodo', etichetta: 'Periodo' },
                { campo: 'descrizione', etichetta: 'Descrizione', multilinea: true },
              ]}
            />
          </>
        )}
      </ModuloGenerico>
    )
  }

  return (
    <section>
      <div className="barra-strumenti">
        <button type="button" className="pulsante pulsante--primario" onClick={() => setModifica({ dati: { nome: '', periodo: '', mesi: [], descrizione: '', luoghi: [], en: {} } })}>
          + Nuova tradizione
        </button>
      </div>
      <table className="tabella">
        <thead><tr><th>Nome</th><th>Periodo</th><th><span className="nascosto">Azioni</span></th></tr></thead>
        <tbody>
          {(tradizioni ?? []).map((tr) => (
            <tr key={tr.id}>
              <td>{tr.nome}</td>
              <td>{tr.periodo}</td>
              <td className="tabella__azioni">
                <button type="button" className="pulsante-mini" onClick={() => setModifica({ id: tr.id, dati: { ...tr, luoghi: tr.luoghi.map((l) => l.id), en: tr.traduzioni?.en ?? {} } })}>Modifica</button>
                <button type="button" className="pulsante-mini pulsante-mini--pericolo" onClick={() => elimina(tr)}>Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

/** Modulo con stato, salvataggio ed errori dei campi; i campi li disegna `children(dati, imposta, errori)` */
function ModuloGenerico({ titolo, iniziale, salva, onAnnulla, onSalvato, children }) {
  const [d, setD] = useState(iniziale)
  const [errori, setErrori] = useState({})
  const imposta = (campo) => (valore) => setD((x) => ({ ...x, [campo]: valore }))

  const invia = async (e) => {
    e.preventDefault()
    setErrori({})
    try {
      await salva(d)
      onSalvato()
    } catch (err) {
      setErrori(err.campi && Object.keys(err.campi).length ? err.campi : { _: err.message })
    }
  }

  return (
    <form className="modulo modulo--admin" onSubmit={invia} noValidate>
      <h2>{titolo}</h2>
      {children(d, imposta, errori)}
      {errori._ && <p className="messaggio messaggio--errore" role="alert">{errori._}</p>}
      <div className="modulo__azioni">
        <button type="button" className="pulsante" onClick={onAnnulla}>Annulla</button>
        <button type="submit" className="pulsante pulsante--primario">Salva</button>
      </div>
    </form>
  )
}

// ---------- Utenti e ruoli (UC-09) ----------

function GestioneUtenti({ avvisa }) {
  const [q, setQ] = useState('')
  const [utenti, setUtenti] = useState(null)

  const cerca = useCallback(() => admin.getUtenti(q.trim()).then(setUtenti), [q])
  useEffect(() => {
    const timer = setTimeout(cerca, 250)
    return () => clearTimeout(timer)
  }, [cerca])

  const cambia = async (u, ruolo) => {
    try {
      await admin.cambiaRuolo(u.id, ruolo)
      avvisa(ruolo === 'moderatore' ? `${u.nome} ora è moderatore` : `Ruolo di moderatore revocato a ${u.nome}`)
    } catch (err) {
      avvisa(err.message)
    }
    cerca()
  }

  return (
    <section>
      <div className="barra-strumenti">
        <input type="search" placeholder="Cerca per nome o e-mail…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca un utente" />
      </div>
      {utenti?.length === 0 && <p className="vuoto">Nessun utente corrisponde alla ricerca.</p>}
      <table className="tabella">
        <thead><tr><th>Nome</th><th>E-mail</th><th>Ruolo</th><th>Ricordi</th><th><span className="nascosto">Azioni</span></th></tr></thead>
        <tbody>
          {(utenti ?? []).map((u) => (
            <tr key={u.id}>
              <td>{u.nome}{!u.email_confermata && <small className="nota"> (non confermato)</small>}</td>
              <td>{u.email}</td>
              <td>{u.ruolo}</td>
              <td>{u.contributi}</td>
              <td className="tabella__azioni">
                {u.ruolo === 'utente' && <button type="button" className="pulsante-mini" onClick={() => cambia(u, 'moderatore')}>Rendi moderatore</button>}
                {u.ruolo === 'moderatore' && <button type="button" className="pulsante-mini pulsante-mini--pericolo" onClick={() => cambia(u, 'utente')}>Revoca moderatore</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="nota"><Icona nome="info" size={16} />Il nuovo ruolo vale dalla richiesta successiva dell'utente; l'interessato riceve un'e-mail.</p>
    </section>
  )
}

// ---------- Esporta e importa (RNF-PO04) ----------

const IMPORTAZIONI = [
  {
    chiave: 'poi',
    titolo: 'Luoghi',
    formato: 'GeoJSON',
    esporta: URL_GEOJSON,
    nomeFile: 'discover-tridentum-luoghi.geojson',
    accetta: '.geojson,.json,application/geo+json,application/json',
    importa: admin.importaPoi,
  },
  {
    chiave: 'itinerari',
    titolo: 'Itinerari',
    formato: 'JSON',
    esporta: URL_ITINERARI_JSON,
    nomeFile: 'discover-tridentum-itinerari.json',
    accetta: '.json,application/json',
    importa: admin.importaItinerari,
  },
]

function GestioneDati({ avvisa }) {
  const [esiti, setEsiti] = useState({})

  const importa = async (voce, file) => {
    setEsiti((e) => ({ ...e, [voce.chiave]: { stato: 'invio' } }))
    try {
      const contenuto = JSON.parse(await file.text())
      const { creati, aggiornati } = await voce.importa(contenuto)
      setEsiti((e) => ({ ...e, [voce.chiave]: { stato: 'ok', testo: `${voce.titolo}: ${creati} creati, ${aggiornati} aggiornati.` } }))
      avvisa('Importazione completata')
    } catch (err) {
      const testo = err instanceof SyntaxError ? 'Il file non è un JSON valido.' : err.message
      setEsiti((e) => ({ ...e, [voce.chiave]: { stato: 'errore', testo: `Niente è stato importato. ${testo}` } }))
    }
  }

  return (
    <section className="gestione-dati">
      <p>
        Luoghi e itinerari si scaricano in formati aperti e si possono reimportare, anche dopo averli modificati: una voce con un
        identificatore già presente viene aggiornata, le altre vengono create. Se una voce non è valida non si importa niente.
      </p>
      <ul className="elenco-schede">
        {IMPORTAZIONI.map((voce) => {
          const esito = esiti[voce.chiave]
          return (
            <li key={voce.chiave} className="riquadro">
              <h2>{voce.titolo} <span className="nota">({voce.formato})</span></h2>
              <div className="riga-pulsanti">
                <a className="pulsante" href={voce.esporta} download={voce.nomeFile}>
                  <Icona nome="scarica" size={18} />
                  Esporta
                </a>
                <label className="pulsante">
                  <Icona nome="carica" size={18} />
                  Importa un file…
                  <input
                    type="file"
                    accept={voce.accetta}
                    className="nascosto"
                    disabled={esito?.stato === 'invio'}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (file) importa(voce, file)
                    }}
                  />
                </label>
              </div>
              {esito?.testo && (
                <p className={`messaggio messaggio--${esito.stato === 'ok' ? 'ok' : 'errore'}`} role={esito.stato === 'ok' ? 'status' : 'alert'}>
                  {esito.testo}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
