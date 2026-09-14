/**
 * End-of-game scoring (RULES.md §11).
 *
 * Assets count at their fixed purchase price. Licences are worth nothing.
 *
 * INTERPRETATION, flagged: the booklet says a still-nationalised company
 * "só contará metade". Red markers are placed beside deposits and trucks only,
 * and tankers are explicitly exempt from nationalisation, so the halving is
 * applied to deposits and trucks — not to tankers, towers or cash. The
 * alternative reading (halve the company's entire final total) is a one-line
 * change in `scorePlayer`.
 */

import { PRICES } from '../data/rules';
import { depositValue, halveReceipt, tally, towerValue } from './economy';
import type { GameState, PlayerId } from './types';

export interface Score {
  playerId: PlayerId;
  company: string;
  cash: number;
  deposits: number;
  towers: number;
  vehicles: number;
  total: number;
  nationalised: boolean;
  bankrupt: boolean;
}

export function scorePlayer(state: GameState, id: PlayerId): Score {
  const p = state.players[id];
  if (!p) throw new Error(`No player ${id}`);
  const t = tally(state, id);

  let deposits =
    t.oil2MT * depositValue('oil2MT') +
    t.oil4MT * depositValue('oil4MT') +
    t.oil6MT * depositValue('oil6MT') +
    t.gas * depositValue('gas');

  let vehicleTotal =
    t.tankers * PRICES.tanker + Math.floor((t.tankerShares * PRICES.tanker) / 2);
  let trucks = t.trucks * PRICES.truck;

  // Towers count at what they cost, which depends on the terrain they stand on.
  let towers = 0;
  for (const site of state.sites) {
    if (site.ownerId === id && site.tower) towers += towerValue(site.terrain);
  }

  if (p.nationalised) {
    deposits = halveReceipt(deposits);
    trucks = halveReceipt(trucks);
  }

  const total = p.cash + deposits + towers + vehicleTotal + trucks;
  return {
    playerId: id,
    company: p.company,
    cash: p.cash,
    deposits,
    towers,
    vehicles: vehicleTotal + trucks,
    total,
    nationalised: p.nationalised,
    bankrupt: p.bankrupt,
  };
}

export function scoreboard(state: GameState): Score[] {
  return state.players
    .map((p) => scorePlayer(state, p.id))
    .sort((a, b) => b.total - a.total);
}

/** Highest total wins; ties share the win. Bankrupt companies cannot win. */
export function winners(state: GameState): PlayerId[] {
  const live = scoreboard(state).filter((s) => !s.bankrupt);
  if (live.length === 0) return [];
  const best = live[0]!.total;
  return live.filter((s) => s.total === best).map((s) => s.playerId);
}
