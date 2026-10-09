-- Schema iniziale del database (modello dei dati della Fase 3 §5.5).
-- PostGIS serve per le posizioni dei POI: vicinanza, distanze nel gioco, duplicati entro 20 m.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------- Utenti e accessi ----------

CREATE TABLE utenti (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_visualizzato   text NOT NULL CHECK (length(nome_visualizzato) BETWEEN 2 AND 40),
  email               text NOT NULL UNIQUE CHECK (email = lower(email)),
  hash_password       text NOT NULL,
  ruolo               text NOT NULL DEFAULT 'utente'
                        CHECK (ruolo IN ('utente', 'moderatore', 'amministratore')),
  email_confermata    boolean NOT NULL DEFAULT false,
  consenso_privacy_il timestamptz NOT NULL,
  creato_il           timestamptz NOT NULL DEFAULT now()
);

-- Token monouso (conferma e-mail, reimpostazione password) e token di rinnovo della sessione.
-- Si salva solo l'hash: chi legge il database non può usarli.
CREATE TABLE token_utente (
  hash      text PRIMARY KEY,
  utente    uuid NOT NULL REFERENCES utenti (id) ON DELETE CASCADE,
  tipo      text NOT NULL CHECK (tipo IN ('conferma', 'reimposta', 'rinnovo')),
  scade_il  timestamptz NOT NULL
);
CREATE INDEX token_utente_utente ON token_utente (utente, tipo);

-- ---------- POI, itinerari e tradizioni ----------

CREATE TABLE poi (
  id                  text PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nome                text NOT NULL CHECK (nome <> ''),
  categoria           text NOT NULL CHECK (categoria IN ('storia', 'arte', 'tradizioni', 'gastronomia')),
  temi                text[] NOT NULL DEFAULT '{}',
  posizione           geography(Point, 4326) NOT NULL,
  indirizzo           text NOT NULL DEFAULT '',
  epoca               text NOT NULL DEFAULT '',
  sintesi             text NOT NULL CHECK (sintesi <> ''),
  descrizione         text[] NOT NULL DEFAULT '{}',
  affresco_autore     text,
  affresco_epoca      text,
  piatto_consigliato  text,
  parole_chiave       text[] NOT NULL DEFAULT '{}',
  -- [{ "titolo": "...", "url": "https://..." }]: almeno una fonte (RNF-V01)
  fonti               jsonb NOT NULL CHECK (jsonb_typeof(fonti) = 'array' AND jsonb_array_length(fonti) > 0),
  creato_il           timestamptz NOT NULL DEFAULT now(),
  aggiornato_il       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX poi_posizione ON poi USING gist (posizione);

CREATE TABLE itinerari (
  id             text PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titolo         text NOT NULL CHECK (titolo <> ''),
  tema           text NOT NULL,
  durata_minuti  integer NOT NULL CHECK (durata_minuti > 0),
  descrizione    text NOT NULL DEFAULT ''
);

-- Eliminare un POI elimina anche le tappe che lo usano (l'amministratore viene avvisato prima, UC-07 1b)
CREATE TABLE tappe (
  itinerario  text NOT NULL REFERENCES itinerari (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ordine      integer NOT NULL,
  poi         text NOT NULL REFERENCES poi (id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (itinerario, ordine)
);

CREATE TABLE tradizioni (
  id           text PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nome         text NOT NULL CHECK (nome <> ''),
  periodo      text NOT NULL,
  mesi         integer[] NOT NULL DEFAULT '{}',
  descrizione  text NOT NULL DEFAULT ''
);

CREATE TABLE tradizioni_poi (
  tradizione  text NOT NULL REFERENCES tradizioni (id) ON DELETE CASCADE ON UPDATE CASCADE,
  poi         text NOT NULL REFERENCES poi (id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (tradizione, poi)
);

-- Piatti tipici della sezione "Mappa del gusto"; i locali sono POI di categoria gastronomia
CREATE TABLE piatti (
  id           text PRIMARY KEY,
  nome         text NOT NULL,
  tipo         text NOT NULL,
  descrizione  text NOT NULL,
  ordine       integer NOT NULL DEFAULT 0
);

CREATE TABLE preferiti (
  utente       uuid NOT NULL REFERENCES utenti (id) ON DELETE CASCADE,
  tipo         text NOT NULL CHECK (tipo IN ('poi', 'itinerario')),
  riferimento  text NOT NULL,
  creato_il    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (utente, tipo, riferimento)
);

-- ---------- Contenuti della community e moderazione ----------

-- Le foto stanno nell'archivio (cartella o storage S3); qui solo i dati per trovarle.
-- Area privata finché il contenuto è in attesa, pubblica dopo l'approvazione (RF-16).
CREATE TABLE foto (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area       text NOT NULL CHECK (area IN ('privata', 'pubblica')),
  larghezza  integer NOT NULL,
  altezza    integer NOT NULL,
  creata_il  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contenuti (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi             text NOT NULL REFERENCES poi (id) ON DELETE CASCADE ON UPDATE CASCADE,
  -- NULL se l'autore ha eliminato l'account lasciando i contributi in forma anonima (UC-08)
  autore          uuid REFERENCES utenti (id) ON DELETE SET NULL,
  testo           text NOT NULL DEFAULT '' CHECK (length(testo) <= 2000),
  anno            text NOT NULL DEFAULT '' CHECK (length(anno) <= 30),
  licenza         text NOT NULL CHECK (licenza IN ('cc-by', 'cc-by-nc', 'riservata')),
  foto            uuid REFERENCES foto (id),
  consenso_gioco  boolean NOT NULL DEFAULT false,
  stato           text NOT NULL DEFAULT 'in_attesa'
                    CHECK (stato IN ('in_attesa', 'approvato', 'rifiutato', 'rimosso')),
  motivazione     text,
  moderato_da     uuid REFERENCES utenti (id) ON DELETE SET NULL,
  moderato_il     timestamptz,
  creato_il       timestamptz NOT NULL DEFAULT now(),
  -- Serve almeno il testo o la foto (UC-04 E2)
  CHECK (testo <> '' OR foto IS NOT NULL)
);
CREATE INDEX contenuti_stato ON contenuti (stato, creato_il);
CREATE INDEX contenuti_poi ON contenuti (poi) WHERE stato = 'approvato';

-- Una segnalazione riguarda un ricordo pubblicato oppure il testo di un POI
CREATE TABLE segnalazioni (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contenuto  uuid REFERENCES contenuti (id) ON DELETE CASCADE,
  poi        text REFERENCES poi (id) ON DELETE CASCADE ON UPDATE CASCADE,
  motivo     text NOT NULL CHECK (motivo IN ('errato', 'inappropriato', 'altro')),
  nota       text NOT NULL DEFAULT '' CHECK (length(nota) <= 500),
  stato      text NOT NULL DEFAULT 'aperta' CHECK (stato IN ('aperta', 'chiusa')),
  esito      text,
  creata_il  timestamptz NOT NULL DEFAULT now(),
  CHECK ((contenuto IS NULL) <> (poi IS NULL))
);

-- ---------- Gioco "Dov'era?" ----------

-- Livelli curati dal team; altri livelli vengono dalle foto approvate con il consenso dell'autore (RF-23)
CREATE TABLE livelli_gioco (
  id       text PRIMARY KEY,
  poi      text NOT NULL REFERENCES poi (id) ON DELETE CASCADE ON UPDATE CASCADE,
  indizio  text NOT NULL,
  anno     text NOT NULL DEFAULT ''
);

CREATE TABLE partite (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utente      uuid NOT NULL REFERENCES utenti (id) ON DELETE CASCADE,
  punteggio   integer NOT NULL CHECK (punteggio >= 0),
  giocata_il  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX partite_punteggio ON partite (punteggio DESC);
