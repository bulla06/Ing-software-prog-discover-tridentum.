# Immagine del sito: frontend compilato + backend Node.js in un solo container.
# Si usa con docker-compose.yml, che aggiunge il database PostgreSQL + PostGIS.

FROM node:22-slim

WORKDIR /app

# Prima solo i package.json: le dipendenze si reinstallano solo quando cambiano
COPY package.json package-lock.json ./
COPY src/frontend/package.json src/frontend/
# Anche la v2 è un workspace del lockfile: senza il suo package.json npm ci si fermerebbe
COPY src/frontend-v2/package.json src/frontend-v2/
COPY src/backend/package.json src/backend/
RUN npm ci

COPY src/frontend src/frontend
COPY src/backend src/backend
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production \
    PORT=3000 \
    CARTELLA_DATI=/dati

# Foto caricate dagli utenti (l'archivio delle foto, Fase 3 §5.6)
VOLUME /dati
EXPOSE 3000

CMD ["node", "src/backend/src/server.js"]
