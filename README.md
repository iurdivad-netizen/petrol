# PETRÓLEO (Karto, 1976) — Faithful Digital Recreation

A preservation project: a browser-playable reconstruction of **Petróleo**, the 1976
oil-industry board game by the defunct Porto publisher **Karto**.

The governing principle is fidelity, not reinterpretation:
**original rules > historical accuracy > gameplay fidelity > visual fidelity > modern convenience.**

## Current status — Phase 1 (Research), blocked

| Phase | State |
| --- | --- |
| 1. Research | **Partially complete — blocked** |
| 2. Specification | Partially drafted (`data/petroleo.rules.json`) |
| 3–8. Prototype → Deployment | Not started, and deliberately so |

### Why implementation has not started

Roughly half the implementable rule surface — **the board layout, the 60-card deck
composition, and the entire purchase price table** — could not be evidenced. The build
environment's egress policy blocks every source domain (BoardGameGeek, Ludopedia, Só Jogo,
Jogopédia, the Blogspot collector archives, the Internet Archive, and the host of a
digitised *LIVRO DE REGRAS* PDF that is almost certainly the complete rulebook). All
returned `CONNECT tunnel failed, response 403` on direct probe.

Building the board and economy now would mean **inventing them**, which is the one thing
this project forbids. Everything that *is* evidenced has been recorded instead, with the
gaps marked explicitly rather than papered over.

See **[docs/RESEARCH.md](docs/RESEARCH.md)** for the full dossier, the confidence table,
the three numeric contradictions found in the sources, and the ordered blocking list.

### What is established

- Karto, Porto, 1976; 2–6 players; ~50 minutes; ages 8+.
- Setting: *Kartolândia*, an imaginary petro-state; players run CEPSA, ESSO, GALP, MOBIL,
  SHELL or TOTAL; all business flows through the *Banco da Kartolândia*.
- **No dice, no per-player pawns.** A single shared blue marker advances around a track by
  values printed on the cards. Despite universal collector shorthand, this is *not* a
  Monopoly-style roll-and-move game — see RESEARCH.md §7.
- **Development chain (high confidence):** buy a prospecting licence → buy a tower and
  place it on the licence → replace the tower with an oil or gas reservoir → only then
  does the square earn.
- **Passagem de Ano:** when the blue marker passes or lands on the start space, the bank
  pays annual profits to *every* company at once.
- Cards are played to exercise a privilege **or sold** to a rival, who may then play it.
- Bankruptcy eliminates a player and clears their assets. The game ends when all 60 cards
  are played; the greatest total capital wins.

### What unblocks it

Any one of the following closes most of the gap:

1. The *LIVRO DE REGRAS* PDF, or a scan/photo of the original Karto rules booklet.
2. A clear photograph or scan of the board (prices are commonly printed on the board
   itself, which would close gaps #1 and #3 together).
3. Photographs of the cards.
4. Egress access to the source domains listed in `docs/RESEARCH.md` §8.

## Repository layout

```
docs/RESEARCH.md            Phase 1 dossier: evidence, confidence, contradictions, gaps
data/petroleo.rules.json    Machine-readable reconstructed ruleset (versioned).
                            `null` + confidence "unknown" means NOT EVIDENCED — the
                            engine must refuse to start rather than substitute a default.
```

## Legal

Karto is defunct and the rights status of the 1976 edition has not been researched. Game
*rules and mechanics* are not copyrightable and may be reimplemented. Original artwork and
the six company trademarks are not reusable on that basis: all artwork here will be
recreated originally in period style, and company identities are kept in data so a
trademark-free set can be substituted.
