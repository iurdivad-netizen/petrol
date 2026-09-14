/**
 * Economic sanity. Not rules fidelity — these assert that the reconstructed
 * economy actually functions over a full game: money circulates, companies
 * develop, and nobody ends where they started.
 */
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/engine/setup';
import { scoreboard } from '../src/engine/scoring';
import { STARTING_CAPITAL } from '../src/data/rules';
import { fullDeck } from '../src/engine/setup';
import { buildDeck } from '../src/engine/setup';
import { MOVE_RANGE } from '../src/data/board';
import type { GameState } from '../src/engine/types';

import { drive } from './driver';

describe('economic shape over a full game', () => {
  it('companies develop assets and end away from their starting capital', () => {
    const results: number[] = [];
    let developed = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const s = createGame({ playerCount: 4, seed });
      drive(s);
      const board = scoreboard(s);
      results.push(board[0]!.total);
      developed += s.sites.filter((x) => x.deposit !== null).length;
      expect(s.phase).toBe('gameOver');
    }
    // Deposits do get built across 25 games.
    expect(developed).toBeGreaterThan(0);
    // Winners are not simply sitting on the starting 200 M.
    const distinct = new Set(results);
    expect(distinct.size).toBeGreaterThan(1);
    expect(Math.max(...results)).toBeGreaterThan(STARTING_CAPITAL);
  });

  it('the marker completes several years in a typical game', () => {
    const s = createGame({ playerCount: 4, seed: 3 });
    drive(s);
    expect(s.passagemCount).toBeGreaterThanOrEqual(1);
    expect(s.passagemCount).toBeLessThan(40);
  });
});

describe('reconstructed move values (src/data/board.ts)', () => {
  it('keeps every value inside the derived range and always moves forward', () => {
    for (const card of fullDeck()) {
      expect(card.move).toBeGreaterThanOrEqual(MOVE_RANGE.min);
      expect(card.move).toBeLessThanOrEqual(MOVE_RANGE.max);
    }
  });

  it('contains the one move value confirmed from a photographed card', () => {
    const camioes = fullDeck().filter((c) => c.type === 'camiaoCisterna');
    expect(camioes.map((c) => c.move)).toContain(7);
  });

  it('holds the mean steady as the deck is trimmed to the player count', () => {
    // Regression: trimming by prefix kept only the lowest-numbered cards, which
    // at two players left a mean move of ~2. The marker never completed a lap
    // and no company was ever paid.
    for (const n of [2, 3, 4, 5, 6]) {
      const deck = buildDeck(n);
      const mean = deck.reduce((a, c) => a + c.move, 0) / deck.length;
      expect(mean, `${n} players`).toBeGreaterThan(4);
      expect(mean, `${n} players`).toBeLessThan(6);
    }
  });

  it('yields the years per game the reconstruction was derived to produce', () => {
    // The move values were chosen so a tanker (300 M, 100 M/year, three years to
    // break even) is a loss at two players, marginal at four and sound at six —
    // which is where the booklet draws its optional second Passagem de Ano.
    const expected: Record<number, [number, number]> = {
      2: [1, 3],
      3: [2, 4],
      4: [3, 5],
      5: [4, 6],
      6: [5, 7],
    };
    for (const [nStr, [lo, hi]] of Object.entries(expected)) {
      const n = Number(nStr);
      let total = 0;
      const runs = 12;
      for (let seed = 1; seed <= runs; seed++) {
        const s = createGame({ playerCount: n, seed });
        drive(s);
        total += s.passagemCount;
      }
      const mean = total / runs;
      expect(mean, `${n} players: ${mean.toFixed(1)} years`).toBeGreaterThanOrEqual(lo);
      expect(mean, `${n} players: ${mean.toFixed(1)} years`).toBeLessThanOrEqual(hi);
    }
  });

  it('makes the optional second Passagem de Ano matter at small player counts', () => {
    // The booklet allows it at four players or fewer; it should visibly raise
    // the capital in play, or the rule would be pointless.
    const capital = (second: boolean) => {
      let total = 0;
      for (let seed = 1; seed <= 12; seed++) {
        const s = createGame({ playerCount: 3, seed, secondPassagem: second });
        drive(s);
        total += scoreboard(s)[0]!.total;
      }
      return total / 12;
    };
    expect(capital(true)).toBeGreaterThan(capital(false));
  });
});
