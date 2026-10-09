import { useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import BarraNavigazione from './components/BarraNavigazione.jsx'
import { LinguaProvider } from './i18n/index.jsx'
import { leggi, scrivi } from './lib/memoria.js'
import { PosizioneProvider } from './lib/posizione.jsx'
import Benvenuto from './pages/Benvenuto.jsx'
import Gioco from './pages/Gioco.jsx'
import Itinerari from './pages/Itinerari.jsx'
import Itinerario from './pages/Itinerario.jsx'
import Mappa from './pages/Mappa.jsx'
import Profilo from './pages/Profilo.jsx'
import Scheda from './pages/Scheda.jsx'
import Scopri from './pages/Scopri.jsx'

// Routing con l'hash (#/poi/duomo): il sito funziona anche su un hosting statico
// come GitHub Pages, senza configurare il server.
export default function App() {
  const [benvenutoVisto, setBenvenutoVisto] = useState(() => leggi('benvenuto-visto', false))

  const chiudiBenvenuto = () => {
    scrivi('benvenuto-visto', true)
    setBenvenutoVisto(true)
  }

  return (
    <LinguaProvider>
      <PosizioneProvider>
        <HashRouter>
          {benvenutoVisto ? (
            <div className="app">
              <main className="app__contenuto">
                <Routes>
                  <Route path="/" element={<Mappa />} />
                  <Route path="/poi/:id" element={<Scheda />} />
                  <Route path="/itinerari" element={<Itinerari />} />
                  <Route path="/itinerari/:id" element={<Itinerario />} />
                  <Route path="/scopri" element={<Scopri />} />
                  <Route path="/gioco" element={<Gioco />} />
                  <Route path="/profilo" element={<Profilo onRivediBenvenuto={() => setBenvenutoVisto(false)} />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <BarraNavigazione />
            </div>
          ) : (
            <Benvenuto onInizia={chiudiBenvenuto} />
          )}
        </HashRouter>
      </PosizioneProvider>
    </LinguaProvider>
  )
}
