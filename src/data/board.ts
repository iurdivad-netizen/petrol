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
 * Two invariants are visible on the board and are enforced by a test:
 *
 *  1. Cells strictly alternate teal and red, and TEAL CELLS ARE ONLY EVER
 *     3, 5 or 7 — the three purchase spaces (sea licence, land licence,
 *     tower). Every red cell is an event or tax space.
 *  2. The red event spaces run in ASCENDING ORDER around the track: 2, 4, 6,
 *     8, 9, 10, 11 along the bottom, 12..16 up the left edge, 17..20 across
 *     the top, then repeating values down the right edge.
 *
 * These make the bottom and left edges self-checking, and they are the reason
 * those two are marked verified while the top and right are not.
 */

/** Bottom edge, right-to-left from the Passagem corner. VERIFIED. */
const BOTTOM: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 3, 9, 5, 10, 7, 11, 3];
/** Left edge, bottom-to-top, interior cells only. VERIFIED. */
const LEFT: number[] = [12, 5, 13, 7, 14, 3, 15, 5, 16];
/**
 * Top edge, left-to-right from the top-left corner. PROVISIONAL.
 *
 * The corner reads as space 7 in the photograph. It also carries the gold
 * pennant that matches Passagem de Ano's, which is what the booklet means by
 * "the opposite square presenting the same design" — so the cell is space 7
 * AND *becomes* a second Passagem de Ano when that option is enabled. The
 * engine models the second payout as a property of the index, not of the
 * space number, so both readings hold at once.
 */
const TOP: number[] = [7, 17, 3, 18, 5, 19, 7, 20, 3, 6, 5, 9, 7, 12, 3];
/** Right edge, top-to-bottom, interior cells only. PROVISIONAL. */
const RIGHT: number[] = [8, 5, 17, 7, 19, 3, 20, 5, 4];

function buildTrack(): TrackCell[] {
  const cells: TrackCell[] = [];
  const push2 = (space: number, edge: TrackCell['edge'], corner: boolean, verified: boolean) =>
    cells.push({ index: cells.length, space, edge, corner, verified });

  BOTTOM.forEach((s, i) => push2(s, 'bottom', i === 0 || i === BOTTOM.length - 1, true));
  LEFT.forEach((s) => push2(s, 'left', false, true));
  TOP.forEach((s, i) => push2(s, 'top', i === 0 || i === TOP.length - 1, false));
  RIGHT.forEach((s) => push2(s, 'right', false, false));
  return cells;
}

export const TRACK: { verified: boolean; width: number; height: number; cells: TrackCell[] } = {
  verified: false,
  width: WIDTH,
  height: HEIGHT,
  cells: buildTrack(),
};

/**
 * Map geography — the grid of prospecting squares.
 *
 * ALSO PROVISIONAL. The photograph shows a grid ruled over an illustrated
 * coastline: ochre highlands and plain to the north and east, sea to the
 * south-west, with a porto (pier and moored tankers) centre-left and a zona
 * industrial (refinery, tank farm, roads) on land to the north-east. The exact
 * row/column count and the land/sea boundary could not be resolved.
 *
 * Site count is deliberately generous rather than guessed tight: the booklet
 * caps real scarcity through the component supply (28 towers, 36 reservoirs),
 * not through the number of squares.
 */
const MAP_COLUMNS = 11;
const MAP_ROWS = 8;

/**
 * Coastline approximated from the photograph: a headland runs from the upper
 * left down to the centre, open sea fills the lower left and centre-bottom,
 * and land returns along the top and right. Provisional.
 */
function terrainFor(col: number, row: number): Terrain {
  if (row >= 5) return col >= 9 ? 'land' : 'sea';
  if (row >= 3) return col <= 1 || (col >= 2 && col <= 6 && row >= 4) ? 'sea' : 'land';
  return col === 0 && row >= 2 ? 'sea' : 'land';
}

export interface MapSquare {
  id: string;
  col: number;
  row: number;
  terrain: Terrain;
}

export const MAP: { verified: boolean; columns: number; rows: number; squares: MapSquare[] } = {
  verified: false,
  columns: MAP_COLUMNS,
  rows: MAP_ROWS,
  squares: Array.from({ length: MAP_COLUMNS * MAP_ROWS }, (_, n) => {
    const col = n % MAP_COLUMNS;
    const row = Math.floor(n / MAP_COLUMNS);
    return { id: `s${col}-${row}`, col, row, terrain: terrainFor(col, row) };
  }),
};

/**
 * Per-card move values are likewise unread (RULES.md §12) — they are printed on
 * the cards, not listed in the booklet. Until card photographs settle it, move
 * values are assigned from this cycle in deck order, which keeps totals stable
 * and the game deterministic without pretending to be authentic.
 */
export const PROVISIONAL_MOVE_VALUES: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
