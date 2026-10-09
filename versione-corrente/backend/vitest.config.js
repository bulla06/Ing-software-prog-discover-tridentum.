import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // I test stanno in tests/backend, come da CONTRIBUTING.md
    dir: '../../tests/backend',
    environment: 'node',
    // Ogni file avvia un database PostgreSQL + PostGIS in memoria (PGlite): serve qualche secondo
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
})
