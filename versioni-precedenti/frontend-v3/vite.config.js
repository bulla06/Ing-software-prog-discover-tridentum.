import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Percorsi relativi: il sito funziona anche pubblicato in una sottocartella
  base: './',
  server: {
    // Porta diversa dalla versione corrente (5173) e dalle altre archiviate, così si confrontano affiancate.
    // Le richieste all'API vanno al backend della versione corrente (npm run dev:v3 dalla cartella principale)
    port: 5177,
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    // I test di questa versione stanno nella sua cartella tests/
    dir: './tests',
    environment: 'node',
  },
})
