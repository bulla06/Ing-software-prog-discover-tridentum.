-- "Dov'era?" diventa un gioco fotografico: ogni livello curato dal team mostra una foto storica
-- invece di un indizio testuale. Le foto stanno in db/dati/foto-gioco/ e sono servite da
-- GET /api/gioco/foto/:file; autore, licenza e fonte si mostrano dopo la risposta.

ALTER TABLE livelli_gioco ADD COLUMN foto_file    text;
ALTER TABLE livelli_gioco ADD COLUMN foto_autore  text NOT NULL DEFAULT '';
ALTER TABLE livelli_gioco ADD COLUMN foto_licenza text NOT NULL DEFAULT '';
ALTER TABLE livelli_gioco ADD COLUMN foto_fonte   text NOT NULL DEFAULT '';
ALTER TABLE livelli_gioco ALTER COLUMN indizio SET DEFAULT '';
