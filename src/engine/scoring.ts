/**
 * End-of-game scoring (RULES.md §11).
 *
 * Assets count at their fixed purchase price. Licences are worth nothing.
 *
 * INTERPRETATION, flagged: the booklet says a still-nationalised company
 * "só contará metade **dos seus bens**" — half its ASSETS. §11 lists the
 * winning total as "torres + reservatórios + petroleiros + camiões + cheques",
 * enumerating cheques apart from the assets, so cash is not halved; and space
 * 13 states outright that tankers are not nationalised. What remains is
 * towers, deposits and trucks, and all three are halved here.
 *
 * Two readings were weighed and rejected:
 *
 *  - Halving the company's entire final total, cash included. It changes the
 *    winner in 89 of 400 measured games, and charges nationalisation twice
 *    over, since `receiveFromBank` has already taken half of every profit the
 *    company collected (docs/BALANCE.md §3).
 *  - Halving only what carries a red marker — deposits and trucks — which is
 *    what this file did until now. It reads the marker rule of space 13 as
 *    the definition of the scoring clause rather than as its bookkeeping.
 *
 * The towers line is the one that changed, and it is worth nothing in play:
 * across 1,600 measured company-ends not one tower survived to scoring,
 * because a tower earns nothing per year and is converted into a deposit as
 * soon as a deposit card allows. It is here to make the rule right, not to
 * move a game.
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
    // Half its assets: towers, deposits and trucks. Cash and tankers stand.
    deposits = halveReceipt(deposits);
    trucks = halveReceipt(trucks);
    towers = halveReceipt(towers);
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
