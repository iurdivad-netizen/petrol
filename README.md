# PETRÓLEO (Karto, 1976) — Faithful Digital Recreation

A preservation project: a browser-playable reconstruction of **Petróleo**, the 1976
oil-industry board game by the defunct Porto publisher **Karto**.

The governing principle is fidelity, not reinterpretation:
**original rules > historical accuracy > gameplay fidelity > visual fidelity > modern convenience.**

## Current status — rules complete, board layout outstanding

| Phase | State |
| --- | --- |
| 1. Research | **Complete** — original Karto rules booklet obtained and transcribed |
| 2. Specification | **Complete** for rules — `docs/RULES.md`, `data/petroleo.rules.json` |
| 3. Prototype | Next |
| 4–8. Full rules → Deployment | Not started |

The original 9-page Karto rules booklet (*"PETRÓLEO" — REGRAS*, Fábrica de Jogos Karto,
Rua Delfim Ferreira 698, Porto) has been read in full. Every rule, price, income figure,
board-space effect and the deck composition table are now verified from the primary source.
Arithmetic cross-checks pass: the deck table totals exactly 10 cards per player at every
player count, and the cheque denominations total 200 pieces / 4,540 M Kartos.

### What the game actually is

Not the Monopoly clone every collector source calls it. There are **no dice and no
per-player pawns**. One shared blue marker circles the map, advanced by a value printed on
the card each player plays — so **the space you resolve was chosen by the previous
player's card, not your own**. Every player takes exactly 10 turns; richest company wins.

The economic core is a strict development chain — buy an exploration licence, place a
prospecting tower on it, then trade the tower for an oil or gas deposit — with income paid
to *everyone* each time the marker crosses *Passagem de Ano*. Around that sit two
subsystems no secondary source had even mentioned: **nationalisation** (red markers halve
all your profits and losses until *Livre Empresa* frees you) and **tanker partnerships**
(green markers; 50/50 ventures with a rival or with the bank, dissolvable on your turn).
Cards you cannot use are **auctioned** to rivals, who then play them on their own turn.

See **[docs/RULES.md](docs/RULES.md)** for the full reconstructed ruleset.

### Still needed — the board and the cards

Three things are printed on components rather than in the booklet:

1. **Track layout** — how many physical squares surround the map, which of the 20 space
   types sits on each, and which square is opposite *Passagem de Ano* (needed for the
   second-payout rule at ≤4 players).
2. **Map geography** — the count and arrangement of land vs sea prospecting squares, and
   where the *porto* and *zona industrial* sit.
3. **Per-card move values** — the number of squares each of the 60 cards advances the
   marker.

A legible board scan closes 1 and 2; card photographs close 3.

## Repository layout

```
docs/RULES.md               Authoritative reconstructed ruleset, verified against the
                            original Karto rules booklet
docs/RESEARCH.md            Phase 1 dossier (superseded for rules; retains the
                            web-only reconstruction scorecard)
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
