-- UC-02 E1: una tappa il cui luogo viene eliminato non sparisce in silenzio. La tappa resta
-- nell'itinerario con il nome del luogo, così il visitatore viene avvisato che il percorso la salta.
ALTER TABLE tappe ALTER COLUMN poi DROP NOT NULL;
ALTER TABLE tappe ADD COLUMN luogo_rimosso text;
ALTER TABLE tappe DROP CONSTRAINT tappe_poi_fkey;
ALTER TABLE tappe ADD CONSTRAINT tappe_poi_fkey
  FOREIGN KEY (poi) REFERENCES poi (id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE tappe ADD CONSTRAINT tappe_poi_o_nome CHECK (poi IS NOT NULL OR luogo_rimosso IS NOT NULL);

-- Prima di eliminare un luogo se ne salva il nome nelle tappe che lo usano
CREATE FUNCTION ricorda_tappe_rimosse() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE tappe SET luogo_rimosso = OLD.nome WHERE poi = OLD.id;
  RETURN OLD;
END;
$$;
CREATE TRIGGER poi_eliminato BEFORE DELETE ON poi FOR EACH ROW EXECUTE FUNCTION ricorda_tappe_rimosse();

-- RF-23: è il moderatore a decidere se una foto della community diventa un livello di "Dov'era?"
-- (solo se l'autore ha dato il consenso). La posizione dello scatto, se l'autore l'ha indicata,
-- rende il livello più preciso di quella del luogo.
ALTER TABLE contenuti ADD COLUMN livello_gioco boolean NOT NULL DEFAULT false;
ALTER TABLE contenuti ADD COLUMN posizione_foto geography(Point, 4326);
-- Finora la foto diventava un livello da sola all'approvazione: chi è già in gioco ci resta
UPDATE contenuti SET livello_gioco = true WHERE stato = 'approvato' AND consenso_gioco AND foto IS NOT NULL;
ALTER TABLE contenuti ADD CONSTRAINT contenuti_livello_con_consenso CHECK (NOT livello_gioco OR consenso_gioco);
