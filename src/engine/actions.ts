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
  /** Ask the other companies who will go halves on a tanker (§8). */
  | { type: 'seekPartner' }
  | { type: 'partnerReply'; playerId: PlayerId; accept: boolean }
  | { type: 'buyTanker'; partner: PlayerId | 'bank' | null }
  | { type: 'declineTanker' }
  | { type: 'buyTruck'; siteId: string }
  | { type: 'declineTruck' }
  | { type: 'chooseSpace'; space: number }
  | { type: 'confiscate'; siteIds: string[] }
  | { type: 'surrenderTower'; siteId: string }
  /**
   * Offer to end a tanker venture with a company partner: either buy their
   * half or sell your own. The partner answers with `dissolveReply` (§8).
   */
  | { type: 'proposeDissolution'; vehicleId: string; offer: 'buy' | 'sell' }
  | { type: 'dissolveReply'; playerId: PlayerId; accept: boolean }
  /** Sell your half of a tanker venture to the bank (§8). */
  | { type: 'dissolvePartnership'; vehicleId: string };

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export type { Terrain };
