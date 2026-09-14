/** Every action the engine accepts. The UI may produce nothing else. */

import type { DepositKind, PlayerId, Terrain } from './types';

export type Action =
  | { type: 'drawCard' }
  | { type: 'playCard'; cardId: string }
  /** Exercise the played card's privilege. */
  | { type: 'useCard' }
  /** Put the played card up for sale because it cannot or will not be used (§6). */
  | { type: 'offerCard' }
  /** Decline to use it with no buyer — the right is lost (§6). */
  | { type: 'skipCard' }
  | { type: 'bid'; playerId: PlayerId; amount: number }
  | { type: 'passBid'; playerId: PlayerId }
  | { type: 'advance' }
  // Answers to pending decisions
  | { type: 'buyLicence'; siteIds: string[] }
  | { type: 'declineLicence' }
  | { type: 'buyTower'; siteId: string }
  | { type: 'declineTower' }
  | { type: 'chooseTowerOrLicence'; choice: 'tower' | 'licence'; siteId: string }
  | { type: 'placeDeposit'; siteId: string; deposit: DepositKind }
  | { type: 'buyTanker'; partner: PlayerId | 'bank' | null }
  | { type: 'declineTanker' }
  | { type: 'buyTruck' }
  | { type: 'declineTruck' }
  | { type: 'chooseSpace'; space: number }
  | { type: 'confiscate'; siteIds: string[] }
  | { type: 'surrenderTower'; siteId: string }
  /** Dissolve a tanker venture on your turn (§8). */
  | { type: 'dissolvePartnership'; vehicleId: string };

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export type { Terrain };
