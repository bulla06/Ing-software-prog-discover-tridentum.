-- Foto "ufficiali" dei luoghi, curate dal team o importate da archivi aperti (es. Wikimedia Commons).
-- A differenza dei ricordi della community non passano dalla moderazione, ma devono sempre
-- indicare autore e licenza: molte licenze libere (CC BY, CC BY-SA) obbligano a citarli.

CREATE TABLE foto_poi (
  foto         uuid PRIMARY KEY REFERENCES foto (id) ON DELETE CASCADE,
  poi          text NOT NULL REFERENCES poi (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ordine       integer NOT NULL DEFAULT 0,
  didascalia   text NOT NULL DEFAULT '' CHECK (length(didascalia) <= 300),
  autore       text NOT NULL CHECK (autore <> ''),
  licenza      text NOT NULL CHECK (licenza <> ''),
  url_licenza  text,
  fonte        text
);
CREATE INDEX foto_poi_poi ON foto_poi (poi, ordine);

-- Pacchetti di dati iniziali già caricati (cartelle di db/dati), come le migrazioni per lo schema
CREATE TABLE pacchetti_dati (
  nome         text PRIMARY KEY,
  caricato_il  timestamptz NOT NULL DEFAULT now()
);
