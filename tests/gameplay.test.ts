/** Turn flow, the development chain, and the subsystems the booklet specifies. */
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/engine/setup';
import { applyAction } from '../src/engine/engine';
import { annualProfitFor, payBank, receiveFromBank, tally } from '../src/engine/economy';
import { scorePlayer, winners } from '../src/engine/scoring';
import { beginSpace } from '../src/engine/spaces';
import { COMPANIES, DEPOSIT_NAMES, PRICES, STARTING_CAPITAL } from '../src/data/rules';
import { truckSiteAvailable } from '../src/engine/engine';
import type { GameState } from '../src/engine/types';

function game(players = 3, seed = 42): GameState {
  return createGame({ playerCount: players, seed });
}

/** Grants a licence directly, bypassing the card/space machinery. */
function giveLicence(s: GameState, pid: number, terrain: 'land' | 'sea') {
  const site = s.sites.find((x) => x.ownerId === null && x.terrain === terrain)!;
  site.ownerId = pid;
  return site;
}

describe('setup (RULES.md §3)', () => {
  it('deals 4 cards and 200 M to each company', () => {
    const s = game(4);
    expect(s.players).toHaveLength(4);
    for (const p of s.players) {
      expect(p.hand).toHaveLength(4);
      expect(p.cash).toBe(STARTING_CAPITAL);
      expect(p.nationalised).toBe(false);
    }
    // 40 cards for 4 players, minus 16 dealt.
    expect(s.deck).toHaveLength(40 - 16);
  });

  it('starts the marker on Passagem de Ano, before any space resolution', () => {
    const s = game();
    expect(s.markerPos).toBe(0);
    expect(s.phase).toBe('draw');
    expect(s.passagemCount).toBe(0);
  });

  it('is deterministic for a given seed', () => {
    const a = game(4, 7);
    const b = game(4, 7);
    expect(a.players.map((p) => p.hand.map((c) => c.id))).toEqual(
      b.players.map((p) => p.hand.map((c) => c.id)),
    );
  });
});

describe('development chain (RULES.md §7)', () => {
  it('requires licence, then tower, then deposit — in that order', () => {
    const s = game();
    const p = s.players[0]!;
    const site = giveLicence(s, 0, 'land');

    // A deposit cannot be placed on a bare licence.
    s.phase = 'resolveCard';
    s.pending = { kind: 'placeDeposit', deposit: 'oil6MT' };
    expect(applyAction(s, { type: 'placeDeposit', siteId: site.id, deposit: 'oil6MT' }).ok).toBe(false);

    // Buy the tower.
    s.pending = { kind: 'optionalBuyTower' };
    s.phase = 'resolveSpace';
    const before = p.cash;
    expect(applyAction(s, { type: 'buyTower', siteId: site.id }).ok).toBe(true);
    expect(site.tower).toBe(true);
    expect(p.cash).toBe(before - PRICES.tower.land);

    // Now the deposit is legal, and the tower goes back to the bank.
    const towersBefore = s.bank.towers;
    s.phase = 'resolveCard';
    s.pending = { kind: 'placeDeposit', deposit: 'oil6MT' };
    expect(applyAction(s, { type: 'placeDeposit', siteId: site.id, deposit: 'oil6MT' }).ok).toBe(true);
    expect(site.tower).toBe(false);
    expect(site.deposit).toBe('oil6MT');
    expect(s.bank.towers).toBe(towersBefore + 1);
  });

  it('charges more for a sea tower than a land one, but less for a sea licence', () => {
    expect(PRICES.tower.sea).toBeGreaterThan(PRICES.tower.land);
    expect(PRICES.licence.sea).toBeLessThan(PRICES.licence.land);
  });
});

describe('annual profits (RULES.md §8)', () => {
  it('pays every company, not just the mover', () => {
    const s = game(3);
    for (const pid of [0, 1, 2]) {
      const site = giveLicence(s, pid, 'land');
      site.deposit = 'oil6MT';
    }
    const before = s.players.map((p) => p.cash);
    // Play a card that carries the marker a full lap.
    s.phase = 'resolveCard';
    s.discard.push({ id: 'x', type: 'reservatorio6MT', move: 48 });
    s.pending = { kind: 'none' };
    s.phase = 'advance';
    applyAction(s, { type: 'advance' });
    s.players.forEach((p, i) => expect(p.cash).toBe(before[i]! + 20));
    expect(s.passagemCount).toBe(1);
  });

  it('pays a tanker venture half to each side', () => {
    const s = game(2);
    s.vehicles.push({ id: 't1', kind: 'tanker', siteId: null, ownerId: 0, partner: 1 });
    expect(annualProfitFor(s, 0)).toBe(50);
    expect(annualProfitFor(s, 1)).toBe(50);
  });
});

describe('nationalisation (RULES.md §9, spaces 13 and 17)', () => {
  it('halves both receipts and payments while it lasts', () => {
    const s = game(2);
    const p = s.players[0]!;
    p.nationalised = true;
    const start = p.cash;
    receiveFromBank(s, 0, 100);
    expect(p.cash).toBe(start + 50);
    payBank(s, 0, 40);
    expect(p.cash).toBe(start + 50 - 20);
  });

  it('Livre Empresa clears it', () => {
    const s = game(2);
    s.players[0]!.nationalised = true;
    s.currentPlayer = 0;
    beginSpace(s, 17);
    expect(s.players[0]!.nationalised).toBe(false);
  });

  it('halves deposits and trucks at scoring, but not tankers or cash', () => {
    const s = game(2);
    const site = giveLicence(s, 0, 'land');
    site.deposit = 'oil6MT';
    s.vehicles.push({ id: 't', kind: 'tanker', siteId: null, ownerId: 0, partner: null });
    const plain = scorePlayer(s, 0);
    s.players[0]!.nationalised = true;
    const nat = scorePlayer(s, 0);
    expect(nat.deposits).toBe(Math.floor(plain.deposits / 2));
    expect(nat.cash).toBe(plain.cash);
    // The tanker is explicitly exempt from nationalisation.
    expect(nat.vehicles).toBe(plain.vehicles);
  });
});

describe('taxes (RULES.md §9)', () => {
  it('income tax charges per asset and then 10% of remaining cash', () => {
    const s = game(2);
    s.currentPlayer = 0;
    const p = s.players[0]!;
    const site = giveLicence(s, 0, 'land');
    site.deposit = 'oil6MT'; // 3 M under income tax
    p.cash = 100;
    beginSpace(s, 8);
    // 100 - 3 = 97, then 10% of 97 rounded up = 10 -> 87
    expect(p.cash).toBe(87);
  });

  it('confiscation only bites from the third passage of the year', () => {
    const s = game(2);
    s.currentPlayer = 0;
    giveLicence(s, 0, 'land');
    giveLicence(s, 0, 'land');
    s.passagemCount = 1;
    beginSpace(s, 2);
    expect(tally(s, 0).licences).toBe(2);

    s.passagemCount = 2;
    beginSpace(s, 2);
    expect(tally(s, 0).licences).toBe(0);
  });

  it('a licence with a tower counts as in exploration and survives confiscation', () => {
    const s = game(2);
    s.currentPlayer = 0;
    const kept = giveLicence(s, 0, 'land');
    kept.tower = true;
    giveLicence(s, 0, 'land');
    s.passagemCount = 5;
    beginSpace(s, 2);
    expect(kept.ownerId).toBe(0);
    expect(tally(s, 0).licences).toBe(1);
  });
});

describe('bankruptcy and scoring (RULES.md §11)', () => {
  it('removes a failed company’s assets from the board', () => {
    const s = game(2);
    const site = giveLicence(s, 0, 'land');
    site.tower = true;
    s.vehicles.push({ id: 'tr', kind: 'truck', ownerId: 0, siteId: null, partner: null });
    s.players[0]!.cash = 1;
    const towers = s.bank.towers;

    payBank(s, 0, 500);
    expect(s.players[0]!.bankrupt).toBe(true);
    expect(site.ownerId).toBeNull();
    expect(site.tower).toBe(false);
    expect(s.bank.towers).toBe(towers + 1);
    expect(s.vehicles).toHaveLength(0);
  });

  it('licences are worth nothing at scoring', () => {
    const s = game(2);
    giveLicence(s, 0, 'land');
    giveLicence(s, 0, 'sea');
    expect(scorePlayer(s, 0).total).toBe(s.players[0]!.cash);
  });

  it('values assets at their fixed purchase price', () => {
    const s = game(2);
    const a = giveLicence(s, 0, 'land');
    a.deposit = 'oil6MT';
    const b = giveLicence(s, 0, 'sea');
    b.tower = true;
    const score = scorePlayer(s, 0);
    expect(score.deposits).toBe(PRICES.oil6MT);
    expect(score.towers).toBe(PRICES.tower.sea);
  });

  it('ends the turn cleanly when a space bankrupts the player mid-turn', () => {
    // Regression: resolving a space can bankrupt the arriving player. Their hand
    // is surrendered, so the turn must not continue on to draw and play.
    const s = game(3);
    s.currentPlayer = 0;
    s.phase = 'resolveSpace';
    s.players[0]!.cash = 1;
    const site = giveLicence(s, 0, 'land');
    site.deposit = 'oil6MT';

    beginSpace(s, 4); // Temporal — but no tanker, so nothing is owed
    s.vehicles.push({ id: 'tk', kind: 'tanker', siteId: null, ownerId: 0, partner: null });
    beginSpace(s, 4); // now a 50 M repair against 1 M of cash

    expect(s.players[0]!.bankrupt).toBe(true);
    expect(s.players[0]!.hand).toHaveLength(0);
    applyAction(s, { type: 'drawCard' });
    // The engine must not be sitting in playCard with an empty hand.
    const stuck: boolean =
      (s.phase as string) === 'playCard' && s.players[s.currentPlayer]!.hand.length === 0;
    expect(stuck).toBe(false);
  });

  it('a bankrupt company cannot win', () => {
    const s = game(2);
    s.players[0]!.bankrupt = true;
    s.players[0]!.cash = 0;
    expect(winners(s)).toEqual([1]);
  });
});

describe('trucks stand on a land square (RULES.md §8)', () => {
  it('licenses the square free and occupies it', () => {
    // Regression: trucks were drawn in a made-up "industrial" strip of five
    // cells, two of which sat on top of real prospecting squares — so only
    // three slots existed for five trucks, and two land squares silently
    // became unusable.
    const s = game(3);
    s.currentPlayer = 0;
    const spot = s.sites.find((x) => x.terrain === 'land' && x.ownerId === null)!;
    const before = s.players[0]!.cash;

    s.phase = 'resolveCard';
    s.pending = { kind: 'buyTruckChoice' };
    expect(applyAction(s, { type: 'buyTruck', siteId: spot.id }).ok).toBe(true);

    expect(spot.ownerId).toBe(0);            // licence comes with the truck
    expect(s.players[0]!.cash).toBe(before - PRICES.truck); // and costs nothing
    expect(s.vehicles.find((v) => v.kind === 'truck')?.siteId).toBe(spot.id);
  });

  it('leaves room for every truck in the box', () => {
    const s = game(3);
    const spots = s.sites.filter((x) => truckSiteAvailable(s, x, 0));
    expect(spots.length).toBeGreaterThanOrEqual(5);
  });

  it('refuses the sea, and squares already built on or occupied', () => {
    const s = game(3);
    s.currentPlayer = 0;
    const sea = s.sites.find((x) => x.terrain === 'sea')!;
    expect(truckSiteAvailable(s, sea, 0)).toBe(false);

    const towered = s.sites.find((x) => x.terrain === 'land')!;
    towered.ownerId = 0;
    towered.tower = true;
    expect(truckSiteAvailable(s, towered, 0)).toBe(false);

    const taken = s.sites.filter((x) => x.terrain === 'land' && !x.tower)[1]!;
    s.vehicles.push({ id: 't', kind: 'truck', siteId: taken.id, ownerId: 1, partner: null });
    expect(truckSiteAvailable(s, taken, 0)).toBe(false);
  });

  it('a square holding a truck is not an idle licence to confiscate', () => {
    const s = game(2);
    s.currentPlayer = 0;
    const spot = s.sites.find((x) => x.terrain === 'land' && x.ownerId === null)!;
    spot.ownerId = 0;
    s.vehicles.push({ id: 't', kind: 'truck', siteId: spot.id, ownerId: 0, partner: null });
    s.passagemCount = 5;
    beginSpace(s, 2);
    expect(spot.ownerId).toBe(0);
  });
});

describe('naming', () => {
  it('calls gas a reservatório and oil a depósito', () => {
    // Regression: gas was reported as "um depósito gas".
    expect(DEPOSIT_NAMES.gas).toBe('reservatório de gás');
    expect(DEPOSIT_NAMES.oil6MT).toContain('depósito');
    for (const kind of ['oil2MT', 'oil4MT', 'oil6MT'] as const) {
      expect(DEPOSIT_NAMES[kind]).not.toContain('reservatório');
    }
  });
});

describe('choosing a company', () => {
  it('seats the chosen company first, whichever it is', () => {
    for (const pick of COMPANIES) {
      const ordered = [pick, ...COMPANIES.filter((c) => c !== pick)];
      const s = createGame({ companies: ordered.slice(0, 4), seed: 1 });
      expect(s.players[0]!.company).toBe(pick);
      expect(new Set(s.players.map((p) => p.company)).size).toBe(4);
    }
  });
});

describe('A sua conveniência (RULES.md §9, space 20)', () => {
  it('pays every company when Passagem de Ano is the space chosen', () => {
    // Regression: the annual payout is normally triggered by the marker
    // CROSSING Passagem de Ano. Choosing it here involves no crossing, so
    // picking space 1 paid nobody and appeared to do nothing at all.
    const s = game(3);
    s.currentPlayer = 0;
    s.sites.filter((x) => x.terrain === 'land').slice(0, 3).forEach((site, i) => {
      site.ownerId = i;
      site.deposit = 'oil6MT';
    });
    const before = s.players.map((p) => p.cash);
    const marker = s.markerPos;

    s.phase = 'resolveSpace';
    beginSpace(s, 20);
    expect(s.pending.kind).toBe('chooseSpace');
    expect(applyAction(s, { type: 'chooseSpace', space: 1 }).ok).toBe(true);

    s.players.forEach((p, i) => expect(p.cash).toBe(before[i]! + 20));
    // It is a space effect, not a move: the marker stays put.
    expect(s.markerPos).toBe(marker);
  });

  it('applies any other space it is given', () => {
    const s = game(3);
    s.currentPlayer = 0;
    const site = s.sites.find((x) => x.terrain === 'land')!;
    site.ownerId = 0;
    site.deposit = 'oil6MT';
    const before = s.players[0]!.cash;

    s.phase = 'resolveSpace';
    beginSpace(s, 20);
    // 14 is the oil price rise: 12 M for a 6 M.T. deposit.
    applyAction(s, { type: 'chooseSpace', space: 14 });
    expect(s.players[0]!.cash).toBe(before + 12);
  });

  it('offers a purchase when a purchase space is chosen', () => {
    const s = game(3);
    s.currentPlayer = 0;
    s.phase = 'resolveSpace';
    beginSpace(s, 20);
    applyAction(s, { type: 'chooseSpace', space: 5 });
    expect(s.pending.kind).toBe('optionalBuyLicence');
  });
});
