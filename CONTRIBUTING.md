# Convenzioni del team

Regole condivise per mantenere il repository ordinato e i documenti coerenti tra loro.

## Struttura delle cartelle

| Cartella | Contenuto |
|---|---|
| `docs/` | Documenti di progetto, uno per fase: `fase-N-argomento.md` |
| `docs/libretti/` | Libretto delle attività di ciascun membro: `nome-cognome.docx` |
| `presentazioni/` | Presentazioni: `presentazione-vN.pptx` |

Quando inizierà lo sviluppo, il codice andrà in `src/` e i test in `tests/`.

## Nomi dei file

- Solo lettere minuscole, numeri e trattini: `fase-3-architettura.md`, non `Fase 3 Architettura.md`.
- Niente spazi, accenti, virgolette o caratteri speciali (creano problemi a Git e negli URL).
- Le versioni vanno nel nome solo per i file binari (`-v1`, `-v2`); per i file Markdown la storia la tiene Git.

## Documenti di progetto

Ogni documento in `docs/` ha in testa:

- progetto, corso, team;
- **versione** (`0.x` finché è in bozza, `1.0` alla consegna) e **stato** (Bozza · In revisione · Consegnato);
- link al documento precedente e successivo;
- **storico delle revisioni**: versione, data, autore, modifiche.

A ogni modifica sostanziale si aumenta la versione e si aggiunge una riga allo storico.

## Identificatori

Gli ID non si riusano e non si rinumerano: se un elemento viene eliminato, il suo ID resta libero.

| Elemento | Formato | Esempio | Definito in |
|---|---|---|---|
| Problema | `Pn` | P3 | Fase 1 §1.2 |
| Bisogno | `Bn` | B5 | Fase 1 §4.1 |
| Requisito funzionale | `RF-nn` | RF-14 | Fase 2 §2 |
| Requisito non funzionale | `RNF-<area>nn` (U usabilità, P prestazioni, S sicurezza, PO portabilità, V vincoli) | RNF-S02 | Fase 2 §3 |
| Caso d'uso | `UC-nn` | UC-04 | Fase 2 §4 |

Ogni requisito rimanda ai bisogni che soddisfa; la matrice di tracciabilità (Fase 2 §5) va aggiornata ogni volta che si aggiunge o si modifica un requisito o un caso d'uso.

## Git

- Prima di lavorare: `git pull --rebase`.
- Commit piccoli e con un solo scopo.
- Messaggi di commit in italiano, all'imperativo o descrittivi, con la fase se pertinente:
  `Fase 2: aggiungi caso d'uso UC-08`, `Riorganizza la cartella docs`.
- Chi usa strumenti di AI lo indica nel proprio libretto delle attività.

## Libretto delle attività

Ogni membro aggiorna il proprio libretto in `docs/libretti/` con: data, attività, descrizione, file prodotto.
