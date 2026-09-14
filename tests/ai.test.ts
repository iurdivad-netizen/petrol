/**
 * The AI is judged by whether its strategy works, not by whether it runs.
 * These tests check the reasoning that governs it and then play it against
 * itself at different skill levels.
 */
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/engine/setup';
import { applyAction } from '../src/engine/engine';
import { AI_LEVELS, aiAction, spaceValueFor, yearsRemaining } from '../src/engine/ai';
import { scoreboard } from '../src/engine/scoring';
import type { AiConfig } from '../src/engine/ai';
import type { GameState } from '../src/engine/types';

function playAll(s: GameState, config: AiConfig, maxSteps = 20000): GameState {
  let guard = 0;
  while (s.phase !== 'gameOver' && guard++ < maxSteps) {
    const action = aiAction(s, config);
    if (!action) break;
    const r = applyAction(s, action);
    if (!r.ok) break;
  }
  return s;
}

function allAi(players: number, seed: number): GameState {
  return createGame({
    playerCount: players,
    seed,
    aiPlayers: Array.from({ length: players }, (_, i) => i),
  });
}

describe('years remaining — the number the whole strategy hangs on', () => {
  it('falls as the game is played out', () => {
    const s = allAi(4, 5);
    const atStart = yearsRemaining(s);
    playAll(s, AI_LEVELS.magnata!);
    expect(atStart).toBeGreaterThan(1);
    expect(yearsRemaining(s)).toBeLessThan(atStart);
  });

  it('is larger with the optional second Passagem de Ano', () => {
    const plain = createGame({ playerCount: 3, seed: 1 });
    const doubled = createGame({ playerCount: 3, seed: 1, secondPassagem: true });
    expect(yearsRemaining(doubled)).toBeGreaterThan(yearsRemaining(plain));
  });
});

describe('space valuation', () => {
  it('prices nationalisation as a loss proportional to what a company earns', () => {
    const s = allAi(3, 2);
    const idle = spaceValueFor(s, 0, 13);
    const site = s.sites.find((x) => x.terrain === 'land')!;
    site.ownerId = 0;
    site.deposit = 'oil6MT';
    const producing = spaceValueFor(s, 0, 13);
    expect(idle).toBe(0);
    expect(producing).toBeLessThan(0);
  });

  it('prices the oil price rise as a gain and the fall as a loss', () => {
    const s = allAi(3, 3);
    const site = s.sites.find((x) => x.terrain === 'land')!;
    site.ownerId = 0;
    site.deposit = 'oil6MT';
    expect(spaceValueFor(s, 0, 14)).toBeGreaterThan(0);
    expect(spaceValueFor(s, 0, 19)).toBeLessThan(0);
  });

  it('charges income tax against cash as well as assets', () => {
    const s = allAi(3, 4);
    s.players[0]!.cash = 100;
    const poor = spaceValueFor(s, 0, 8);
    s.players[0]!.cash = 500;
    expect(spaceValueFor(s, 0, 8)).toBeLessThan(poor);
  });
});

describe('it plays complete, legal games', () => {
  for (const players of [2, 3, 4, 5, 6]) {
    it(`${players} AI companies finish a game`, () => {
      const s = playAll(allAi(players, 700 + players), AI_LEVELS.magnata!);
      expect(s.phase).toBe('gameOver');
      for (const p of s.players) if (!p.bankrupt) expect(p.turnsTaken).toBe(10);
      expect(s.winnerIds).not.toBeNull();
    });
  }

  it('actually develops the board rather than passing', () => {
    let deposits = 0;
    let licences = 0;
    for (let seed = 1; seed <= 15; seed++) {
      const s = playAll(allAi(4, seed), AI_LEVELS.magnata!);
      deposits += s.sites.filter((x) => x.deposit).length;
      licences += s.sites.filter((x) => x.ownerId !== null).length;
    }
    expect(deposits / 15).toBeGreaterThan(2);
    expect(licences / 15).toBeGreaterThan(4);
  });
});

describe('skill actually correlates with winning', () => {
  it('beats a weaker opponent over many games', () => {
    // Seats 0 and 2 play at full strength, 1 and 3 close to random.
    let strong = 0;
    let weak = 0;
    const games = 60;
    for (let seed = 1; seed <= games; seed++) {
      const s = allAi(4, seed);
      let guard = 0;
      while (s.phase !== 'gameOver' && guard++ < 20000) {
        const actor =
          s.phase === 'auction' && s.auction ? s.auction.awaiting[0] ?? s.currentPlayer : s.currentPlayer;
        const level = actor % 2 === 0 ? AI_LEVELS.magnata! : { skill: 0.05 };
        const action = aiAction(s, level);
        if (!action) break;
        if (!applyAction(s, action).ok) break;
      }
      const board = scoreboard(s).filter((x) => !x.bankrupt);
      strong += board.filter((x) => x.playerId % 2 === 0).reduce((a, x) => a + x.total, 0);
      weak += board.filter((x) => x.playerId % 2 === 1).reduce((a, x) => a + x.total, 0);
    }
    // A strategy that cannot out-earn near-random play is not a strategy.
    expect(strong, `strong ${strong} vs weak ${weak}`).toBeGreaterThan(weak);
  });
});
