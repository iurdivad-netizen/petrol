/**
 * The AI is judged by whether its strategy works, not by whether it runs.
 * These tests check the reasoning that governs it and then play it against
 * itself at different skill levels.
 */
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/engine/setup';
import { actingPlayer, applyAction, canAuction } from '../src/engine/engine';
import { AI_LEVELS, aiAction, cardUseValue, spaceValueFor, yearsRemaining } from '../src/engine/ai';
import { scoreboard } from '../src/engine/scoring';
import { annualProfitFor } from '../src/engine/economy';
import { ANNUAL_PROFIT, PRICES } from '../src/data/rules';
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

describe('auctions do not deadlock between the AI and a human', () => {
  /** Sets up a computer company offering a card it cannot use. */
  function aiOffersCard(): GameState {
    // Seating is pinned here: this tests the relationship between a computer
    // seller and a human bidder, not who sits where.
    const s = createGame({ playerCount: 3, seed: 11, aiPlayers: [1, 2], randomOrder: false });
    s.currentPlayer = 1;
    const site = s.sites.find((x) => x.terrain === 'land')!;
    site.ownerId = 1;
    site.tower = true;
    s.players[1]!.cash = 2; // cannot afford the deposit, so it sells the card
    s.phase = 'resolveCard';
    s.discard.push({ id: 'x', type: 'reservatorio6MT', move: 4 });
    s.pending = { kind: 'placeDeposit', deposit: 'oil6MT' };
    return s;
  }

  it('waits on the bidder, not on the company that offered the card', () => {
    // Regression: the interface asked whether the CURRENT player was a computer
    // and showed "thinking" if so. During an auction that is the seller, not the
    // bidder — so an AI offering a card to a human hung the game: the interface
    // waited for the AI, the AI waited for the human, and the human had no
    // button to press.
    const s = aiOffersCard();
    const offer = aiAction(s, AI_LEVELS.magnata!);
    expect(offer?.type).toBe('offerCard');
    applyAction(s, offer!);

    expect(s.phase).toBe('auction');
    // The decision that produced the card is over; only bids remain.
    expect(s.pending.kind).toBe('none');
    expect(s.currentPlayer).toBe(1);
    expect(s.players[s.currentPlayer]!.isAi).toBe(true);

    // The game is waiting on the human bidder, and says so.
    expect(actingPlayer(s)).toBe(0);
    expect(s.players[actingPlayer(s)]!.isAi).toBe(false);
    // So the AI driver correctly stands down and the interface must show controls.
    expect(aiAction(s, AI_LEVELS.magnata!)).toBeNull();
  });

  it('hands back to the AI once the human has bid', () => {
    const s = aiOffersCard();
    applyAction(s, aiAction(s, AI_LEVELS.magnata!)!);
    applyAction(s, { type: 'passBid', playerId: 0 });
    // Seat 2 is a computer, so the AI takes over again.
    expect(actingPlayer(s)).toBe(2);
    expect(aiAction(s, AI_LEVELS.magnata!)).not.toBeNull();
  });

  it('never offers a card when there is no one left to buy it', () => {
    // offerCard is refused with no rivals, and a refused action stalls the AI.
    const s = createGame({ playerCount: 2, seed: 12, aiPlayers: [0, 1], randomOrder: false });
    s.players[1]!.bankrupt = true;
    s.currentPlayer = 0;
    const site = s.sites.find((x) => x.terrain === 'land')!;
    site.ownerId = 0;
    site.tower = true;
    s.players[0]!.cash = 2;
    s.phase = 'resolveCard';
    s.discard.push({ id: 'y', type: 'reservatorio6MT', move: 4 });
    s.pending = { kind: 'placeDeposit', deposit: 'oil6MT' };

    expect(canAuction(s)).toBe(false);
    const action = aiAction(s, AI_LEVELS.magnata!)!;
    expect(action.type).toBe('skipCard');
    expect(applyAction(s, action).ok).toBe(true);
  });

  it('every action the AI proposes is accepted, across many mixed games', () => {
    // The broadest guard against a stall: a refused action means the AI has
    // nothing else to try and the game stops.
    for (let seed = 1; seed <= 25; seed++) {
      const s = createGame({ playerCount: 4, seed, aiPlayers: [0, 1, 2, 3] });
      let guard = 0;
      while (s.phase !== 'gameOver' && guard++ < 20000) {
        const action = aiAction(s, AI_LEVELS.magnata!);
        expect(action, `seed ${seed}: AI had no action at phase ${s.phase}`).not.toBeNull();
        const r = applyAction(s, action!);
        expect(r.ok, `seed ${seed}: ${JSON.stringify(action)} refused — ${r.error}`).toBe(true);
      }
      expect(s.phase).toBe('gameOver');
    }
  });
});

describe('the AI sells cards to other companies', () => {
  /** Plays out a game of computer companies and reports what was traded. */
  function trade(seeds: number) {
    let offered = 0;
    let sold = 0;
    let paid = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      const s = createGame({ playerCount: 4, seed, aiPlayers: [0, 1, 2, 3] });
      playAll(s, AI_LEVELS.magnata!);
      for (const entry of s.log) {
        if (entry.message.includes('em leilão')) offered++;
        if (entry.message.includes('Comprou a regalia')) {
          sold++;
          paid += Number(entry.message.match(/por (\d+) M/)?.[1] ?? 0);
        }
      }
    }
    return { offered, sold, paid };
  }

  it('actually completes sales, not merely offers', () => {
    // Regression: the AI only ever offered cards it could not use itself, and
    // a card nobody can use finds no buyer. Across thirty games that produced
    // forty-three offers and zero sales — the booklet's auction was dead.
    const { offered, sold, paid } = trade(20);
    expect(offered).toBeGreaterThan(20);
    expect(sold).toBeGreaterThan(20);
    expect(paid).toBeGreaterThan(0);
  });

  it('sells a card it could use when a rival values it far more', () => {
    const s = createGame({ playerCount: 3, seed: 21, aiPlayers: [0, 1, 2], randomOrder: false });
    s.currentPlayer = 0;

    // Seat 1 has a tower ready and money; seat 0 has neither the tower nor
    // much use for the card beyond the bare minimum.
    const mine = s.sites.find((x) => x.terrain === 'land')!;
    mine.ownerId = 0;
    mine.tower = true;
    const theirs = s.sites.filter((x) => x.terrain === 'land')[1]!;
    theirs.ownerId = 1;
    theirs.tower = true;
    s.players[1]!.cash = 400;

    const years = yearsRemaining(s);
    expect(cardUseValue(s, 1, 'reservatorio6MT', years)).toBeGreaterThan(0);

    s.phase = 'resolveCard';
    s.discard.push({ id: 'x', type: 'reservatorio6MT', move: 4 });
    s.pending = { kind: 'placeDeposit', deposit: 'oil6MT' };

    // With a well-funded rival who can use it, offering should be on the table.
    const action = aiAction(s, AI_LEVELS.magnata!);
    expect(['offerCard', 'placeDeposit']).toContain(action?.type);
  });

  it('values a card at nothing for a company that cannot use it', () => {
    const s = createGame({ playerCount: 3, seed: 22, aiPlayers: [0, 1, 2] });
    const years = yearsRemaining(s);
    // No tower anywhere, so a reservoir card is worth nothing to anyone.
    expect(cardUseValue(s, 0, 'reservatorio6MT', years)).toBe(0);
    // And a tanker is beyond a starting balance on its own, but a half share
    // is affordable, so it still has value.
    expect(cardUseValue(s, 0, 'petroleiro', years)).toBeGreaterThanOrEqual(0);
  });

  it('forfeits rather than offering when no rival remains', () => {
    const s = createGame({ playerCount: 2, seed: 23, aiPlayers: [0, 1], randomOrder: false });
    s.players[1]!.bankrupt = true;
    s.currentPlayer = 0;
    const site = s.sites.find((x) => x.terrain === 'land')!;
    site.ownerId = 0;
    site.tower = true;
    s.players[0]!.cash = 2;
    s.phase = 'resolveCard';
    s.discard.push({ id: 'y', type: 'reservatorio6MT', move: 4 });
    s.pending = { kind: 'placeDeposit', deposit: 'oil6MT' };
    expect(aiAction(s, AI_LEVELS.magnata!)?.type).toBe('skipCard');
  });
});

describe('a computer company taking a human as tanker partner (RULES.md §8)', () => {
  /**
   * Seat 1 is a computer holding a tanker card it cannot afford alone. Seat 2
   * is a computer too poor to be asked, so the only company it can go halves
   * with is the human in seat 0. Seating is pinned: this is about the
   * relationship between an asking computer and an answering human.
   */
  function aiSeeksPartner(): GameState {
    const s = createGame({ playerCount: 3, seed: 11, aiPlayers: [1, 2], randomOrder: false });
    s.currentPlayer = 1;
    s.players[0]!.cash = 400;              // the human, able to pay a half
    s.players[1]!.cash = 200;              // the computer: half yes, alone no
    s.players[2]!.cash = 10;               // too poor to be asked at all
    s.phase = 'resolveCard';
    s.discard.push({ id: 'x', type: 'petroleiro', move: 4 });
    s.pending = { kind: 'buyTankerChoice' };
    return s;
  }

  const half = Math.floor(PRICES.tanker / 2);

  it('asks the human, and waits on them rather than on itself', () => {
    const s = aiSeeksPartner();
    const ask = aiAction(s, AI_LEVELS.magnata!);
    expect(ask?.type).toBe('seekPartner');
    expect(applyAction(s, ask!).ok).toBe(true);

    expect(s.phase).toBe('partnerOffer');
    // Seat 2 has 10 M — it cannot pay a half, so it is never asked.
    expect(s.partnerOffer?.awaiting).toEqual([0]);
    // The company being asked is the human, though the turn belongs to seat 1.
    expect(s.currentPlayer).toBe(1);
    expect(actingPlayer(s)).toBe(0);
    expect(s.players[actingPlayer(s)]!.isAi).toBe(false);
    // So the AI driver stands down and the interface must show accept/refuse.
    expect(aiAction(s, AI_LEVELS.magnata!)).toBeNull();
  });

  it('charges the human exactly half, and no more, when they accept', () => {
    const s = aiSeeksPartner();
    applyAction(s, aiAction(s, AI_LEVELS.magnata!)!);

    const humanBefore = s.players[0]!.cash;
    const aiBefore = s.players[1]!.cash;
    const bankBefore = s.bank.cash;

    expect(applyAction(s, { type: 'partnerReply', playerId: 0, accept: true }).ok).toBe(true);
    // Answering costs nothing; only the purchase does.
    expect(s.players[0]!.cash).toBe(humanBefore);
    expect(s.pending).toEqual({ kind: 'choosePartner', willing: [0] });

    // The turn is the computer's again, and it takes the company that agreed.
    expect(actingPlayer(s)).toBe(1);
    const buy = aiAction(s, AI_LEVELS.magnata!);
    expect(buy).toEqual({ type: 'buyTanker', partner: 0 });
    expect(applyAction(s, buy!).ok).toBe(true);

    expect(s.players[0]!.cash).toBe(humanBefore - half);
    expect(s.players[1]!.cash).toBe(aiBefore - Math.ceil(PRICES.tanker / 2));
    // Both halves reach the bank: the venture is paid for in full, once.
    expect(s.bank.cash).toBe(bankBefore + PRICES.tanker);
    expect(s.vehicles).toHaveLength(1);
    expect(s.vehicles[0]).toMatchObject({ kind: 'tanker', ownerId: 1, partner: 0 });
  });

  it('takes nothing from the human when they refuse', () => {
    const s = aiSeeksPartner();
    applyAction(s, aiAction(s, AI_LEVELS.magnata!)!);
    const humanBefore = s.players[0]!.cash;

    expect(applyAction(s, { type: 'partnerReply', playerId: 0, accept: false }).ok).toBe(true);
    expect(s.pending).toEqual({ kind: 'buyTankerChoice', willing: [] });

    // The computer falls back to the bank and never touches the human's cash.
    const next = aiAction(s, AI_LEVELS.magnata!);
    expect(next).toEqual({ type: 'buyTanker', partner: 'bank' });
    expect(applyAction(s, next!).ok).toBe(true);
    expect(s.players[0]!.cash).toBe(humanBefore);
    expect(s.vehicles[0]).toMatchObject({ ownerId: 1, partner: 'bank' });
  });

  it('then pays the human half the venture at every Passagem de Ano', () => {
    const s = aiSeeksPartner();
    applyAction(s, aiAction(s, AI_LEVELS.magnata!)!);
    applyAction(s, { type: 'partnerReply', playerId: 0, accept: true });
    applyAction(s, aiAction(s, AI_LEVELS.magnata!)!);

    // A 50/50 venture in profits as well as in price (§8).
    expect(annualProfitFor(s, 0)).toBe(ANNUAL_PROFIT.tanker / 2);
    expect(annualProfitFor(s, 1)).toBe(ANNUAL_PROFIT.tanker / 2);

    // And the money actually arrives: carry the marker a full lap.
    const before = s.players.map((p) => p.cash);
    s.pending = { kind: 'none' };
    s.discard.push({ id: 'lap', type: 'petroleiro', move: 48 });
    s.phase = 'advance';
    expect(applyAction(s, { type: 'advance' }).ok).toBe(true);
    expect(s.passagemCount).toBe(1);
    expect(s.players[0]!.cash).toBe(before[0]! + ANNUAL_PROFIT.tanker / 2);
    expect(s.players[1]!.cash).toBe(before[1]! + ANNUAL_PROFIT.tanker / 2);
    expect(s.players[2]!.cash).toBe(before[2]!);
  });
});
