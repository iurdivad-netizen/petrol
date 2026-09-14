/** Rules fidelity: the engine's constants must match the booklet. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ANNUAL_PROFIT, BANK_STARTING_CASH, CARDS_PER_PLAYER, CHEQUES,
  DECK_COMPOSITION, PRICES, STARTING_CAPITAL, TURNS_PER_PLAYER,
} from '../src/data/rules';
import { buildDeck } from '../src/engine/setup';
import { TRACK, SECOND_PASSAGEM_INDEX, PASSAGEM_INDEX } from '../src/data/board';

const json = JSON.parse(readFileSync('data/petroleo.rules.json', 'utf8'));

describe('deck composition (RULES.md §4)', () => {
  for (const count of [2, 3, 4, 5, 6]) {
    it(`${count} players: exactly ${count * CARDS_PER_PLAYER} cards`, () => {
      const total = Object.values(DECK_COMPOSITION[count]!).reduce((a, b) => a + b, 0);
      expect(total).toBe(count * CARDS_PER_PLAYER);
      expect(buildDeck(count)).toHaveLength(count * CARDS_PER_PLAYER);
    });
    it(`${count} players: matches the canonical JSON`, () => {
      const row = json.deckComposition.byPlayerCount[String(count)];
      for (const [type, qty] of Object.entries(DECK_COMPOSITION[count]!)) {
        expect(row[type], `${type} at ${count}p`).toBe(qty);
      }
      expect(row.total).toBe(count * CARDS_PER_PLAYER);
    });
  }
});

describe('economy constants', () => {
  it('prices match the booklet and the canonical JSON', () => {
    expect(PRICES.licence.land).toBe(7);
    expect(PRICES.licence.sea).toBe(5);
    expect(PRICES.tower.land).toBe(5);
    expect(PRICES.tower.sea).toBe(12);
    expect(PRICES.tanker).toBe(300);
    expect(PRICES.truck).toBe(5);
    const j = json.prices;
    expect(j.licenceLand).toBe(PRICES.licence.land);
    expect(j.licenceSea).toBe(PRICES.licence.sea);
    expect(j.towerLand).toBe(PRICES.tower.land);
    expect(j.towerSea).toBe(PRICES.tower.sea);
    expect(j.oilTanker).toBe(PRICES.tanker);
  });

  it('annual profits match the booklet', () => {
    expect(ANNUAL_PROFIT.oil6MT).toBe(20);
    expect(ANNUAL_PROFIT.oil4MT).toBe(14);
    expect(ANNUAL_PROFIT.oil2MT).toBe(10);
    expect(ANNUAL_PROFIT.gas).toBe(12);
    expect(ANNUAL_PROFIT.truck).toBe(5);
    expect(ANNUAL_PROFIT.tanker).toBe(100);
  });

  it('a tanker repays its 300 M cost in three years, a truck in one', () => {
    expect(PRICES.tanker / ANNUAL_PROFIT.tanker).toBe(3);
    expect(PRICES.truck / ANNUAL_PROFIT.truck).toBe(1);
  });

  it('cheque supply reconciles to 200 pieces and 4540 M', () => {
    expect(CHEQUES.reduce((s, c) => s + c.qty, 0)).toBe(200);
    expect(BANK_STARTING_CASH).toBe(4540);
    expect(json.components.cheques.totalPieces).toBe(200);
    expect(json.components.cheques.totalValue).toBe(4540);
  });

  it('setup constants match the booklet', () => {
    expect(STARTING_CAPITAL).toBe(200);
    expect(TURNS_PER_PLAYER).toBe(10);
  });
});

describe('track invariants (observed on the board photograph)', () => {
  it('cells strictly alternate teal and red', () => {
    const isTeal = (space: number) => [1, 3, 5, 7].includes(space);
    TRACK.cells.forEach((cell, i) => {
      const prev = TRACK.cells[(i - 1 + TRACK.cells.length) % TRACK.cells.length]!;
      expect(isTeal(cell.space), `cell ${i} (space ${cell.space})`).not.toBe(isTeal(prev.space));
    });
  });

  it('teal cells are only ever the purchase spaces 3, 5, 7 (or Passagem de Ano)', () => {
    for (const cell of TRACK.cells) {
      const teal = [1, 3, 5, 7].includes(cell.space);
      if (teal) expect([1, 3, 5, 7]).toContain(cell.space);
    }
  });

  it('red event spaces ascend around the verified bottom and left edges', () => {
    const reds = TRACK.cells
      .filter((c) => (c.edge === 'bottom' || c.edge === 'left') && ![1, 3, 5, 7].includes(c.space))
      .map((c) => c.space);
    expect(reds).toEqual([...reds].sort((a, b) => a - b));
    expect(reds).toEqual([2, 4, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  });

  it('the second Passagem de Ano sits exactly half a lap from the first', () => {
    const half = TRACK.cells.length / 2;
    expect(TRACK.cells.length % 2).toBe(0);
    expect((SECOND_PASSAGEM_INDEX - PASSAGEM_INDEX + TRACK.cells.length) % TRACK.cells.length).toBe(half);
  });

  it('every cell carries a space in 1..20', () => {
    for (const cell of TRACK.cells) {
      expect(cell.space).toBeGreaterThanOrEqual(1);
      expect(cell.space).toBeLessThanOrEqual(20);
    }
  });
});
