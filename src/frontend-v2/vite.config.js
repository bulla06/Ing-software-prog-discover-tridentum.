import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Percorsi relativi: il sito funziona anche pubblicato in una sottocartella
  base: './',
  server: {
    // Porta diversa dalla v1 (5173), così le due versioni si confrontano affiancate.
    // In sviluppo le richieste all'API vanno al backend (npm run dev:v2 dalla cartella principale)
    port: 5174,
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    // I test della v2 stanno in tests/frontend-v2, come da CONTRIBUTING.md
    dir: '../../tests/frontend-v2',
    environment: 'node',
  },
})
