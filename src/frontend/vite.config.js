import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Percorsi relativi: il sito funziona anche pubblicato in una sottocartella (es. GitHub Pages)
  base: './',
  test: {
    // I test stanno in tests/frontend, come da CONTRIBUTING.md
    dir: '../../tests/frontend',
    environment: 'node',
  },
})
