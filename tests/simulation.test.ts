/**
 * End-to-end simulation. Drives complete games with a simple automaton to prove
 * the turn machine terminates correctly and conserves components and money.
 */
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/engine/setup';
import { applyAction } from '../src/engine/engine';
import { scoreboard } from '../src/engine/scoring';
import { COMPONENT_SUPPLY } from '../src/data/rules';
import type { GameState } from '../src/engine/types';

/**
 * Plays any legal action available, preferring to develop. Deliberately simple:
 * this exists to exercise the rules engine, not to play well.
 */
function step(s: GameState): void {
  const id = s.currentPlayer;
  const p = s.players[id]!;
  const mine = (f: (x: (typeof s.sites)[number]) => boolean) => s.sites.filter((x) => x.ownerId === id && f(x));

  switch (s.pending.kind) {
    case 'chooseSpace':
      applyAction(s, { type: 'chooseSpace', space: 14 }); // take the oil price rise
      return;
    case 'confiscateLicences': {
      const idle = mine((x) => !x.tower && !x.deposit).slice(0, s.pending.count);
      applyAction(s, { type: 'confiscate', siteIds: idle.map((x) => x.id) });
      return;
    }
    case 'surrenderTowerSite': {
      const t = mine((x) => x.tower)[0]!;
      applyAction(s, { type: 'surrenderTower', siteId: t.id });
      return;
    }
    case 'optionalBuyLicence': {
      const free = s.sites.filter((x) => x.ownerId === null && x.terrain === (s.pending as any).terrain);
      const want = (s.pending as any).mayDuplicate ? 2 : 1;
      const pick = free.slice(0, want);
      if (pick.length === 0 || !applyAction(s, { type: 'buyLicence', siteIds: pick.map((x) => x.id) }).ok) {
        applyAction(s, { type: 'declineLicence' });
      }
      return;
    }
    case 'optionalBuyTower': {
      const target = mine((x) => !x.tower && !x.deposit)[0];
      if (!target || !applyAction(s, { type: 'buyTower', siteId: target.id }).ok) {
        applyAction(s, { type: 'declineTower' });
      }
      return;
    }
    case 'placeDeposit': {
      const target = mine((x) => x.tower && !x.deposit)[0];
      if (!target || !applyAction(s, { type: 'placeDeposit', siteId: target.id, deposit: (s.pending as any).deposit }).ok) {
        applyAction(s, { type: 'skipCard' });
      }
      return;
    }
    case 'towerOrLicenceChoice': {
      const upgrade = mine((x) => !x.tower && !x.deposit)[0];
      if (upgrade && applyAction(s, { type: 'chooseTowerOrLicence', choice: 'tower', siteId: upgrade.id }).ok) return;
      const free = s.sites.filter((x) => x.ownerId === null)[0];
      if (free && applyAction(s, { type: 'chooseTowerOrLicence', choice: 'licence', siteId: free.id }).ok) return;
      applyAction(s, { type: 'skipCard' });
      return;
    }
    case 'buyTankerChoice':
      if (!applyAction(s, { type: 'buyTanker', partner: null }).ok) {
        if (!applyAction(s, { type: 'buyTanker', partner: 'bank' }).ok) {
          applyAction(s, { type: 'declineTanker' });
        }
      }
      return;
    case 'buyTruckChoice':
      if (!applyAction(s, { type: 'buyTruck' }).ok) applyAction(s, { type: 'declineTruck' });
      return;
  }

  switch (s.phase) {
    case 'draw':
      applyAction(s, { type: 'drawCard' });
      return;
    case 'playCard': {
      const card = p.hand[0];
      if (card) applyAction(s, { type: 'playCard', cardId: card.id });
      return;
    }
    case 'resolveCard':
      applyAction(s, { type: 'skipCard' });
      return;
    case 'auction':
      for (const bidder of [...s.auction!.awaiting]) applyAction(s, { type: 'passBid', playerId: bidder });
      return;
    case 'advance':
      applyAction(s, { type: 'advance' });
      return;
  }
}

function playOut(s: GameState, maxSteps = 20000): number {
  let steps = 0;
  while (s.phase !== 'gameOver' && steps < maxSteps) {
    step(s);
    steps++;
  }
  return steps;
}

describe('full game simulation', () => {
  for (const players of [2, 3, 4, 5, 6]) {
    it(`${players} players: completes, every solvent company taking exactly 10 turns`, () => {
      const s = createGame({ playerCount: players, seed: 1000 + players });
      const steps = playOut(s);
      expect(s.phase).toBe('gameOver');
      expect(steps).toBeLessThan(20000);
      for (const p of s.players) {
        if (!p.bankrupt) expect(p.turnsTaken).toBe(10);
      }
      expect(s.winnerIds).not.toBeNull();
    });
  }

  it('never leaks components: the bank plus the table always equals the original supply', () => {
    const s = createGame({ playerCount: 4, seed: 99 });
    playOut(s);
    const onBoard = { towers: 0, oil2MT: 0, oil4MT: 0, oil6MT: 0, gas: 0 };
    for (const site of s.sites) {
      if (site.tower) onBoard.towers++;
      if (site.deposit) onBoard[site.deposit]++;
    }
    expect(onBoard.towers + s.bank.towers).toBe(COMPONENT_SUPPLY.towers);
    expect(onBoard.oil6MT + s.bank.oil6MT).toBe(COMPONENT_SUPPLY.oil6MT);
    expect(onBoard.oil4MT + s.bank.oil4MT).toBe(COMPONENT_SUPPLY.oil4MT);
    expect(onBoard.oil2MT + s.bank.oil2MT).toBe(COMPONENT_SUPPLY.oil2MT);
    expect(onBoard.gas + s.bank.gas).toBe(COMPONENT_SUPPLY.gas);

    const tankers = s.vehicles.filter((v) => v.kind === 'tanker').length;
    const trucks = s.vehicles.filter((v) => v.kind === 'truck').length;
    expect(tankers + s.bank.tankers).toBe(COMPONENT_SUPPLY.tankers);
    expect(trucks + s.bank.trucks).toBe(COMPONENT_SUPPLY.trucks);
  });

  it('is fully deterministic: the same seed replays identically', () => {
    const a = createGame({ playerCount: 4, seed: 2024 });
    const b = createGame({ playerCount: 4, seed: 2024 });
    playOut(a);
    playOut(b);
    expect(scoreboard(a)).toEqual(scoreboard(b));
    expect(a.log.length).toBe(b.log.length);
  });

  it('round-trips through JSON without changing the outcome', () => {
    const a = createGame({ playerCount: 3, seed: 555 });
    for (let i = 0; i < 40; i++) step(a);
    const revived: GameState = JSON.parse(JSON.stringify(a));
    playOut(a);
    playOut(revived);
    expect(scoreboard(revived)).toEqual(scoreboard(a));
  });

  it('pays out at Passagem de Ano over a full game', () => {
    const s = createGame({ playerCount: 4, seed: 7 });
    playOut(s);
    expect(s.passagemCount).toBeGreaterThan(0);
  });
});
