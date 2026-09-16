/**
 * Core data model for PETRÓLEO (Karto, 1976).
 *
 * Every type here is plain serialisable data — no classes, no functions, no
 * references to DOM or UI. The whole GameState round-trips through JSON, which
 * is what makes save/load and deterministic replay work.
 *
 * Rule references in comments cite docs/RULES.md sections.
 */

export type PlayerId = number;
export type Terrain = 'land' | 'sea';

/** The four things a prospecting square can ultimately hold (§7). */
export type DepositKind = 'oil2MT' | 'oil4MT' | 'oil6MT' | 'gas';

/** The seven card types dealt from the deck (§4). */
export type CardType =
  | 'torreOuLicenca'
  | 'reservatorioGas'
  | 'reservatorio6MT'
  | 'reservatorio4MT'
  | 'reservatorio2MT'
  | 'petroleiro'
  | 'camiaoCisterna';

export interface Card {
  id: string;
  type: CardType;
  /** Squares the blue marker advances when this card is played (§4). */
  move: number;
}

/**
 * A prospecting square on the map. A square is only "in exploration" once it
 * bears a tower or a deposit (§7) — which is what space 2 confiscates against.
 */
export interface Site {
  id: string;
  terrain: Terrain;
  /** Licence owner, or null if unlicensed. */
  ownerId: PlayerId | null;
  tower: boolean;
  deposit: DepositKind | null;
}

/**
 * Tankers sit in the porto. Trucks stand on a land square of the map, on a
 * licence of the owning company — the board has no separately gridded zona
 * industrial, the refinery is drawn over the land. The booklet gives the
 * vehicle's licence free ("não tem que pagar licença. Ela vem juntamente com o
 * navio ou camião"), so buying a truck licenses its square at no cost, and that
 * square is then occupied and cannot also be drilled.
 */
export interface Vehicle {
  id: string;
  kind: 'tanker' | 'truck';
  /** Trucks only: the map square this truck stands on. */
  siteId: string | null;
  /** Commanding licence holder — the one whose licence sits on top (§8). */
  ownerId: PlayerId;
  /**
   * Tanker partnerships only. A player id for a company partnership, 'bank'
   * for a green-marker partnership with the bank, null if solely owned.
   * Always a 50/50 split of profits and losses.
   */
  partner: PlayerId | 'bank' | null;
  /**
   * Parties whose offer to dissolve the venture the other side has refused.
   * The booklet only allows a sale to the bank once the partner has been
   * asked and declined, so the refusal has to survive the turn (§8).
   */
  dissolutionRefusals?: PlayerId[];
}

export interface Player {
  id: PlayerId;
  company: string;
  cash: number;
  hand: Card[];
  /**
   * Nationalised companies receive and pay half of everything until Livre
   * Empresa clears it (§9, spaces 13 and 17).
   */
  nationalised: boolean;
  /** The once-per-game opening double-licence right (§10). */
  duplicarUsed: boolean;
  turnsTaken: number;
  bankrupt: boolean;
  /** Played by the computer. Purely a controller flag: the rules do not care. */
  isAi: boolean;
  /**
   * A card privilege bought from a rival at auction (§6). The booklet says the
   * buyer "tem direito a jogar novamente na sua vez" — so it is exercised at
   * the start of their next turn, in addition to their own card, which keeps
   * every player's own play count at exactly 10.
   */
  boughtPrivilege: Card | null;
}

export interface BankStock {
  cash: number;
  towers: number;
  oil2MT: number;
  oil4MT: number;
  oil6MT: number;
  gas: number;
  tankers: number;
  trucks: number;
}

export type Phase =
  | 'resolveSpace'
  | 'partnerOffer'
  | 'dissolveOffer'
  | 'draw'
  | 'playCard'
  | 'resolveCard'
  | 'auction'
  | 'advance'
  | 'gameOver';

/**
 * A decision the engine is waiting on. Kept explicit rather than implied by
 * phase alone, because several spaces need a player to choose *which* asset is
 * affected (which licences are confiscated, which tower runs dry).
 */
export type Pending =
  | { kind: 'none' }
  | { kind: 'chooseSpace'; /** Space 20 — apply any of 1..19. */ options: number[] }
  | { kind: 'optionalBuyLicence'; terrain: Terrain; mayDuplicate: boolean }
  | { kind: 'optionalBuyTower' }
  | { kind: 'confiscateLicences'; count: number }
  | { kind: 'surrenderTowerSite' }
  | { kind: 'placeDeposit'; deposit: DepositKind }
  | { kind: 'buyTankerChoice'; /** Rivals who agreed to go halves, once asked. */ willing?: PlayerId[] }
  | { kind: 'choosePartner'; willing: PlayerId[] }
  | { kind: 'buyTruckChoice' }
  | { kind: 'towerOrLicenceChoice' };

export interface AuctionState {
  /** The card being sold because its holder cannot or will not use it (§6). */
  card: Card;
  sellerId: PlayerId;
  bids: Record<PlayerId, number>;
  /** Players yet to declare a bid or pass. */
  awaiting: PlayerId[];
}

/**
 * A tanker bought in partnership costs half each, so the booklet has the buyer
 * ASK — "perguntando aos seus colegas de jogo qual o que está interessado" —
 * and choose among those who say yes. Without the ask, a player could bill a
 * rival 150 M against their will.
 */
export interface PartnerOffer {
  buyerId: PlayerId;
  /** Rivals not yet asked. */
  awaiting: PlayerId[];
  /** Rivals who said yes. */
  willing: PlayerId[];
}

export interface GameEvent {
  turn: number;
  playerId: PlayerId | null;
  message: string;
}

/**
 * One party proposing to end a tanker venture. The booklet has them offer to
 * buy the other's half or to sell their own; the partner answers, and only a
 * refusal opens the sale to the bank (§8).
 */
export interface DissolveOffer {
  vehicleId: string;
  proposerId: PlayerId;
  partnerId: PlayerId;
  /** 'buy' = the proposer buys the partner's half; 'sell' = sells their own. */
  offer: 'buy' | 'sell';
  /** The phase to return to once the question is answered. */
  resumePhase: Phase;
}

export interface GameState {
  /** Bumped when the shape changes so old saves can be migrated or rejected. */
  saveVersion: number;
  rngState: number;

  players: Player[];
  currentPlayer: PlayerId;
  phase: Phase;
  pending: Pending;

  /** Index into the board track. */
  markerPos: number;
  /** Whether the marker has been placed at all (first turn skips space resolution). */
  markerPlaced: boolean;
  /** Completed passages of Passagem de Ano — space 2 only bites from the 3rd (§9). */
  passagemCount: number;
  /** Optional second payout square, allowed at 4 players or fewer (§8). */
  secondPassagemEnabled: boolean;

  sites: Site[];
  vehicles: Vehicle[];

  deck: Card[];
  /** Played cards, face up beside the deck: everyone sees what was played. */
  discard: Card[];

  bank: BankStock;
  auction: AuctionState | null;
  partnerOffer: PartnerOffer | null;
  dissolveOffer: DissolveOffer | null;

  /**
   * True while a player is exercising a privilege bought at auction at the
   * start of their turn (§6). It is not their own card play, so it must not
   * advance the marker — the turn continues to space resolution afterwards.
   */
  exercisingPrivilege: boolean;

  turnNumber: number;
  /** Every player takes exactly 10 turns (§11). */
  turnsPerPlayer: number;
  log: GameEvent[];
  winnerIds: PlayerId[] | null;
}
