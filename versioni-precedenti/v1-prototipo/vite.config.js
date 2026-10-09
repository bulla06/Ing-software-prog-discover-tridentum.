import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Percorsi relativi: il sito funziona anche pubblicato in una sottocartella (es. GitHub Pages)
  base: './',
  test: {
    // I test di questa versione stanno nella sua cartella tests/
    dir: './tests',
    environment: 'node',
  },
})
