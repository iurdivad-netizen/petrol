/**
 * Computer opponents.
 *
 * Built around the one calculation that governs Petróleo: **years remaining**.
 * Every asset in the game is priced against its annual yield, so nothing is
 * worth anything with one year left and everything is worth a great deal with
 * five. A 6 M.T. field on land costs 22 M all-in and returns 20 M a year:
 * ruinous bought in the last year, outstanding bought in the second. A tanker
 * costs 300 M against 100 M a year and breaks even at exactly three years,
 * which is also where the booklet draws its optional second Passagem de Ano.
 *
 * So this AI does not follow a script. It estimates how many more times the
 * marker will cross Passagem de Ano, values every option at income × years
 * minus cost, and takes the best one. Three further pieces of Petróleo-specific
 * judgement sit on top:
 *
 *   - **Land is cheaper to develop than sea** — 12 M of licence and tower
 *     against 17 M — despite the land licence costing more. It prefers land
 *     unless sea is all that is offered.
 *   - **The card you play chooses your successor's square, not your own.**
 *     Among cards of similar value to itself, it plays the one that lands the
 *     next company on a tax or a disaster rather than a purchase.
 *   - **Passagem de Ano pays everyone.** Crossing it is good only when the AI
 *     earns more from it than the rival it is about to hand the turn to.
 *
 * `skill` (0–1) blends the best action with a random legal one, which is how
 * difficulty is expressed rather than by writing a weaker strategy.
 */

import { PASSAGEM_INDEX, SECOND_PASSAGEM_INDEX, TRACK } from '../data/board';
import { ANNUAL_PROFIT, PRICES, SPACE_TARIFFS, SPACE_FLAT_COST } from '../data/rules';
import type { Action } from './actions';
import { actingPlayer, canAuction } from './engine';
import { annualProfitFor, tally } from './economy';
import { idleLicences, toweredSites } from './spaces';
import type { DepositKind, GameState, PlayerId, Site } from './types';

export interface AiConfig {
  /** 0 plays at random among legal moves; 1 always takes its best judgement. */
  skill: number;
}

export const AI_LEVELS: Record<string, AiConfig> = {
  aprendiz: { skill: 0.35 },
  gestor: { skill: 0.75 },
  magnata: { skill: 1 },
};

/** Mean card move; the deck is built to average this (see data/board.ts). */
const MEAN_MOVE = 5;

/**
 * How many more Passagem de Ano payouts the game will deliver. This is the
 * number every valuation below is multiplied by.
 */
export function yearsRemaining(state: GameState): number {
  const turnsLeft = state.players
    .filter((p) => !p.bankrupt)
    .reduce((sum, p) => sum + Math.max(0, state.turnsPerPlayer - p.turnsTaken), 0);

  const size = TRACK.cells.length;
  const steps = turnsLeft * MEAN_MOVE;
  // Distance still to run before the next crossing.
  const toPassagem = (PASSAGEM_INDEX - state.markerPos + size) % size || size;
  if (steps < toPassagem) return 0;

  let years = 1 + (steps - toPassagem) / size;
  // The optional opposite square pays too, so it roughly doubles the count.
  if (state.secondPassagemEnabled) years *= 2;
  return years;
}

/** Net value of owning an income asset for the rest of the game. */
function netValue(cost: number, incomePerYear: number, years: number): number {
  return incomePerYear * years - cost;
}

/** What a finished field on this terrain is worth, before knowing its size. */
function developmentUpside(terrain: 'land' | 'sea', years: number): number {
  // Reservoir cards are drawn, not chosen, so value the average of what can land.
  const avgIncome = (ANNUAL_PROFIT.oil2MT + ANNUAL_PROFIT.oil4MT + ANNUAL_PROFIT.oil6MT + ANNUAL_PROFIT.gas) / 4;
  const avgDeposit = (PRICES.oil2MT + PRICES.oil4MT + PRICES.oil6MT + PRICES.gas) / 4;
  const infrastructure = PRICES.licence[terrain] + PRICES.tower[terrain];
  return netValue(infrastructure + avgDeposit, avgIncome, years);
}

/**
 * Roughly what landing on a space is worth to a player, in millions. Positive
 * is good for them. Used both to judge the AI's own prospects and, negated, to
 * judge what it is about to hand the next company.
 */
export function spaceValueFor(state: GameState, id: PlayerId, space: number): number {
  // Adding zero normalises -0, which a negated empty tally would otherwise leak.
  return rawSpaceValue(state, id, space) + 0;
}

function rawSpaceValue(state: GameState, id: PlayerId, space: number): number {
  const p = state.players[id];
  if (!p) return 0;
  const t = tally(state, id);
  const years = yearsRemaining(state);
  const per = (table: Record<string, number>) =>
    Object.entries(table).reduce((sum, [asset, rate]) => {
      const n =
        asset === 'tower' ? t.towers
        : asset === 'truck' ? t.trucks
        : asset === 'tanker' ? t.tankers + t.tankerShares
        : (t[asset as keyof typeof t] as number) ?? 0;
      return sum + n * rate;
    }, 0);

  switch (space) {
    case 1: return annualProfitFor(state, id);
    case 2: return state.passagemCount >= 2 ? -Math.min(2, idleLicences(state, id).length) * PRICES.licence.land : 0;
    case 3: return Math.max(0, developmentUpside('sea', years)) * 0.5;
    case 5: return Math.max(0, developmentUpside('land', years)) * 0.5;
    case 7: return t.licences > t.towers ? Math.max(0, developmentUpside('land', years)) * 0.4 : 0;
    case 4: return t.tankers + t.tankerShares > 0 ? -SPACE_FLAT_COST[4]! : 0;
    case 6: return -per(SPACE_TARIFFS.oilTax);
    case 8: return -per(SPACE_TARIFFS.incomeTax) - p.cash * SPACE_TARIFFS.incomeTaxCashRate;
    case 11: return -per(SPACE_TARIFFS.gasTax);
    case 14: return per(SPACE_TARIFFS.priceRise);
    case 19: return -per(SPACE_TARIFFS.priceFall);
    // Nationalisation halves everything from here on: worth the remaining income.
    case 13: return p.nationalised ? 0 : -annualProfitFor(state, id) * years * 0.5;
    case 17: return p.nationalised ? annualProfitFor(state, id) * years * 0.5 : 0;
    case 16: return t.towers > 0 ? -(PRICES.tower.land + PRICES.licence.land) : 0;
    case 20: return 12; // free pick of the best space
    default: return -(SPACE_FLAT_COST[space] ?? 0);
  }
}

/** The company that will resolve the square this card sends the marker to. */
function nextPlayer(state: GameState): PlayerId | null {
  for (let i = 1; i <= state.players.length; i++) {
    const id = (state.currentPlayer + i) % state.players.length;
    const q = state.players[id];
    if (q && !q.bankrupt && q.turnsTaken < state.turnsPerPlayer) return id;
  }
  return null;
}

/** Best owned licence to put a tower on, and best free square to license. */
function bestFreeSite(state: GameState, terrain?: 'land' | 'sea'): Site | undefined {
  const free = state.sites.filter((s) => s.ownerId === null && (!terrain || s.terrain === terrain));
  // Land develops cheaper overall, so prefer it when the choice is open.
  return free.sort((a, b) => PRICES.tower[a.terrain] - PRICES.tower[b.terrain])[0];
}

function bestTowerSite(state: GameState, id: PlayerId): Site | undefined {
  return idleLicences(state, id).sort(
    (a, b) => PRICES.tower[a.terrain] - PRICES.tower[b.terrain],
  )[0];
}

// --------------------------------------------------------------- card choice

/** Put the card up for sale, or forfeit it when there is no one to sell to. */
function sellOrSkip(state: GameState): Action {
  return canAuction(state) ? { type: 'offerCard' } : { type: 'skipCard' };
}

interface CardChoice {
  cardId: string;
  score: number;
}

function scoreCard(state: GameState, cardMove: number, ownValue: number): number {
  const size = TRACK.cells.length;
  const landing = (state.markerPos + cardMove) % size;
  const cell = TRACK.cells[landing];
  const next = nextPlayer(state);

  let score = ownValue;

  if (cell && next !== null) {
    // What we are handing the next company, from their point of view.
    score -= spaceValueFor(state, next, cell.space) * 0.6;
  }

  // Passagem de Ano pays every company at once, so crossing it is only good
  // while the AI out-earns the rival it is handing the turn to.
  let crossings = 0;
  for (let i = 1; i <= cardMove; i++) {
    const idx = (state.markerPos + i) % size;
    if (idx === PASSAGEM_INDEX) crossings++;
    else if (state.secondPassagemEnabled && idx === SECOND_PASSAGEM_INDEX) crossings++;
  }
  if (crossings > 0) {
    const mine = annualProfitFor(state, state.currentPlayer);
    const theirs = next === null ? 0 : annualProfitFor(state, next);
    score += (mine - theirs) * crossings;
  }
  return score;
}

// ------------------------------------------------------------------ decision

/**
 * The next action for the current AI player, or for an AI awaiting an auction
 * bid. Returns null when no AI is on the clock.
 */
export function aiAction(state: GameState, config: AiConfig = AI_LEVELS.magnata!): Action | null {
  if (state.phase === 'gameOver') return null;

  // Auctions run out of turn: the game waits on the bidder, not the seller.
  const actor = state.players[actingPlayer(state)];
  if (!actor?.isAi) return null;
  if (state.phase === 'auction' && state.auction) {
    return auctionBid(state, actor.id, config);
  }

  const me = state.players[state.currentPlayer];
  if (!me?.isAi) return null;

  const years = yearsRemaining(state);
  const roll = () => Math.random() > config.skill;

  switch (state.pending.kind) {
    case 'chooseSpace': {
      // Free pick of any space: take whichever is worth most to us right now.
      const best = state.pending.options
        .map((n) => ({ n, v: spaceValueFor(state, me.id, n) }))
        .sort((a, b) => b.v - a.v)[0];
      return { type: 'chooseSpace', space: roll() ? 14 : best?.n ?? 14 };
    }

    case 'confiscateLicences': {
      // Surrender the dearest-to-develop first: sea licences cost more to tower.
      const idle = idleLicences(state, me.id)
        .sort((a, b) => PRICES.tower[b.terrain] - PRICES.tower[a.terrain])
        .slice(0, state.pending.count);
      return { type: 'confiscate', siteIds: idle.map((s) => s.id) };
    }

    case 'surrenderTowerSite': {
      const towered = state.sites.filter((s) => s.ownerId === me.id && s.tower);
      const worst = towered.sort((a, b) => PRICES.tower[a.terrain] - PRICES.tower[b.terrain])[0];
      return worst ? { type: 'surrenderTower', siteId: worst.id } : { type: 'skipCard' };
    }

    case 'optionalBuyLicence': {
      const { terrain, mayDuplicate } = state.pending;
      const upside = developmentUpside(terrain, years);
      const price = PRICES.licence[terrain];
      // A licence is only worth holding if there is time to build on it.
      if (upside <= 0 || me.cash < price * 2 || roll()) return { type: 'declineLicence' };
      const want = mayDuplicate && me.cash > price * 6 && upside > price * 3 ? 2 : 1;
      const picks: string[] = [];
      for (const s of state.sites.filter((x) => x.ownerId === null && x.terrain === terrain)) {
        if (picks.length >= want) break;
        picks.push(s.id);
      }
      return picks.length ? { type: 'buyLicence', siteIds: picks } : { type: 'declineLicence' };
    }

    case 'optionalBuyTower': {
      const site = bestTowerSite(state, me.id);
      if (!site || roll()) return { type: 'declineTower' };
      const price = PRICES.tower[site.terrain];
      if (me.cash < price * 2 || developmentUpside(site.terrain, years) <= 0) {
        return { type: 'declineTower' };
      }
      return { type: 'buyTower', siteId: site.id };
    }

    case 'placeDeposit': {
      const deposit: DepositKind = state.pending.deposit;
      const site = toweredSites(state, me.id)[0];
      if (!site) return { type: 'skipCard' };
      // A deposit that cannot pay for itself is still worth taking if it is
      // nearly free, but not if it risks the bank balance.
      const value = netValue(PRICES[deposit], ANNUAL_PROFIT[deposit], years);
      if (me.cash < PRICES[deposit] || (value < 0 && me.cash < PRICES[deposit] * 4)) {
        return sellOrSkip(state);
      }
      return { type: 'placeDeposit', siteId: site.id, deposit };
    }

    case 'towerOrLicenceChoice': {
      // Tower first when we already hold idle land: it is the step that turns
      // a dead licence into something a reservoir card can finish.
      const tower = bestTowerSite(state, me.id);
      if (tower && me.cash >= PRICES.tower[tower.terrain] * 2 && developmentUpside(tower.terrain, years) > 0) {
        return { type: 'chooseTowerOrLicence', choice: 'tower', siteId: tower.id };
      }
      const free = bestFreeSite(state);
      if (free && me.cash >= PRICES.licence[free.terrain] * 3 && developmentUpside(free.terrain, years) > 0) {
        return { type: 'chooseTowerOrLicence', choice: 'licence', siteId: free.id };
      }
      return sellOrSkip(state);
    }

    case 'buyTankerChoice': {
      // 300 M against 100 M a year: it breaks even at three years and not before.
      const solo = netValue(PRICES.tanker, ANNUAL_PROFIT.tanker, years);
      const shared = netValue(PRICES.tanker / 2, ANNUAL_PROFIT.tanker / 2, years);
      if (solo > 0 && me.cash >= PRICES.tanker * 1.2) return { type: 'buyTanker', partner: null };
      if (shared > 0 && me.cash >= PRICES.tanker / 2) return { type: 'buyTanker', partner: 'bank' };
      return sellOrSkip(state);
    }

    case 'buyTruckChoice': {
      if (netValue(PRICES.truck, ANNUAL_PROFIT.truck, years) > 0 && me.cash >= PRICES.truck * 2) {
        return { type: 'buyTruck' };
      }
      return sellOrSkip(state);
    }
  }

  switch (state.phase) {
    case 'draw':
      return { type: 'drawCard' };

    case 'playCard': {
      const choices: CardChoice[] = me.hand.map((card) => {
        // Rough worth of exercising this card, before the successor question.
        let own = 0;
        if (card.type === 'petroleiro') own = Math.max(0, netValue(PRICES.tanker / 2, ANNUAL_PROFIT.tanker / 2, years));
        else if (card.type === 'camiaoCisterna') own = Math.max(0, netValue(PRICES.truck, ANNUAL_PROFIT.truck, years));
        else if (card.type === 'torreOuLicenca') own = Math.max(0, developmentUpside('land', years) * 0.4);
        else {
          const kind = card.type === 'reservatorioGas' ? 'gas'
            : card.type === 'reservatorio6MT' ? 'oil6MT'
            : card.type === 'reservatorio4MT' ? 'oil4MT' : 'oil2MT';
          const usable = toweredSites(state, me.id).length > 0;
          own = usable ? Math.max(0, netValue(PRICES[kind], ANNUAL_PROFIT[kind], years)) : 0;
        }
        return { cardId: card.id, score: scoreCard(state, card.move, own) };
      });

      if (choices.length === 0) return { type: 'drawCard' };
      choices.sort((a, b) => b.score - a.score);
      const pick = roll() ? choices[Math.floor(Math.random() * choices.length)]! : choices[0]!;
      return { type: 'playCard', cardId: pick.cardId };
    }

    case 'resolveCard':
      return { type: 'skipCard' };

    case 'advance':
      return { type: 'advance' };
  }
  return null;
}

/**
 * Auction bidding. The AI bids only for what it can actually use, and never
 * more than the item is worth to it after also paying the bank's price.
 */
function auctionBid(state: GameState, bidder: PlayerId, config: AiConfig): Action {
  const auction = state.auction!;
  const p = state.players[bidder]!;
  const years = yearsRemaining(state);
  const pass: Action = { type: 'passBid', playerId: bidder };

  let worth = 0;
  let bankPrice = 0;
  switch (auction.card.type) {
    case 'petroleiro':
      worth = netValue(0, ANNUAL_PROFIT.tanker / 2, years);
      bankPrice = PRICES.tanker / 2;
      break;
    case 'camiaoCisterna':
      worth = netValue(0, ANNUAL_PROFIT.truck, years);
      bankPrice = PRICES.truck;
      break;
    case 'torreOuLicenca':
      worth = Math.max(0, developmentUpside('land', years)) * 0.4;
      bankPrice = PRICES.tower.land;
      break;
    default: {
      const kind = auction.card.type === 'reservatorioGas' ? 'gas'
        : auction.card.type === 'reservatorio6MT' ? 'oil6MT'
        : auction.card.type === 'reservatorio4MT' ? 'oil4MT' : 'oil2MT';
      // Worthless without a tower standing ready.
      if (toweredSites(state, bidder).length === 0) return pass;
      worth = ANNUAL_PROFIT[kind] * years;
      bankPrice = PRICES[kind];
    }
  }

  const headroom = worth - bankPrice;
  if (headroom <= 1 || p.cash < bankPrice * 2) return pass;

  // Bid a fraction of the surplus, so the seller is paid but the buyer profits.
  const amount = Math.max(1, Math.floor(Math.min(headroom * 0.5, p.cash * 0.2) * config.skill));
  return amount >= 1 ? { type: 'bid', playerId: bidder, amount } : pass;
}
