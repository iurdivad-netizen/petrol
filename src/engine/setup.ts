/**
 * Game setup (RULES.md §3).
 *
 * Note what is deliberately NOT modelled: the booklet has players elect a
 * banker who holds the bank's property and "gains no benefit" from the role.
 * Digitally the bank is impartial by construction, so the role carries no
 * mechanical consequence and is represented only as a label.
 */

import { PROSPECTING_SQUARES, TRACK, moveValueFor } from '../data/board';
import {
  BANK_STARTING_CASH,
  CARDS_PER_PLAYER,
  COMPANIES,
  COMPONENT_SUPPLY,
  DECK_COMPOSITION,
  SECOND_PASSAGEM_MAX_PLAYERS,
  STARTING_CAPITAL,
  STARTING_HAND,
  TURNS_PER_PLAYER,
} from '../data/rules';
import { shuffle } from './rng';
import type { Card, CardType, GameState, Player, Site } from './types';

export const SAVE_VERSION = 1;

export interface NewGameOptions {
  /** 2..6 companies. */
  companies?: string[];
  playerCount?: number;
  seed?: number;
  /** Optional second payout square; the booklet allows it at <=4 players (§8). */
  secondPassagem?: boolean;
  /** Player ids played by the computer, as positions in `companies`. */
  aiPlayers?: number[];
  /** Set false to seat the companies in the order given, for tests. */
  randomOrder?: boolean;
}

/**
 * The full 60-card physical deck. Move values are a property of the printed
 * card, so they are fixed here once and the same card keeps its number at every
 * player count.
 */
export function fullDeck(): Card[] {
  const composition = DECK_COMPOSITION[6];
  if (!composition) throw new Error('Missing the six-player composition');

  const cards: Card[] = [];
  for (const [type, qty] of Object.entries(composition) as [CardType, number][]) {
    for (let i = 0; i < qty; i++) {
      cards.push({ id: `${type}-${i}`, type, move: moveValueFor(i, qty) });
    }
  }
  return cards;
}

/**
 * The deck for a player count. The booklet has the banker shuffle all 60 cards
 * and "retirará do jogo as que sobrarem" — remove the surplus — so this takes
 * the per-type counts from the table out of the physical deck rather than
 * printing a different deck per player count.
 */
export function buildDeck(playerCount: number, seed: number): { cards: Card[]; state: number } {
  const composition = DECK_COMPOSITION[playerCount];
  if (!composition) throw new Error(`No deck composition for ${playerCount} players`);

  const all = fullDeck();
  const cards: Card[] = [];
  let state = seed;

  // Which surplus cards the banker removes is arbitrary, so removal is random
  // within each type rather than a tidy selection. Taking a prefix kept only
  // the lowest-numbered cards — at two players the deck averaged a move of 2,
  // the marker never completed a lap, and no company was ever paid. Taking an
  // evenly spread subset fixed the mean but left an unnatural bimodal spread,
  // heavy at 1 and 9 and thin between. Random removal preserves the shape of
  // the distribution and gives each game its own tempo, which is what shuffling
  // sixty cards and dealing out the surplus actually does.
  for (const [type, qty] of Object.entries(composition) as [CardType, number][]) {
    const ofType = all.filter((c) => c.type === type);
    const shuffled = shuffle(ofType, state);
    state = shuffled.state;
    cards.push(...shuffled.items.slice(0, qty));
  }

  const expected = playerCount * CARDS_PER_PLAYER;
  if (cards.length !== expected) {
    throw new Error(`Deck for ${playerCount} players is ${cards.length} cards, expected ${expected}`);
  }
  return { cards, state };
}

export function createGame(options: NewGameOptions = {}): GameState {
  const companies = options.companies ?? COMPANIES.slice(0, options.playerCount ?? 4);
  const count = companies.length;
  if (count < 2 || count > 6) throw new Error(`Player count must be 2..6, got ${count}`);

  let rngState = options.seed ?? 0x9e3779b9;

  const built = buildDeck(count, rngState);
  rngState = built.state;
  const shuffled = shuffle(built.cards, rngState);
  rngState = shuffled.state;
  const deck = shuffled.items;

  const seated: Player[] = companies.map((company, index) => ({
    id: index,
    company,
    cash: STARTING_CAPITAL,
    hand: [],
    nationalised: false,
    duplicarUsed: false,
    turnsTaken: 0,
    bankrupt: false,
    // aiPlayers names positions in the requested order, before seating.
    isAi: (options.aiPlayers ?? []).includes(index),
    boughtPrivilege: null,
  }));

  /*
   * Seat the companies at random unless a fixed order is asked for.
   *
   * The booklet starts with the player to the banker's left. With no
   * mechanical banker there is no such seat, so the order is drawn instead —
   * and it matters more here than in most games: a card chooses the SUCCESSOR's
   * square, so who follows whom is a standing strategic relationship, not just
   * a question of who goes first.
   */
  let players = seated;
  if (options.randomOrder !== false) {
    const seating = shuffle(seated, rngState);
    rngState = seating.state;
    players = seating.items;
    // Ids index into this array everywhere, so they follow the seating.
    players.forEach((p, index) => {
      p.id = index;
    });
  }

  // Deal in seating order, once the table is settled.
  for (const p of players) p.hand = deck.splice(0, STARTING_HAND);

  // Only prospecting squares become sites — the porto, the zona industrial and
  // the printed card panel lie outside the grid (see src/data/board.ts).
  const sites: Site[] = PROSPECTING_SQUARES.map((sq) => ({
    id: sq.id,
    terrain: sq.terrain,
    ownerId: null,
    tower: false,
    deposit: null,
  }));

  const secondPassagem =
    (options.secondPassagem ?? false) && count <= SECOND_PASSAGEM_MAX_PLAYERS;

  return {
    saveVersion: SAVE_VERSION,
    rngState,
    players,
    // The booklet starts with the player to the banker's left; with no
    // mechanical banker, player 0 leads.
    currentPlayer: 0,
    phase: 'draw',
    pending: { kind: 'none' },
    markerPos: 0,
    markerPlaced: true,
    passagemCount: 0,
    secondPassagemEnabled: secondPassagem,
    sites,
    vehicles: [],
    deck,
    discard: [],
    bank: {
      cash: BANK_STARTING_CASH - STARTING_CAPITAL * count,
      towers: COMPONENT_SUPPLY.towers,
      oil2MT: COMPONENT_SUPPLY.oil2MT,
      oil4MT: COMPONENT_SUPPLY.oil4MT,
      oil6MT: COMPONENT_SUPPLY.oil6MT,
      gas: COMPONENT_SUPPLY.gas,
      tankers: COMPONENT_SUPPLY.tankers,
      trucks: COMPONENT_SUPPLY.trucks,
    },
    auction: null,
    partnerOffer: null,
    exercisingPrivilege: false,
    turnNumber: 1,
    turnsPerPlayer: TURNS_PER_PLAYER,
    log: [
      {
        turn: 1,
        playerId: null,
        message: `Jogo iniciado. Ordem à mesa: ${players.map((p) => p.company).join(' → ')}. ` +
          `${players[0]?.company} começa.${
          TRACK.verified ? '' : ' (Percurso do tabuleiro provisório.)'
        }`,
      },
    ],
    winnerIds: null,
  };
}
