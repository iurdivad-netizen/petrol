/**
 * Turn machine for PETRÓLEO (Karto, 1976) — RULES.md §5.
 *
 * The booklet's order of play is unusual and is reproduced exactly:
 *
 *   1. resolve the space the marker is ON  (put there by the PREVIOUS player)
 *   2. draw one card
 *   3. play one card
 *   4. carry out what it says, if able and willing
 *   5. advance the marker by the played card's value
 *
 * Because of step 1, a player never chooses their own landing square — they
 * choose their successor's. That is the central tension of the design.
 */

import { CARD_DEPOSIT, CARD_NAMES, PRICES, SPACE_NAMES } from '../data/rules';
import { PASSAGEM_INDEX, SECOND_PASSAGEM_INDEX, TRACK } from '../data/board';
import type { Action, ActionResult } from './actions';
import {
  annualProfitFor,
  halveReceipt,
  log,
  payBank,
  player,
  receiveFromBank,
} from './economy';
import { beginSpace, surrenderSite, towerReadySites, toweredSites } from './spaces';
import { winners } from './scoring';
import type { Card, DepositKind, GameState, PlayerId, Site } from './types';

const ok: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

function site(state: GameState, siteId: string): Site | undefined {
  return state.sites.find((s) => s.id === siteId);
}

function trackSpace(index: number): number {
  const cell = TRACK.cells[index % TRACK.cells.length];
  return cell ? cell.space : 1;
}

/**
 * Whose input the game is actually waiting on.
 *
 * Usually the current player, but an auction runs out of turn: the game waits
 * on the next bidder, not on the company that put the card up. Both the AI
 * driver and the interface must agree on this, or one waits for the other —
 * which deadlocked the game whenever a computer company offered a card and a
 * human had to bid on it.
 */
export function actingPlayer(state: GameState): PlayerId {
  if (state.phase === 'auction' && state.auction) {
    const bidder = state.auction.awaiting[0];
    if (bidder !== undefined) return bidder;
  }
  return state.currentPlayer;
}

/** True when there is anyone left who could buy a card put up for sale. */
export function canAuction(state: GameState): boolean {
  return livePlayers(state).some((id) => id !== state.currentPlayer);
}

function livePlayers(state: GameState): PlayerId[] {
  return state.players.filter((p) => !p.bankrupt).map((p) => p.id);
}

// ---------------------------------------------------------------- turn flow

/** Starts a turn: exercise any bought privilege, then resolve the current space. */
function beginTurn(state: GameState): void {
  const p = player(state, state.currentPlayer);

  if (p.boughtPrivilege) {
    const card = p.boughtPrivilege;
    p.boughtPrivilege = null;
    log(state, p.id, `Exerce a regalia comprada: ${CARD_NAMES[card.type]}.`);
    // Exercised through the ordinary card machinery, but flagged so that
    // finishing it returns to space resolution rather than advancing.
    state.exercisingPrivilege = true;
    state.phase = 'resolveCard';
    startCardPrivilege(state, card);
    return;
  }

  resolveCurrentSpace(state);
}

function resolveCurrentSpace(state: GameState): void {
  state.phase = 'resolveSpace';
  const spaceId = trackSpace(state.markerPos);
  if (beginSpace(state, spaceId)) {
    afterSpace(state);
  }
}

function afterSpace(state: GameState): void {
  state.pending = { kind: 'none' };
  if (state.phase === 'gameOver') return;

  // Resolving a space can bankrupt the player who just arrived on it. A failed
  // company has surrendered its hand, so there is nothing left to draw, play or
  // advance with — the turn ends there.
  if (player(state, state.currentPlayer).bankrupt) {
    endTurn(state);
    return;
  }
  state.phase = 'draw';
}

function endTurn(state: GameState): void {
  const p = player(state, state.currentPlayer);
  p.turnsTaken += 1;

  const live = livePlayers(state);
  if (live.length === 0 || state.players.every((q) => q.bankrupt || q.turnsTaken >= state.turnsPerPlayer)) {
    state.phase = 'gameOver';
    state.winnerIds = winners(state);
    const names = state.winnerIds.map((id) => player(state, id).company).join(', ');
    log(state, null, `Fim do jogo. Vencedor: ${names || 'ninguém'}.`);
    return;
  }

  // Next solvent player, clockwise.
  let next = state.currentPlayer;
  for (let i = 0; i < state.players.length; i++) {
    next = (next + 1) % state.players.length;
    const q = player(state, next);
    if (!q.bankrupt && q.turnsTaken < state.turnsPerPlayer) break;
  }
  state.currentPlayer = next;
  state.turnNumber += 1;
  beginTurn(state);
}

// ------------------------------------------------------------- marker + pay

/** Pays every solvent company its annual profits (RULES.md §8). */
function payAnnualProfits(state: GameState, reason: string): void {
  for (const p of state.players) {
    if (p.bankrupt) continue;
    const gross = annualProfitFor(state, p.id);
    if (gross <= 0) continue;
    const paid = receiveFromBank(state, p.id, gross);
    log(state, p.id, `${reason}: ${p.company} recebeu ${paid} M.`);
  }
}

/**
 * Advances the marker, paying out for each Passagem de Ano passed OR landed on.
 * With the optional second square enabled, its index pays too (§8).
 */
function advanceMarker(state: GameState, steps: number): void {
  const size = TRACK.cells.length;
  for (let i = 0; i < steps; i++) {
    state.markerPos = (state.markerPos + 1) % size;
    if (state.markerPos === PASSAGEM_INDEX) {
      state.passagemCount += 1;
      payAnnualProfits(state, `Passagem de Ano (${state.passagemCount}.ª)`);
    } else if (state.secondPassagemEnabled && state.markerPos === SECOND_PASSAGEM_INDEX) {
      payAnnualProfits(state, 'Passagem de Ano (casa oposta)');
    }
  }
}

// ------------------------------------------------------------------- cards

/** Sets up the pending decision a played card requires. */
function startCardPrivilege(state: GameState, card: Card): void {
  const deposit = CARD_DEPOSIT[card.type];
  if (deposit) {
    state.pending = { kind: 'placeDeposit', deposit };
    return;
  }
  switch (card.type) {
    case 'torreOuLicenca':
      state.pending = { kind: 'towerOrLicenceChoice' };
      return;
    case 'petroleiro':
      state.pending = { kind: 'buyTankerChoice' };
      return;
    case 'camiaoCisterna':
      state.pending = { kind: 'buyTruckChoice' };
      return;
  }
}

/** Can the current player actually exercise this card right now? */
export function canUseCard(state: GameState, card: Card): boolean {
  const id = state.currentPlayer;
  const p = player(state, id);
  const deposit = CARD_DEPOSIT[card.type];
  if (deposit) {
    return toweredSites(state, id).length > 0 && p.cash >= PRICES[deposit] && state.bank[deposit] > 0;
  }
  switch (card.type) {
    case 'torreOuLicenca':
      return (
        p.cash >= Math.min(PRICES.licence.sea, PRICES.licence.land) ||
        (towerReadySites(state, id).length > 0 && p.cash >= PRICES.tower.land)
      );
    case 'petroleiro':
      // Affordable alone, or halved through a 50/50 venture (§8).
      return state.bank.tankers > 0 && p.cash >= Math.floor(PRICES.tanker / 2);
    case 'camiaoCisterna':
      return state.bank.trucks > 0 && p.cash >= PRICES.truck;
  }
  return false;
}

/** The card currently played and awaiting resolution. */
function playedCard(state: GameState): Card | undefined {
  return state.discard[state.discard.length - 1];
}

function finishCard(state: GameState): void {
  state.pending = { kind: 'none' };
  if (state.exercisingPrivilege) {
    // A bought privilege is not the player's own card play: the marker does
    // not move, and the turn proceeds to the space the marker already sits on.
    state.exercisingPrivilege = false;
    resolveCurrentSpace(state);
    return;
  }
  state.phase = 'advance';
}

// ----------------------------------------------------------------- reducer

/**
 * Applies an action. Mutates `state` in place and returns whether it was legal.
 * Callers that need undo should clone the state first — it is plain JSON.
 */
export function applyAction(state: GameState, action: Action): ActionResult {
  if (state.phase === 'gameOver') return fail('O jogo terminou.');
  const id = state.currentPlayer;
  const p = player(state, id);

  switch (action.type) {
    // ---- pending space decisions
    case 'chooseSpace': {
      if (state.pending.kind !== 'chooseSpace') return fail('Nada a escolher.');
      if (action.space < 1 || action.space > 19) return fail('Casa inválida.');
      state.pending = { kind: 'none' };
      log(state, id, `A sua conveniência: escolheu a casa ${action.space} — ${SPACE_NAMES[action.space]}.`);
      if (beginSpace(state, action.space)) afterSpace(state);
      return ok;
    }

    case 'confiscate': {
      if (state.pending.kind !== 'confiscateLicences') return fail('Nada a confiscar.');
      if (action.siteIds.length !== state.pending.count) return fail(`Escolha ${state.pending.count} licenças.`);
      for (const sid of action.siteIds) {
        const s = site(state, sid);
        if (!s || s.ownerId !== id || s.tower || s.deposit) return fail('Licença inválida.');
      }
      for (const sid of action.siteIds) site(state, sid)!.ownerId = null;
      log(state, id, `Confiscadas ${action.siteIds.length} licenças.`);
      afterSpace(state);
      return ok;
    }

    case 'surrenderTower': {
      if (state.pending.kind !== 'surrenderTowerSite') return fail('Nada a entregar.');
      const s = site(state, action.siteId);
      if (!s || s.ownerId !== id || !s.tower) return fail('Torre inválida.');
      surrenderSite(state, s);
      log(state, id, 'Poço seco: entregou a licença e a torre.');
      afterSpace(state);
      return ok;
    }

    case 'buyLicence': {
      if (state.pending.kind !== 'optionalBuyLicence') return fail('Não pode comprar licença agora.');
      const { terrain, mayDuplicate } = state.pending;
      const max = mayDuplicate ? 2 : 1;
      if (action.siteIds.length < 1 || action.siteIds.length > max) return fail(`Escolha 1${max > 1 ? ' ou 2' : ''} licença(s).`);
      const price = PRICES.licence[terrain] * action.siteIds.length;
      if (p.cash < price) return fail('Capital insuficiente.');
      for (const sid of action.siteIds) {
        const s = site(state, sid);
        if (!s || s.ownerId !== null || s.terrain !== terrain) return fail('Quadrado inválido.');
      }
      payBank(state, id, price);
      for (const sid of action.siteIds) site(state, sid)!.ownerId = id;
      if (action.siteIds.length === 2) p.duplicarUsed = true;
      log(state, id, `Comprou ${action.siteIds.length} licença(s) ${terrain === 'sea' ? 'no mar' : 'em terra'} por ${price} M.`);
      afterSpace(state);
      return ok;
    }

    case 'declineLicence': {
      if (state.pending.kind !== 'optionalBuyLicence') return fail('Nada a recusar.');
      afterSpace(state);
      return ok;
    }

    case 'buyTower': {
      if (state.pending.kind !== 'optionalBuyTower') return fail('Não pode comprar torre agora.');
      const s = site(state, action.siteId);
      if (!s || s.ownerId !== id || s.tower || s.deposit) return fail('Licença inválida.');
      const price = PRICES.tower[s.terrain];
      if (p.cash < price) return fail('Capital insuficiente.');
      if (state.bank.towers <= 0) return fail('Não há torres disponíveis.');
      payBank(state, id, price);
      state.bank.towers -= 1;
      s.tower = true;
      log(state, id, `Comprou uma torre ${s.terrain === 'sea' ? 'no mar' : 'em terra'} por ${price} M.`);
      afterSpace(state);
      return ok;
    }

    case 'declineTower': {
      if (state.pending.kind !== 'optionalBuyTower') return fail('Nada a recusar.');
      afterSpace(state);
      return ok;
    }

    // ---- turn steps
    case 'drawCard': {
      if (state.phase !== 'draw') return fail('Não é altura de tirar carta.');
      const card = state.deck.shift();
      if (card) p.hand.push(card);
      if (p.hand.length === 0) {
        // Deck exhausted and hand empty: this company has played its ten cards.
        endTurn(state);
        return ok;
      }
      state.phase = 'playCard';
      return ok;
    }

    case 'playCard': {
      if (state.phase !== 'playCard') return fail('Não é altura de jogar carta.');
      const index = p.hand.findIndex((c) => c.id === action.cardId);
      if (index < 0) return fail('Carta não está na mão.');
      const card = p.hand.splice(index, 1)[0]!;
      state.discard.push(card);
      state.phase = 'resolveCard';
      startCardPrivilege(state, card);
      log(state, id, `Jogou ${CARD_NAMES[card.type]} (avança ${card.move}).`);
      return ok;
    }

    case 'skipCard': {
      if (state.phase !== 'resolveCard') return fail('Nada a dispensar.');
      log(state, id, 'Não utilizou nem negociou a carta — perdeu o direito.');
      finishCard(state);
      return ok;
    }

    case 'offerCard': {
      if (state.phase !== 'resolveCard') return fail('Nada a negociar.');
      const card = playedCard(state);
      if (!card) return fail('Nenhuma carta jogada.');
      const others = livePlayers(state).filter((q) => q !== id);
      if (others.length === 0) return fail('Ninguém a quem vender.');
      state.auction = { card, sellerId: id, bids: {}, awaiting: others };
      state.phase = 'auction';
      // The decision that produced the card is over — the game is now waiting
      // on bids. Leaving it set made the interface keep rendering the old
      // controls instead of the auction, with no way to bid or pass.
      state.pending = { kind: 'none' };
      log(state, id, `Colocou ${CARD_NAMES[card.type]} em leilão.`);
      return ok;
    }

    case 'bid':
    case 'passBid': {
      if (state.phase !== 'auction' || !state.auction) return fail('Não há leilão.');
      const a = state.auction;
      const pos = a.awaiting.indexOf(action.playerId);
      if (pos < 0) return fail('Não está em falta neste leilão.');
      if (action.type === 'bid') {
        if (action.amount <= 0) return fail('Licitação inválida.');
        if (player(state, action.playerId).cash < action.amount) return fail('Capital insuficiente.');
        a.bids[action.playerId] = action.amount;
      }
      a.awaiting.splice(pos, 1);
      if (a.awaiting.length > 0) return ok;
      return settleAuction(state);
    }

    case 'dissolvePartnership': {
      const v = state.vehicles.find((x) => x.id === action.vehicleId);
      if (!v || v.kind !== 'tanker') return fail('Petroleiro inválido.');
      if (v.ownerId !== id && v.partner !== id) return fail('Não é sócio deste petroleiro.');
      // Sell your share to the bank: withdraw your licence, place a green
      // marker, and the other side thereafter partners with the bank (§8).
      const half = halveReceipt(PRICES.tanker);
      receiveFromBank(state, id, half);
      if (v.ownerId === id) {
        if (typeof v.partner === 'number') {
          v.ownerId = v.partner;
          v.partner = 'bank';
        } else {
          state.vehicles = state.vehicles.filter((x) => x.id !== v.id);
          state.bank.tankers += 1;
        }
      } else {
        v.partner = 'bank';
      }
      log(state, id, `Vendeu a sua parte do petroleiro ao banco por ${half} M.`);
      return ok;
    }

    // ---- card privileges
    case 'placeDeposit': {
      if (state.pending.kind !== 'placeDeposit') return fail('Não pode colocar depósito agora.');
      const deposit: DepositKind = state.pending.deposit;
      if (action.deposit !== deposit) return fail('Depósito não corresponde à carta.');
      const s = site(state, action.siteId);
      if (!s || s.ownerId !== id || !s.tower || s.deposit) return fail('Precisa de uma licença com torre.');
      const price = PRICES[deposit];
      if (p.cash < price) return fail('Capital insuficiente.');
      if (state.bank[deposit] <= 0) return fail('Não há depósitos disponíveis.');
      payBank(state, id, price);
      // The tower goes back to the bank and the deposit takes its place (§7).
      s.tower = false;
      state.bank.towers += 1;
      s.deposit = deposit;
      state.bank[deposit] -= 1;
      log(state, id, `Substituiu a torre por um depósito ${deposit} por ${price} M.`);
      finishCard(state);
      return ok;
    }

    case 'chooseTowerOrLicence': {
      if (state.pending.kind !== 'towerOrLicenceChoice') return fail('Não pode escolher agora.');
      const s = site(state, action.siteId);
      if (!s) return fail('Quadrado inválido.');
      if (action.choice === 'licence') {
        if (s.ownerId !== null) return fail('Quadrado já licenciado.');
        const price = PRICES.licence[s.terrain];
        if (p.cash < price) return fail('Capital insuficiente.');
        payBank(state, id, price);
        s.ownerId = id;
        log(state, id, `Comprou uma licença ${s.terrain === 'sea' ? 'no mar' : 'em terra'} por ${price} M.`);
      } else {
        if (s.ownerId !== id || s.tower || s.deposit) return fail('Precisa de uma licença livre sua.');
        const price = PRICES.tower[s.terrain];
        if (p.cash < price) return fail('Capital insuficiente.');
        if (state.bank.towers <= 0) return fail('Não há torres disponíveis.');
        payBank(state, id, price);
        state.bank.towers -= 1;
        s.tower = true;
        log(state, id, `Comprou uma torre por ${price} M.`);
      }
      finishCard(state);
      return ok;
    }

    case 'buyTanker': {
      if (state.pending.kind !== 'buyTankerChoice') return fail('Não pode comprar petroleiro agora.');
      if (state.bank.tankers <= 0) return fail('Não há petroleiros disponíveis.');
      const partner = action.partner;
      const share = partner === null ? PRICES.tanker : Math.ceil(PRICES.tanker / 2);
      if (p.cash < share) return fail('Capital insuficiente.');
      if (typeof partner === 'number') {
        const other = player(state, partner);
        if (other.bankrupt || other.cash < Math.floor(PRICES.tanker / 2)) return fail('Sócio sem capital.');
        payBank(state, partner, Math.floor(PRICES.tanker / 2));
      }
      payBank(state, id, share);
      state.bank.tankers -= 1;
      state.vehicles.push({
        id: `tanker-${state.vehicles.length}`,
        kind: 'tanker',
        ownerId: id,
        partner,
      });
      const how = partner === null ? 'sozinho' : partner === 'bank' ? 'em sociedade com o banco' : `em sociedade com ${player(state, partner).company}`;
      log(state, id, `Comprou um petroleiro ${how}.`);
      finishCard(state);
      return ok;
    }

    case 'declineTanker': {
      if (state.pending.kind !== 'buyTankerChoice') return fail('Nada a recusar.');
      finishCard(state);
      return ok;
    }

    case 'buyTruck': {
      if (state.pending.kind !== 'buyTruckChoice') return fail('Não pode comprar camião agora.');
      if (state.bank.trucks <= 0) return fail('Não há camiões disponíveis.');
      if (p.cash < PRICES.truck) return fail('Capital insuficiente.');
      payBank(state, id, PRICES.truck);
      state.bank.trucks -= 1;
      state.vehicles.push({ id: `truck-${state.vehicles.length}`, kind: 'truck', ownerId: id, partner: null });
      log(state, id, `Comprou um camião cisterna por ${PRICES.truck} M.`);
      finishCard(state);
      return ok;
    }

    case 'declineTruck': {
      if (state.pending.kind !== 'buyTruckChoice') return fail('Nada a recusar.');
      finishCard(state);
      return ok;
    }

    case 'advance': {
      if (state.phase !== 'advance') return fail('Não é altura de avançar.');
      const card = playedCard(state);
      if (!card) return fail('Nenhuma carta jogada.');
      advanceMarker(state, card.move);
      endTurn(state);
      return ok;
    }
  }
  return fail('Acção desconhecida.');
}

/** Highest bid wins; the buyer pays the seller and gains the privilege (§6). */
function settleAuction(state: GameState): ActionResult {
  const a = state.auction;
  if (!a) return fail('Não há leilão.');
  const entries = Object.entries(a.bids).map(([k, v]) => [Number(k), v] as [PlayerId, number]);
  state.auction = null;

  if (entries.length === 0) {
    log(state, a.sellerId, 'Ninguém licitou — perdeu o direito à carta.');
    finishCard(state);
    return ok;
  }
  entries.sort((x, y) => y[1] - x[1]);
  const [buyerId, amount] = entries[0]!;
  const buyer = player(state, buyerId);
  const seller = player(state, a.sellerId);

  buyer.cash -= amount;
  seller.cash += amount;
  // The buyer still owes the bank the item's own price when they exercise it (§6).
  buyer.boughtPrivilege = a.card;
  log(state, buyerId, `${buyer.company} comprou a regalia a ${seller.company} por ${amount} M.`);
  finishCard(state);
  return ok;
}

/** Starts the first turn. Call once after createGame. */
export function startGame(state: GameState): GameState {
  state.phase = 'draw';
  return state;
}

export { beginTurn };
