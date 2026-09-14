/**
 * Game setup (RULES.md §3).
 *
 * Note what is deliberately NOT modelled: the booklet has players elect a
 * banker who holds the bank's property and "gains no benefit" from the role.
 * Digitally the bank is impartial by construction, so the role carries no
 * mechanical consequence and is represented only as a label.
 */

import { PROSPECTING_SQUARES, PROVISIONAL_MOVE_VALUES, TRACK } from '../data/board';
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
}

/** Builds the deck for a player count, then assigns provisional move values. */
export function buildDeck(playerCount: number): Card[] {
  const composition = DECK_COMPOSITION[playerCount];
  if (!composition) throw new Error(`No deck composition for ${playerCount} players`);

  const cards: Card[] = [];
  for (const [type, qty] of Object.entries(composition) as [CardType, number][]) {
    for (let i = 0; i < qty; i++) {
      const move = PROVISIONAL_MOVE_VALUES[cards.length % PROVISIONAL_MOVE_VALUES.length] as number;
      cards.push({ id: `${type}-${i}`, type, move });
    }
  }

  const expected = playerCount * CARDS_PER_PLAYER;
  if (cards.length !== expected) {
    throw new Error(`Deck for ${playerCount} players is ${cards.length} cards, expected ${expected}`);
  }
  return cards;
}

export function createGame(options: NewGameOptions = {}): GameState {
  const companies = options.companies ?? COMPANIES.slice(0, options.playerCount ?? 4);
  const count = companies.length;
  if (count < 2 || count > 6) throw new Error(`Player count must be 2..6, got ${count}`);

  let rngState = options.seed ?? 0x9e3779b9;

  const shuffled = shuffle(buildDeck(count), rngState);
  rngState = shuffled.state;
  const deck = shuffled.items;

  const players: Player[] = companies.map((company, id) => ({
    id,
    company,
    cash: STARTING_CAPITAL,
    hand: deck.splice(0, STARTING_HAND),
    nationalised: false,
    duplicarUsed: false,
    turnsTaken: 0,
    bankrupt: false,
    boughtPrivilege: null,
  }));

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
    exercisingPrivilege: false,
    turnNumber: 1,
    turnsPerPlayer: TURNS_PER_PLAYER,
    log: [
      {
        turn: 1,
        playerId: null,
        message: `Jogo iniciado — ${companies.join(', ')}. Marcador na Passagem de Ano.${
          TRACK.verified ? '' : ' (Percurso do tabuleiro provisório.)'
        }`,
      },
    ],
    winnerIds: null,
  };
}
