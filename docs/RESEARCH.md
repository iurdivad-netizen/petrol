# PETRÓLEO (Karto, 1976) — Phase 1 Research Dossier

**Status:** Research incomplete. Implementation of the board layout, price table and card
deck is **blocked** pending primary sources (see §6).
**Compiled:** 2026-09-14
**Method:** Web search only. Every candidate source domain was unreachable from the build
environment (see §0), so all evidence below is second-hand: search-engine summaries of
pages that could not be opened and verified directly.

---

## 0. Evidence-quality warning (read this first)

This dossier was compiled under a hard constraint: the execution environment's egress
policy blocked **every** source domain. Verified by direct probe — `boardgamegeek.com`,
`ludopedia.com.br`, `sojogo.pt`, `amojogos.wordpress.com`, `joanarafael.info`,
`web.archive.org`, `*.blogspot.com`, `youtube.com` all returned `CONNECT tunnel failed,
response 403`.

Consequences, stated plainly:

1. **A full rulebook exists and is indexed, but could not be read.** A PDF titled
   *"LIVRO DE REGRAS"* (`pdb_petroleo_livroderegras_v2_digital-1.pdf`) appears
   repeatedly in results and is evidently a transcription/redesign of the Karto rules.
   This is the single highest-value source for the project and it remains unread.
2. **No component photograph or board scan was viewed.** All statements about the board
   are inferences from prose descriptions, not from imagery.
3. **Numeric values are the least trustworthy class of claim here.** Search summaries are
   machine-generated from page snippets and demonstrably garble figures — §5 documents
   three concrete internal contradictions in the numbers.
4. **Apparent corroboration is not independent corroboration.** The same handful of
   collector pages (Só Jogo, Jogopédia, Ludopedia, two Blogspot blogs) recirculate what
   is very likely one common ancestor text. Repetition across search results therefore
   raises *transcription* confidence, not *factual* confidence.

Nothing in this document was invented to fill a gap. Where evidence ran out, the entry
reads `UNKNOWN`.

---

## 1. Identification

| Field | Value | Confidence |
| --- | --- | --- |
| Title | **Petróleo** | High |
| Publisher | **Karto** (Porto, Portugal; now defunct) | High |
| Year | **1976** | High |
| Country of origin | Portugal | High |
| Players | **2–6** | Medium |
| Playing time | **~50 minutes** | Medium |
| Age | 8+ | Medium |
| Box dimensions | 33 × 46 × 5 cm | Low |
| Known editions | Only one Karto edition surfaced. A modern rulebook redesign (the
  "LIVRO DE REGRAS" PDF) appears to exist as a preservation project. | Medium |

**Do not confuse with** several similarly-named games that pollute search results and are
*different products*: *Petróleo S.A.* (Majora), *Jogo do Petróleo* (Majora),
*Petrópolis – O Banco do Petróleo*, *Banco do Petróleo* (Estrela, Brazil),
*Os Petroleiros*.

---

## 2. Theme and premise

The board depicts an imaginary country — **Kartolândia** — whose sole wealth is
petroleum. Lacking the capacity to exploit it itself, the country divided its territory
into **exploration zones on land and at sea** and licensed international oil companies to
extract the oil in exchange for payment. The state levies **taxes** and grants
**royalties** to the companies.

Each player runs one of six real-world oil companies:
**CEPSA, ESSO, GALP, MOBIL, SHELL, TOTAL.**

Currency: **Kartos**, denominated in millions, physically represented as bank cheques
drawn on the **Banco da Kartolândia**.

---

## 3. Component inventory

| Component | Qty | Confidence | Note |
| --- | --- | --- | --- |
| Game board | 1 | High | Layout unknown |
| Rules booklet | 1 | High | |
| Blue marker | 1 | High | Shared year/track marker — see §4.3 |
| Green markers | 5 | Medium | **Function unknown** |
| Red markers | 20 | Medium | **Function unknown** |
| Cards | 60 | High | Composition unknown |
| Cheques — 1 M Kartos | 40 | Low | |
| Cheques — 5 M Kartos | 40 | Low | |
| Cheques — 10 M Kartos | 20 | Low | |
| Cheques — 20 M Kartos | 80 | Low | |
| Cheques — 50 M Kartos | 60 | Low | |
| Prospecting towers (*torres de prospecção*) | 28 | High | |
| Oil tankers (*petroleiros*) | 5 | High | |
| Tank trucks (*camiões cisterna*) | 5 | High | |
| Oil reservoirs 2 MT | 9 | Medium | |
| Oil reservoirs 4 MT | 9 | Medium | |
| Oil reservoirs 6 MT | 8 | Low | May be 9 — see §5.2 |
| Gas reservoirs | 9 | Medium | |
| Exploration licences | 30 per company × 6 = 180 | Medium | |

"MT" is unexpanded in every source. Most plausibly *milhões de toneladas* (millions of
tonnes) — reservoir capacity. Treated as an opaque size label in the spec.

---

## 4. Reconstructed mechanics

### 4.1 Setup — Confidence: Medium

1. Players elect a **banker**, responsible for all Banco da Kartolândia transactions.
2. Each player takes one of the six oil companies and its licence tokens.
3. The deck is sized to the player count: **10 cards per player** (all 60 cards are used
   only in a 6-player game). *This is the arithmetic reading of the sourced statement
   "all 60 cards are only used with 6 players"; the divisor itself is inferred.*
4. Shuffle; the banker deals **4 cards to each player**. The remainder forms a face-down
   draw deck on the board.
5. The banker pays each player **200 million Kartos** in starting capital.
6. Play proceeds **clockwise**.

### 4.2 The development chain — Confidence: High

This is the most consistently and specifically attested rule in every source, and is the
mechanical heart of the game. To bring a reservoir into production, in this strict order:

1. Buy a **prospecting licence** from the bank for a board square.
2. Buy a **prospecting tower** and place it on that licence.
3. Only then may the tower be **replaced** by an oil or gas deposit.
4. Only after step 3 does the square generate profit at the year-end payout.

Corollary: towers are a transient development stage, not a permanent income asset — yet
they are counted in the final capital tally (§4.7). Both statements are sourced.

*Unknown:* what determines the **size** of the reservoir a tower is replaced by (2/4/6 MT),
or whether it may be oil vs gas by choice. This is a significant gap — it is plausibly a
random "drilling result" step, which would be the game's main luck element, but **no
source states this and it has not been assumed.**

### 4.3 Turn structure — Confidence: Medium

There are **no dice and no per-player pawns** in the component list. Movement is
card-driven and uses a **single shared blue marker** on a track around the board.

On your turn you play one card from hand. Each card carries two things:

- **a number of spaces the blue marker advances**, and
- **a privilege** — what may be bought or negotiated.

You then choose one of:

- **Use the card** to increase your own company's power (i.e. exercise the privilege), or
- **Sell the privilege** to another company that shows interest in it. The buyer then has
  the right to play that card on their own turn.

*Unknowns:* whether the marker advances on a sold card as well as a used one; whether the
sale price is free negotiation or fixed; whether hands are refilled from the deck each
turn (strongly implied by "the game is over when all 60 cards are played", but not
stated); what the board squares the blue marker lands on actually do.

### 4.4 Year-end payout (*passagem de ano*) — Confidence: Medium (mechanism) / Low (values)

Whenever the blue marker **passes or lands on** the *Passagem de Ano* space — the starting
space of the track — the bank pays annual profits to **all** companies simultaneously.
This is the game's economic engine and the direct structural analogue of Monopoly's
"pass GO", except that it pays *every* player at once rather than only the mover.

Sourced payout values — **treat as unreliable**:

| Asset | Payout / year | Confidence |
| --- | --- | --- |
| Oil deposit 6 MT | 20 M Kartos | Low |
| Oil deposit 4 MT | **UNKNOWN** | — |
| Oil deposit 2 MT | **UNKNOWN** | — |
| Gas reservoir | 12 M Kartos | Low |
| Tank truck | 5 M Kartos | Low |
| Oil tanker | 100 M Kartos | **Very low — see §5.1** |
| Prospecting tower | 0 (explicitly non-productive) | Medium |

### 4.5 Taxes and royalties — Confidence: Low

The state "charges various taxes and grants royalties to the various oil companies."
No rates, triggers or spaces were recoverable. **UNKNOWN.**

### 4.6 Bankruptcy — Confidence: Medium

A player who runs out of money must leave the game. The banker removes **all** assets
belonging to the bankrupt company from the board. No sourced mention of loans, mortgages,
or forced asset sales before elimination.

### 4.7 Game end and scoring — Confidence: Medium

Two end conditions are attested and are compatible:

- **Primary:** the game ends when all 60 cards have been played (i.e. the deck and all
  hands are exhausted).
- **Secondary:** the game ends early if only one player remains solvent.

**Winner:** the player with the greatest total capital, summing **prospecting towers +
oil and gas reservoirs + oil tankers + tank trucks + cheques in hand.** Licences are not
named in the sourced tally — whether that is deliberate or an omission is unknown.

Note the design consequence, which is the reverse of Monopoly: this is a
**capital-accumulation scoring game with elimination as a side effect**, not a
last-player-standing game.

---

## 5. Internal contradictions found in the sources

Recording these because they bound how far the numbers can be trusted.

**5.1 — Oil tanker payout of 100 M.** One summary renders the payout list as
"20 for a 6 MT deposit, 12 for each gas reservoir, 5 for each tank truck, and 1…"
(truncated), another as "…and 100 for a tanker". A tanker paying 5× a 6 MT oil field, in a
game where starting capital is 200 M, would dominate every other asset class and make the
5 tankers the only thing worth buying. Either the figure is garbled, or tankers are
correspondingly expensive, or they are gated behind something. **Flagged as the single
most suspicious number in this dossier.** Do not implement it without verification.

**5.2 — Reservoir counts.** Itemised as 9 × 2 MT + 9 × 4 MT + 8 × 6 MT = 26 oil, plus
9 gas = 35 pieces. But a separate summary states "36 oil and gas reservoirs of varying
sizes". A 9/9/9 split would give exactly 36. The "8" is probably a transcription error.

**5.3 — Cheque total.** One summary states "bank checks totaling 210 million kartos". The
itemised denominations total **5,040 M Kartos** across **240 physical cheques**. "210" is
almost certainly a corruption of the 240-cheque count. The itemised list is the more
credible reading, and a 5,040 M bank float is consistent with 6 players × 200 M starting
capital plus recurring payouts.

---

## 6. What is still missing (the blocking list)

Ordered by how much each blocks implementation.

| # | Missing | Blocks | Only obtainable from |
| --- | --- | --- | --- |
| 1 | **Board layout** — track length, space names, space types, the grid of land/sea exploration zones and their count | The entire board module; the blue-marker track; licensing targets | Board scan/photo, or the rulebook |
| 2 | **Card deck composition** — the 60 cards, their move values and their privileges | The turn system; the whole card module | Rulebook, or photos of the cards |
| 3 | **Price table** — cost of licence, tower, each reservoir size, tanker, truck | Every purchase action; the economy | Rulebook or board (prices are often printed on the board) |
| 4 | **Drilling resolution** — how tower → reservoir size/type is determined | The core development chain; likely the main luck element | Rulebook |
| 5 | **Function of the 5 green and 20 red markers** | Unknown subsystem, possibly significant | Rulebook or board photo |
| 6 | **Tax and royalty rules** | Named as present, entirely unspecified | Rulebook |
| 7 | **2 MT / 4 MT payouts** | Year-end income | Rulebook |
| 8 | **Card sale rules** — free negotiation vs fixed price; hand refill | Player interaction | Rulebook |

Items 1–3 alone are roughly the majority of the implementable rule surface. Reconstructing
them without evidence would be **inventing the game**, which this project explicitly
forbids.

---

## 7. Two received claims that should be resisted

**"It is based on Monopoly."** Repeated by every collector source, and misleading as a
design brief. There are no dice and no per-player pawns. Movement is a single shared
marker advanced by card values, and the "pass GO" analogue pays *all* players, not the
mover. The genuine Monopoly inheritance is thematic and economic — buy from a bank,
develop property in stages, pay taxes, eliminate on bankruptcy — not the roll-and-move
core. **Implementing this as a Monopoly clone would produce the wrong game.** The
component list is stronger evidence than the collector shorthand and should win.

**"It has affinities with King Oil."** *King Oil* (Milton Bradley, 1974) is built around a
mechanical derrick that probes hidden oil pockets under the board. Petróleo's component
list contains no such device. The affinity is thematic. **King Oil's mechanics must not be
imported as a substitute for the missing drilling rule (gap #4).**

---

## 8. Sources consulted

All reached via search-result summaries only; none could be opened directly (§0).

- [Petróleo — Ludopedia](https://ludopedia.com.br/jogo/petroleo)
- [Petróleo — Só Jogo](https://sojogo.pt/arquivo/petroleo-2/)
- [Petróleo_Karto — Jogopédia](https://amojogos.wordpress.com/2014/12/08/petroleo-karto/)
- [Petróleo - Karto — Dream With Board Games](http://dreamwithboardgames.blogspot.com/2008/12/petrleo-karto.html)
- [Petroleo - Karto — jogos de tabuleiro antigos](http://jogodetabuleiroantigos.blogspot.com/2009/01/petroleo-karto.html)
- [Petróleo — BoardGameGeek #22614](https://boardgamegeek.com/boardgame/22614/petroleo)
- [Karto — BoardGameGeek publisher #5244](https://boardgamegeek.com/boardgamepublisher/5244/karto)
- [LIVRO DE REGRAS (PDF) — the unread primary source](https://joanarafael.info/couch/uploads/file/pdb_petroleo_livroderegras_v2_digital-1.pdf)
- [Petróleo …da Karto — Pedro Nogueira Photography](https://pedronogueiraphotography.blogs.sapo.pt/petroleo-da-karto-556201)
- […da Karto — Ainda sou do tempo](http://aindasoudotempo.blogspot.com/2019/05/da-karto.html)
- [petroleo karto — OLX Portugal (listings)](https://www.olx.pt/lazer/jogos-brinquedos/q-petroleo-karto/)

---

## 9. Legal note

Karto is defunct; the rights status of the 1976 edition is unclear and has not been
researched. Game *rules and mechanics* are not protected by copyright and may be
reimplemented freely. Original *artwork*, *box art*, *card illustrations* and the
**CEPSA / ESSO / GALP / MOBIL / SHELL / TOTAL** trademarks are not reusable on that basis.

Implementation policy for this project: reproduce structure and mechanics exactly;
recreate all artwork originally in period style; keep company identities configurable in
data so the shipped build can use the historical six for fidelity while allowing a
trademark-free set to be swapped in.
