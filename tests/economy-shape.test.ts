/**
 * Economic sanity. Not rules fidelity — these assert that the reconstructed
 * economy actually functions over a full game: money circulates, companies
 * develop, and nobody ends where they started.
 */
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/engine/setup';
import { scoreboard } from '../src/engine/scoring';
import { STARTING_CAPITAL } from '../src/data/rules';
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
