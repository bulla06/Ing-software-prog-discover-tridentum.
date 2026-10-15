import { Suspense, lazy, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import BarraNavigazione from './components/BarraNavigazione.jsx'
import ErroreImprevisto from './components/ErroreImprevisto.jsx'
import { LinguaProvider, useT } from './i18n/index.jsx'
import { leggi, scrivi } from './lib/memoria.js'
import { PosizioneProvider } from './lib/posizione.jsx'
import { SessioneProvider } from './lib/sessione.jsx'
import Benvenuto from './pages/Benvenuto.jsx'
import Mappa from './pages/Mappa.jsx'

// All'apertura servono solo il benvenuto e la mappa: le altre pagine si scaricano quando servono,
// così il primo caricamento è più leggero (RNF-P01). La scheda si scarica in anticipo appena la
// mappa ha i luoghi (vedi Mappa.jsx), perché deve aprirsi in fretta dal tocco (RNF-P02).
const Scheda = lazy(() => import('./pages/Scheda.jsx'))
const Gioco = lazy(() => import('./pages/Gioco.jsx'))
const Itinerari = lazy(() => import('./pages/Itinerari.jsx'))
const Itinerario = lazy(() => import('./pages/Itinerario.jsx'))
const Profilo = lazy(() => import('./pages/Profilo.jsx'))
const Scopri = lazy(() => import('./pages/Scopri.jsx'))
const Accesso = lazy(() => import('./pages/Accesso.jsx'))
const AggiungiRicordo = lazy(() => import('./pages/AggiungiRicordo.jsx'))
const Conferma = lazy(() => import('./pages/Conferma.jsx'))
const PostaDiProva = lazy(() => import('./pages/PostaDiProva.jsx'))
const Reimposta = lazy(() => import('./pages/Reimposta.jsx'))
const Informativa = lazy(() => import('./pages/Informativa.jsx'))
const Inquadra = lazy(() => import('./pages/Inquadra.jsx'))
const Amministrazione = lazy(() => import('./pages/Amministrazione.jsx'))
const Moderazione = lazy(() => import('./pages/Moderazione.jsx'))

// Routing con l'hash (#/poi/duomo): il server deve consegnare solo index.html,
// senza regole particolari per i percorsi delle pagine.
export default function App() {
  const [benvenutoVisto, setBenvenutoVisto] = useState(
    // Chi arriva da un link nelle e-mail non deve passare dal benvenuto
    () => leggi('benvenuto-visto', false) || /^#\/(conferma|reimposta|privacy)/.test(window.location.hash),
  )

  const chiudiBenvenuto = () => {
    scrivi('benvenuto-visto', true)
    setBenvenutoVisto(true)
  }

  return (
    <LinguaProvider>
      <SessioneProvider>
        <PosizioneProvider>
          <HashRouter>
            {benvenutoVisto ? (
              <div className="app">
                <SaltaAlContenuto />
                <Contenuto onRivediBenvenuto={() => setBenvenutoVisto(false)} />
                {/* Dopo il contenuto nel codice: chi usa la tastiera o uno screen reader
                    arriva subito alla pagina. Su desktop il CSS la mette a sinistra. */}
                <BarraNavigazione />
              </div>
            ) : (
              <Benvenuto onInizia={chiudiBenvenuto} />
            )}
          </HashRouter>
        </PosizioneProvider>
      </SessioneProvider>
    </LinguaProvider>
  )
}

function SaltaAlContenuto() {
  const { t } = useT()
  return (
    <a className="salta" href="#contenuto" onClick={(e) => {
      // Con il routing a hash un normale link ad ancora cambierebbe pagina: si sposta solo il focus
      e.preventDefault()
      document.getElementById('contenuto')?.focus()
    }}>
      {t('nav.salta')}
    </a>
  )
}

// La chiave sul percorso fa ripartire la breve dissolvenza d'ingresso a ogni cambio di
// pagina: comunica che la schermata è cambiata. Ricerche e filtri (che cambiano solo i
// parametri) non la fanno ripartire.
function Contenuto({ onRivediBenvenuto }) {
  const { pathname } = useLocation()
  return (
    <main className="app__contenuto" id="contenuto" tabIndex={-1} key={pathname}>
      <ErroreImprevisto>
      <Suspense fallback={<div className="pagina" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<Mappa />} />
          <Route path="/poi/:id" element={<Scheda />} />
          <Route path="/poi/:id/ricordo" element={<AggiungiRicordo />} />
          <Route path="/itinerari" element={<Itinerari />} />
          <Route path="/itinerari/:id" element={<Itinerario />} />
          <Route path="/scopri" element={<Scopri />} />
          <Route path="/gioco" element={<Gioco />} />
          <Route path="/profilo" element={<Profilo onRivediBenvenuto={onRivediBenvenuto} />} />
          <Route path="/accesso" element={<Accesso />} />
          <Route path="/conferma" element={<Conferma />} />
          <Route path="/reimposta" element={<Reimposta />} />
          <Route path="/privacy" element={<Informativa />} />
          <Route path="/inquadra" element={<Inquadra />} />
          <Route path="/moderazione" element={<Moderazione />} />
          <Route path="/amministrazione" element={<Amministrazione />} />
          <Route path="/dev/posta" element={<PostaDiProva />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </ErroreImprevisto>
    </main>
  )
}
