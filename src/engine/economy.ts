/**
 * Money movement, asset tallies and bankruptcy.
 *
 * Two rules pervade every transaction and are applied here so no call site can
 * forget them:
 *
 *  - A nationalised company receives and pays HALF of everything, until Livre
 *    Empresa clears it (RULES.md §9, spaces 13 and 17). The booklet is explicit:
 *    "só receberá ou pagará metade do que o jogo indicar".
 *  - Rounding goes in the bank's favour (§9, space 8).
 */

import { ANNUAL_PROFIT, DEPOSIT_VALUE, PRICES } from '../data/rules';
import type { DepositKind, GameState, Player, PlayerId } from './types';

/** Rounding always favours the bank: receipts round down, payments round up. */
export function halveReceipt(amount: number): number {
  return Math.floor(amount / 2);
}
export function halvePayment(amount: number): number {
  return Math.ceil(amount / 2);
}

export function player(state: GameState, id: PlayerId): Player {
  const p = state.players[id];
  if (!p) throw new Error(`No player ${id}`);
  return p;
}

export function log(state: GameState, playerId: PlayerId | null, message: string): void {
  state.log.push({ turn: state.turnNumber, playerId, message });
}

/**
 * Moves money from a player to the bank, halving it if the company is
 * nationalised. Returns the amount actually paid. A player who cannot cover it
 * goes bankrupt (§11) — the booklet has no mortgage or forced-sale step.
 */
export function payBank(state: GameState, id: PlayerId, amount: number): number {
  const p = player(state, id);
  const due = p.nationalised ? halvePayment(amount) : amount;
  if (due <= 0) return 0;

  if (p.cash < due) {
    // Everything the company still has goes to the bank, then it folds.
    const remaining = p.cash;
    p.cash = 0;
    state.bank.cash += remaining;
    bankrupt(state, id);
    return remaining;
  }
  p.cash -= due;
  state.bank.cash += due;
  return due;
}

/** Moves money from the bank to a player, halving it if nationalised. */
export function receiveFromBank(state: GameState, id: PlayerId, amount: number): number {
  const p = player(state, id);
  const due = p.nationalised ? halveReceipt(amount) : amount;
  if (due <= 0) return 0;

  // The bank may borrow from players rather than run dry (§11). Interest is
  // paid immediately; the borrowing is otherwise not tracked as a debt.
  if (state.bank.cash < due) {
    borrowForBank(state, due - state.bank.cash);
  }
  state.bank.cash -= due;
  p.cash += due;
  return due;
}

/**
 * The bank borrows from solvent players, paying 10% interest immediately
 * (RULES.md §11). Shared proportionally to available cash.
 */
function borrowForBank(state: GameState, needed: number): void {
  const lenders = state.players.filter((p) => !p.bankrupt && p.cash > 0);
  const pool = lenders.reduce((sum, p) => sum + p.cash, 0);
  if (pool <= 0) return;

  let raised = 0;
  for (const lender of lenders) {
    const share = Math.min(lender.cash, Math.ceil((needed * lender.cash) / pool));
    if (share <= 0) continue;
    lender.cash -= share;
    // Interest is a receipt, but is NOT halved: it is a loan return, not a
    // profit of the company's operations. Documented interpretation.
    lender.cash += Math.floor(share * 0.1);
    raised += share;
  }
  state.bank.cash += raised;
  log(state, null, `Banco pediu emprestado ${raised} M aos jogadores, com 10% de juros.`);
}

export function bankrupt(state: GameState, id: PlayerId): void {
  const p = player(state, id);
  if (p.bankrupt) return;
  p.bankrupt = true;
  p.cash = 0;

  // The banker removes everything belonging to the failed company (§11).
  for (const site of state.sites) {
    if (site.ownerId !== id) continue;
    if (site.tower) state.bank.towers += 1;
    if (site.deposit) state.bank[site.deposit] += 1;
    site.ownerId = null;
    site.tower = false;
    site.deposit = null;
  }
  state.vehicles = state.vehicles.filter((v) => {
    if (v.ownerId !== id && v.partner !== id) return true;
    if (v.ownerId === id) {
      if (v.kind === 'tanker') state.bank.tankers += 1;
      else state.bank.trucks += 1;
      return false;
    }
    // The failed company was only a partner; the venture reverts to the bank.
    v.partner = 'bank';
    return true;
  });
  p.hand = [];
  // The log prefixes the company, so the message names only what happened.
  log(state, id, 'Ficou sem dinheiro e abandona o jogo.');
}

export interface AssetTally {
  oil2MT: number;
  oil4MT: number;
  oil6MT: number;
  gas: number;
  towers: number;
  trucks: number;
  tankers: number;
  /** Tankers held in a 50/50 venture — counted at half throughout. */
  tankerShares: number;
  licences: number;
}

export function tally(state: GameState, id: PlayerId): AssetTally {
  const t: AssetTally = {
    oil2MT: 0, oil4MT: 0, oil6MT: 0, gas: 0,
    towers: 0, trucks: 0, tankers: 0, tankerShares: 0, licences: 0,
  };
  for (const site of state.sites) {
    if (site.ownerId !== id) continue;
    t.licences += 1;
    if (site.tower) t.towers += 1;
    if (site.deposit) t[site.deposit] += 1;
  }
  for (const v of state.vehicles) {
    if (v.kind === 'truck') {
      if (v.ownerId === id) t.trucks += 1;
      continue;
    }
    if (v.ownerId === id) {
      if (v.partner === null) t.tankers += 1;
      else t.tankerShares += 1;
    } else if (v.partner === id) {
      t.tankerShares += 1;
    }
  }
  return t;
}

/** Annual profit at Passagem de Ano, before the nationalisation halving. */
export function annualProfitFor(state: GameState, id: PlayerId): number {
  const t = tally(state, id);
  return (
    t.oil2MT * ANNUAL_PROFIT.oil2MT +
    t.oil4MT * ANNUAL_PROFIT.oil4MT +
    t.oil6MT * ANNUAL_PROFIT.oil6MT +
    t.gas * ANNUAL_PROFIT.gas +
    t.trucks * ANNUAL_PROFIT.truck +
    t.tankers * ANNUAL_PROFIT.tanker +
    // A 50/50 venture pays half to each side (§8).
    Math.floor((t.tankerShares * ANNUAL_PROFIT.tanker) / 2)
  );
}

export function towerValue(terrain: 'land' | 'sea'): number {
  return PRICES.tower[terrain];
}

export function depositValue(kind: DepositKind): number {
  return DEPOSIT_VALUE[kind];
}
