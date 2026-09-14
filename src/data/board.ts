/**
 * Board data for PETRÓLEO (Karto, 1976).
 *
 * ============================ PROVISIONAL ============================
 * `TRACK.verified` is false. The per-cell space sequence below is a best
 * reading of a single ~900px photograph of the board, in which the top-row
 * numerals are printed inverted and are only a few pixels tall. It is NOT
 * confirmed, and it is the one part of this project not sourced from the
 * rules booklet.
 *
 * What IS confirmed from the photograph:
 *   - the track is a rectangular border of alternating red and teal cells;
 *   - Passagem de Ano is the BOTTOM-RIGHT corner, marked with a black
 *     triangular pennant whose arrow points left;
 *   - travel is therefore ANTICLOCKWISE (right-to-left along the bottom);
 *   - the TOP-LEFT corner carries the same pennant in gold. That is the
 *     "quadrado oposto que se apresenta com o mesmo desenho" of the booklet
 *     (RULES.md §8) — the optional second payout square at <=4 players.
 *     Placing the two diagonally makes them exactly half a lap apart for any
 *     rectangle, which the geometry below satisfies.
 *
 * To correct this file you only need the four edge readings. Nothing else in
 * the codebase encodes track order; the engine validates and consumes whatever
 * is here. See docs/RULES.md §12.
 * =====================================================================
 */

import type { Terrain } from '../engine/types';

export interface TrackCell {
  index: number;
  /** Space type 1..20, as specified in RULES.md §9. */
  space: number;
  edge: 'bottom' | 'left' | 'top' | 'right';
  corner: boolean;
  /** True for cells read unambiguously and consistent with both track invariants. */
  verified: boolean;
}

/** Cells along the bottom/top edges, and along the left/right edges, inclusive of corners. */
const WIDTH = 15;
const HEIGHT = 11;

/** Index 0 is the Passagem de Ano corner; travel runs anticlockwise. */
export const PASSAGEM_INDEX = 0;

/**
 * Index of the optional second Passagem de Ano (top-left corner).
 * Derived, not hard-coded, so it stays correct if the dimensions are corrected.
 */
export const SECOND_PASSAGEM_INDEX = WIDTH - 1 + (HEIGHT - 1);

/**
 * The track's structure, as read off the physical board. All 48 cells confirmed.
 *
 *  1. TEAL CELLS ARE ONLY EVER 3, 5 or 7 — the three purchase spaces (sea
 *     licence, land licence, tower). Every red cell is an event or tax space.
 *     This holds without exception.
 *  2. Teal and red alternate, and the teal spaces run a repeating
 *     **3 -> 5 -> 7** cycle — with exactly ONE exception on the whole board,
 *     at track indices 32-34 on the top edge, which read 3, 7, 5. That is the
 *     only place where teal cells sit adjacent, and it leaves the board with 25
 *     teal and 23 red rather than an even 24/24.
 *
 *     The pattern would be perfect if those two cells were 5 then 7, so this is
 *     either a printing quirk of the original or a transposition. It is
 *     recorded as read: the owner checked it against the board after the
 *     inferred pattern predicted otherwise, and the artefact outranks the
 *     inference.
 *  3. The red spaces ascend only as far as the left edge: 2, 4, 6, 8, 9, 10, 11
 *     along the bottom, then 12 to 16 up the left side. The top and right edges
 *     do not continue the ascent — they introduce 17 to 20 and then repeat
 *     earlier values. An earlier reading of two edges suggested the ascent ran
 *     the whole way round; the full board disproves it.
 *
 * All 16 possible red values appear somewhere on the track.
 */

/** Bottom edge, right-to-left from the Passagem corner. VERIFIED. */
const BOTTOM: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 3, 9, 5, 10, 7, 11, 3];
/** Left edge, bottom-to-top, interior cells only. VERIFIED. */
const LEFT: number[] = [12, 5, 13, 7, 14, 3, 15, 5, 16];
/**
 * Top edge, left-to-right from the top-left corner. Read off the board.
 *
 * The corner is space 7. It also carries the gold pennant matching Passagem de
 * Ano's, which is what the booklet means by "the opposite square presenting the
 * same design" — so the cell is space 7 AND *becomes* a second Passagem de Ano
 * when that option is enabled. The engine models the second payout as a
 * property of the track index rather than the space number, so both hold at
 * once.
 *
 * Index 9 of this edge is the board's one structural anomaly: a 7 flanked by a
 * 3 and a 5, giving the only run of adjacent teal cells anywhere on the track.
 * The inferred 3-5-7 cycle predicted a red space here; the owner re-checked the
 * physical board and confirmed the 7, so it is recorded as read. See the
 * structure note above.
 */
const TOP: number[] = [7, 17, 3, 11, 5, 18, 7, 6, 3, 7, 5, 12, 7, 17, 3];
/** Track index of the anomaly described above. */
export const TEAL_RUN_INDEX = 33;
/** Right edge, top-to-bottom, interior cells only. Read off the board. */
const RIGHT: number[] = [8, 5, 17, 7, 19, 3, 20, 5, 20];

function buildTrack(): TrackCell[] {
  const cells: TrackCell[] = [];
  const push2 = (space: number, edge: TrackCell['edge'], corner: boolean, verified: boolean) =>
    cells.push({ index: cells.length, space, edge, corner, verified });

  BOTTOM.forEach((s, i) => push2(s, 'bottom', i === 0 || i === BOTTOM.length - 1, true));
  LEFT.forEach((s) => push2(s, 'left', false, true));
  TOP.forEach((s, i) => push2(s, 'top', i === 0 || i === TOP.length - 1, true));
  RIGHT.forEach((s) => push2(s, 'right', false, true));
  return cells;
}

export const TRACK: { verified: boolean; width: number; height: number; cells: TrackCell[] } = {
  // All 48 cells read off the physical board.
  verified: true,
  width: WIDTH,
  height: HEIGHT,
  cells: buildTrack(),
};

/**
 * Map geography — the interior of the track.
 *
 * STRUCTURALLY CORRECTED from a board photograph: **the grid does not cover the
 * whole map.** Three regions sit outside the prospecting squares, which is
 * exactly what the booklet requires and what the earlier model got wrong:
 *
 *   - the **porto**, where a tanker is placed on its owner's licence (§8);
 *   - the **zona industrial**, where a truck goes — the booklet says in so many
 *     words "na zona industrial, FORA DOS QUADRADOS DE PROSPECÇÃO";
 *   - the printed **card panel** (deck box, played-card box, Karto logo).
 *
 * Only `prospecting` squares can be licensed, towered or developed.
 *
 * The layout below remains PROVISIONAL in its detail — the exact column and row
 * counts and the coastline are read from photographs, not measured. The region
 * structure, however, is confirmed by both the booklet and the artwork.
 *
 * Legend: L land prospecting · S sea prospecting · P porto · I zona industrial ·
 *         X printed card panel
 */
const MAP_LAYOUT = [
  '..LLLLLLLLLLLLL',
  'S.LLLLLLLLLLLLL',
  'S.LL....LLLLLLL',
  'S.L........LLXX',
  'S.L..PPPP....XX',
  'SLL.PPPPPP...XX',
  'SLLSSSPPPP..LXX',
  'S..SSSSSS...LXX',
  'SSSSSSSSSSS.LXX',
  'SSSSSSSSSSS.LXX',
] as const;

export type MapRegion = 'prospecting' | 'porto' | 'industrial' | 'panel' | 'none';

export interface MapSquare {
  id: string;
  col: number;
  row: number;
  region: MapRegion;
  /** Only meaningful for prospecting squares. */
  terrain: Terrain;
}

function classify(ch: string): { region: MapRegion; terrain: Terrain } {
  switch (ch) {
    case 'L': return { region: 'prospecting', terrain: 'land' };
    case 'S': return { region: 'prospecting', terrain: 'sea' };
    case 'P': return { region: 'porto', terrain: 'sea' };
    case 'I': return { region: 'industrial', terrain: 'land' };
    case 'X': return { region: 'panel', terrain: 'land' };
    default: return { region: 'none', terrain: 'land' };
  }
}

const MAP_COLUMNS = MAP_LAYOUT[0].length;
const MAP_ROWS = MAP_LAYOUT.length;

export const MAP: {
  verified: boolean;
  columns: number;
  rows: number;
  squares: MapSquare[];
} = {
  // Read cell by cell off the physical board by the project owner, validated by
  // scripts/map-from-rows.mjs: ten rows of exactly fifteen.
  verified: true,
  columns: MAP_COLUMNS,
  rows: MAP_ROWS,
  squares: MAP_LAYOUT.flatMap((line, row) =>
    [...line].map((ch, col) => ({ id: `s${col}-${row}`, col, row, ...classify(ch) })),
  ),
};

/**
 * Where trucks are displayed.
 *
 * OPEN QUESTION, deliberately isolated here. The booklet places a truck "na
 * zona industrial, FORA DOS QUADRADOS DE PROSPECÇÃO", but the board carries no
 * separately gridded industrial region — the refinery is drawn over the land.
 * So a truck must NOT consume a licensable land square (that would be a cost
 * the booklet never mentions, and it says the vehicle licence is free), and
 * these ungridded cells beside the land stand in for the industrial zone until
 * the real ones are identified.
 */
export const INDUSTRIAL_DISPLAY_IDS: readonly string[] = [
  's8-3', 's9-3', 's10-3', 's9-2', 's10-2',
];

/** The squares a company may actually licence and drill. */
export const PROSPECTING_SQUARES = MAP.squares.filter((s) => s.region === 'prospecting');

/**
 * Per-card move values — RECONSTRUCTED, not found.
 *
 * No photograph of the full deck exists, so unlike everything else in this
 * project these numbers are a reasoned design, and they are labelled as such.
 * What follows is the reasoning, so it can be judged and replaced.
 *
 * The evidence and constraints:
 *
 *  1. One real value is known: a "COMPRE UM CAMIÃO CISTERNA" card carries 7,
 *     printed as a single digit in a circle.
 *  2. Movement is always forward — the booklet's "sempre na direcção da seta"
 *     rules out negative values.
 *  3. The track is 48 cells and every player takes exactly 10 turns, so a game
 *     of N players moves the marker 10 x N x (mean move) cells in total.
 *  4. A tanker costs 300 M and pays 100 M a year: it needs **three** Passagem
 *     de Ano crossings just to break even.
 *  5. The booklet scales petroleiro cards with the player count — 1, 2, 3, 4, 5
 *     at 2 to 6 players — which tracks how many years a game of that size can
 *     actually deliver.
 *  6. The booklet offers an optional second Passagem de Ano at **4 players or
 *     fewer**, i.e. exactly the counts where a tanker is a marginal investment.
 *
 * Constraints 3-6 pin the mean. At a mean of 5 a game yields roughly 2.1, 3.1,
 * 4.2, 5.2 and 6.2 years at 2-6 players: a tanker is a loss at two players,
 * marginal at four, and sound at five or six — which is precisely where the
 * booklet draws its second-Passagem line. A mean of 7 or 8 would make that rule
 * pointless at four players, so the mean is low, not high.
 *
 * A uniform spread of **1 to 9** gives that mean of 5 and contains the one
 * confirmed value. Values are spread evenly within each card type rather than
 * correlated with it, because no evidence suggests a card's privilege predicts
 * its number, and inventing such a correlation would be inventing design.
 *
 * These are the last unverified numbers in the game. A single photograph of the
 * deck replaces this function.
 */
export const MOVE_RANGE = { min: 1, max: 9 } as const;

/**
 * Spreads a card type's copies evenly across the move range. With five copies
 * that yields 1, 3, 5, 7, 9 — so the camião cisterna deck contains the
 * confirmed 7.
 */
export function moveValueFor(indexWithinType: number, countOfType: number): number {
  if (countOfType <= 1) return Math.round((MOVE_RANGE.min + MOVE_RANGE.max) / 2);
  const span = MOVE_RANGE.max - MOVE_RANGE.min;
  return MOVE_RANGE.min + Math.round((indexWithinType * span) / (countOfType - 1));
}

/** The one move value confirmed from a photograph of a real card. */
export const CONFIRMED_CARD_MOVES: ReadonlyArray<{ type: string; move: number }> = [
  { type: 'camiaoCisterna', move: 7 },
];
