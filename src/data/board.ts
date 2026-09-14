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
 * Per-card move values. Still provisional (RULES.md §12) — they are printed on
 * the cards, not listed in the booklet.
 *
 * A photograph of one real card settles the card's anatomy and gives a single
 * confirmed value: a "COMPRE UM CAMIÃO CISTERNA" card carries 7, shown both on
 * the edge tab beside the type name and as "AVANCE (7) CASAS". So the tab
 * number and the move value are the same number, and movement is always
 * forward — the booklet's "sempre na direcção da seta" rules out any
 * move-backwards card.
 *
 * Until a full set of card photographs is available, values are assigned from
 * this cycle in deck order: deterministic and stable, without pretending to be
 * authentic.
 */
export const PROVISIONAL_MOVE_VALUES: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** The one move value confirmed from a photograph of a real card. */
export const CONFIRMED_CARD_MOVES: ReadonlyArray<{ type: string; move: number }> = [
  { type: 'camiaoCisterna', move: 7 },
];
