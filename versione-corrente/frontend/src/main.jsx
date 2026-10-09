import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Font ospitati insieme al sito (nessuna richiesta a servizi esterni): Geist per i testi,
// Geist Mono per numeri, distanze e punteggi.
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import App from './App.jsx'
import './stile.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
