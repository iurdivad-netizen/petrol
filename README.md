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
| 3. Prototype | **Complete** |
| 4. Full rules | **Complete** — every booklet rule implemented |
| 5. Visual refinement | Period palette and structure in place |
| 6. Testing | **Complete** — 48 tests, full-game simulation at 2–6 players |
| 7. Polish | Save/load, debug mode, event log done |
| 8. Deployment | GitHub Pages workflow in place |

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

1. **Track layout** — resolved: a 15 × 11 border of 48 cells, travelled
   anticlockwise, all 48 confirmed against the physical board.
2. ~~**Map geography**~~ — **resolved.** 10 × 15 = 150 cells: 85 prospecting
   (47 land, 38 sea), 14 porto, 14 card panel, 37 plain illustration where the
   grid simply stops.
3. **Per-card move values** — reconstructed rather than found, and the only
   designed numbers in the game. Derived from the booklet's own economics: see
   `docs/RULES.md` §12.

A legible board scan closes 1 and 2; card photographs close 3.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 48 tests
npm run typecheck
npm run build      # static bundle in dist/
npm run preview    # serve the built bundle
```

Requires Node 22+. The build is a static bundle with no server, deployable to
GitHub Pages or any static host — `vite.config.ts` sets `base: ''` so it works
from a project subpath. `.github/workflows/deploy.yml` publishes `main` to Pages
after the tests pass.

Append `?debug` to the URL for the development panel: grant cash, nationalise or
free a company, jump the marker to Passagem de Ano, and dump state to the
console. It is hidden without the flag.

**Controls.** Click a card to play it; click map squares to choose licences,
towers and deposit sites; the action bar offers only what the rules permit at
that moment. The game saves to `localStorage` on every action and offers to
resume. Tested on current Chromium, Firefox and WebKit.

## Architecture

```
UI  →  Action  →  applyAction()  →  GameState
```

The engine is pure, has no DOM dependency, and returns `{ ok, error }` for every
action. `GameState` is plain JSON throughout — which is why save/load, replay
and the JSON round-trip test all fall out of the design rather than being built.
Randomness is a single seeded `mulberry32` whose state lives *inside*
`GameState`, so a game replays exactly and any test can pin an outcome. Nothing
outside `src/engine/rng.ts` may call `Math.random`.

```
src/engine/    types, rng, setup, economy, spaces, engine (turn machine), scoring
src/data/      rules.ts (typed booklet constants), board.ts (PROVISIONAL)
src/ui/        board-view.ts, main.ts, styles.css — rendering only, no rules
tests/         48 tests: rules fidelity, gameplay, full-game simulation, economy
docs/          RULES.md (authoritative), RESEARCH.md (dossier + scorecard)
data/          petroleo.rules.json (canonical machine-readable ruleset)
```

All board and card data is quarantined in `src/data/board.ts`. Correcting the
track means editing four arrays in that one file; the view derives its geometry
from them and the tests re-check the invariants.

## Testing

48 tests, all passing. They cover deck composition at every player count, the
price and income tables checked against the canonical JSON, the two track
invariants, the development chain and its ordering constraint, payouts to all
players, nationalisation across receipts, payments and scoring, the income-tax
cash levy, confiscation timing, bankruptcy asset return, and scoring rules.

Full games are simulated at 2–6 players, asserting that every solvent company
takes exactly 10 turns, that components are conserved (the bank plus the table
always equals the original supply), that a seed replays identically, and that a
mid-game JSON round-trip reaches the same final scoreboard.

## Known limitations

1. **The track order, map geography and per-card move values are provisional**
   (see above). Everything else comes from the booklet.
2. **Three documented interpretations**, each flagged in the code where it is
   made: whether a nationalised company's *entire* final total is halved or only
   its deposits and trucks (the latter is implemented, since red markers sit only
   on those and tankers are explicitly exempt); whether a bought card privilege
   is exercised immediately or on the buyer's next turn (the latter, per "tem
   direito a jogar novamente na sua vez", which also keeps every player at
   exactly 10 own plays); and whether flat repair costs apply without owning the
   relevant asset (charged unconditionally except where the booklet states a
   condition).
3. **No AI opponents.** Hot-seat local multiplayer only, by design — the brief
   sequences AI after a correct, tested human game. The engine is AI-ready: it
   is pure, exposes legality checks, and the test suite already contains a
   working automaton driver.
4. **Artwork is original.** Structure, palette and typography follow the 1976
   board; no scanned assets are used. Company names are data (`COMPANIES` in
   `src/data/rules.ts`) and can be swapped for a trademark-free set.

## Repository layout

```
See the architecture section above.
```

## Legal

Karto is defunct and the rights status of the 1976 edition has not been researched. Game
*rules and mechanics* are not copyrightable and may be reimplemented. Original artwork and
the six company trademarks are not reusable on that basis: all artwork here will be
recreated originally in period style, and company identities are kept in data so a
trademark-free set can be substituted.
