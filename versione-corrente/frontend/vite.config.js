import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Percorsi relativi: il sito funziona anche pubblicato in una sottocartella
  base: './',
  server: {
    // In sviluppo le richieste all'API vanno al backend (npm run dev dalla cartella principale)
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    // I test stanno in tests/frontend, come da CONTRIBUTING.md
    dir: '../../tests/frontend',
    environment: 'node',
  },
})
