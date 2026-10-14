# Immagine del sito: frontend compilato + backend Node.js in un solo container.
# Si usa con docker-compose.yml, che aggiunge il database PostgreSQL + PostGIS.

FROM node:22-slim

WORKDIR /app

# Prima solo i package.json: le dipendenze si reinstallano solo quando cambiano
COPY package.json package-lock.json ./
COPY versione-corrente/frontend/package.json versione-corrente/frontend/
COPY versione-corrente/backend/package.json versione-corrente/backend/
RUN npm ci

COPY versione-corrente/frontend versione-corrente/frontend
COPY versione-corrente/backend versione-corrente/backend
# Chiave MapTiler per lo sfondo della mappa: entra nel frontend in fase di build (facoltativa)
ARG VITE_MAPTILER_KEY
ENV VITE_MAPTILER_KEY=$VITE_MAPTILER_KEY
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production \
    PORT=3000 \
    CARTELLA_DATI=/dati

# Foto caricate dagli utenti (l'archivio delle foto, Fase 3 §5.6)
VOLUME /dati
EXPOSE 3000

CMD ["node", "versione-corrente/backend/src/server.js"]
