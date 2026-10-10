-- RNF-U05: le schede principali anche in inglese. I testi tradotti stanno accanto a quelli italiani,
-- per lingua: { "en": { "nome": "...", "sintesi": "...", "descrizione": ["..."] } }.
-- Un campo senza traduzione si mostra in italiano.
ALTER TABLE poi ADD COLUMN traduzioni jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(traduzioni) = 'object');
ALTER TABLE itinerari ADD COLUMN traduzioni jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(traduzioni) = 'object');
ALTER TABLE tradizioni ADD COLUMN traduzioni jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(traduzioni) = 'object');
ALTER TABLE piatti ADD COLUMN traduzioni jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(traduzioni) = 'object');
