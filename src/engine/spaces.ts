/**
 * The twenty spaces around the map (RULES.md §9).
 *
 * `beginSpace` either settles a space outright or parks a `pending` decision
 * for the player to answer. Nothing here advances the turn — the caller does
 * that once `pending` is back to 'none'.
 *
 * Where the booklet states a precondition ("se tiver pelo menos uma licença com
 * uma torre") it is enforced. Where it states none, the charge is unconditional
 * rather than guessed at; the only exception is space 4, whose text "(você ou a
 * sociedade)" presupposes owning a tanker. Flagged as an interpretation.
 */

import {
  CONFISCATION_ACTIVE_FROM_PASSAGE,
  CONFISCATION_COUNT,
  SPACE_FLAT_COST,
  SPACE_NAMES,
  SPACE_TARIFFS,
} from '../data/rules';
import { log, payBank, player, receiveFromBank, tally } from './economy';
import type { GameState, PlayerId, Site } from './types';

/** Licences bearing neither tower nor deposit — what space 2 confiscates. */
export function idleLicences(state: GameState, id: PlayerId): Site[] {
  return state.sites.filter((s) => s.ownerId === id && !s.tower && !s.deposit);
}

/** Licences that could take a tower: owned, no tower, no deposit. */
export function towerReadySites(state: GameState, id: PlayerId): Site[] {
  return idleLicences(state, id);
}

/** Licences carrying a tower and no deposit — candidates for a reservoir or for space 16. */
export function toweredSites(state: GameState, id: PlayerId): Site[] {
  return state.sites.filter((s) => s.ownerId === id && s.tower && !s.deposit);
}

function perAsset(state: GameState, id: PlayerId, table: Record<string, number>): number {
  const t = tally(state, id);
  let sum = 0;
  for (const [asset, rate] of Object.entries(table)) {
    const count =
      asset === 'tower' ? t.towers
      : asset === 'truck' ? t.trucks
      : asset === 'tanker' ? t.tankers + t.tankerShares
      : (t[asset as keyof typeof t] as number) ?? 0;
    sum += count * rate;
  }
  return sum;
}

function ownsTanker(state: GameState, id: PlayerId): boolean {
  return state.vehicles.some((v) => v.kind === 'tanker' && (v.ownerId === id || v.partner === id));
}

/**
 * Applies one space to the current player. Returns true when the space is fully
 * settled; false means `state.pending` now holds a decision.
 */
export function beginSpace(state: GameState, spaceId: number): boolean {
  const id = state.currentPlayer;
  const p = player(state, id);
  const name = SPACE_NAMES[spaceId] ?? `Casa ${spaceId}`;

  switch (spaceId) {
    // 1 — payout already happens when the marker passes or lands (see advance()).
    case 1:
      return true;

    case 2: {
      if (state.passagemCount < CONFISCATION_ACTIVE_FROM_PASSAGE - 1) {
        log(state, id, `${name}: ainda sem efeito (antes da 3.ª passagem de ano).`);
        return true;
      }
      const idle = idleLicences(state, id);
      if (idle.length === 0) {
        log(state, id, `${name}: sem licenças por explorar.`);
        return true;
      }
      if (idle.length <= CONFISCATION_COUNT) {
        for (const site of idle) site.ownerId = null;
        log(state, id, `${name}: ${idle.length} licença(s) confiscada(s).`);
        return true;
      }
      state.pending = { kind: 'confiscateLicences', count: CONFISCATION_COUNT };
      return false;
    }

    case 3:
    case 5: {
      const terrain = spaceId === 3 ? 'sea' : 'land';
      state.pending = {
        kind: 'optionalBuyLicence',
        terrain,
        // The opening double-licence right, once per player (§10).
        mayDuplicate: !p.duplicarUsed,
      };
      return false;
    }

    case 7: {
      if (towerReadySites(state, id).length === 0) {
        log(state, id, `${name}: sem licenças livres onde colocar uma torre.`);
        return true;
      }
      state.pending = { kind: 'optionalBuyTower' };
      return false;
    }

    case 4: {
      if (!ownsTanker(state, id)) {
        log(state, id, `${name}: não possui petroleiro.`);
        return true;
      }
      const cost = SPACE_FLAT_COST[4]!;
      payBank(state, id, cost);
      log(state, id, `${name}: pagou ${cost} M de reparações.`);
      return true;
    }

    case 15: {
      if (toweredSites(state, id).length === 0 && !state.sites.some((s) => s.ownerId === id && s.tower)) {
        log(state, id, `${name}: sem torres de prospecção.`);
        return true;
      }
      const cost = SPACE_FLAT_COST[15]!;
      payBank(state, id, cost);
      log(state, id, `${name}: pagou ${cost} M.`);
      return true;
    }

    case 9:
    case 10:
    case 12:
    case 18: {
      const cost = SPACE_FLAT_COST[spaceId]!;
      payBank(state, id, cost);
      log(state, id, `${name}: pagou ${cost} M.`);
      return true;
    }

    case 6: {
      const due = perAsset(state, id, SPACE_TARIFFS.oilTax);
      if (due > 0) payBank(state, id, due);
      log(state, id, `${name}: pagou ${due} M.`);
      return true;
    }

    case 11: {
      const due = perAsset(state, id, SPACE_TARIFFS.gasTax);
      if (due > 0) payBank(state, id, due);
      log(state, id, `${name}: pagou ${due} M.`);
      return true;
    }

    case 19: {
      const due = perAsset(state, id, SPACE_TARIFFS.priceFall);
      if (due > 0) payBank(state, id, due);
      log(state, id, `${name}: pagou ${due} M.`);
      return true;
    }

    case 14: {
      const gain = perAsset(state, id, SPACE_TARIFFS.priceRise);
      if (gain > 0) receiveFromBank(state, id, gain);
      log(state, id, `${name}: recebeu ${gain} M.`);
      return true;
    }

    case 8: {
      // Per-asset tax first, then a further 10% of whatever cash remains (§9).
      const assetTax = perAsset(state, id, SPACE_TARIFFS.incomeTax);
      if (assetTax > 0) payBank(state, id, assetTax);
      if (p.bankrupt) return true;
      const cashLevy = Math.ceil(p.cash * SPACE_TARIFFS.incomeTaxCashRate);
      if (cashLevy > 0) payBank(state, id, cashLevy);
      log(state, id, `${name}: pagou ${assetTax} M sobre bens e ${cashLevy} M sobre capital.`);
      return true;
    }

    case 13: {
      if (p.nationalised) {
        log(state, id, `${name}: já estava nacionalizada.`);
        return true;
      }
      p.nationalised = true;
      log(state, id, `${name}: ${p.company} foi nacionalizada — lucros e prejuízos a metade.`);
      return true;
    }

    case 17: {
      if (!p.nationalised) {
        log(state, id, `${name}: a companhia não estava nacionalizada.`);
        return true;
      }
      p.nationalised = false;
      log(state, id, `${name}: ${p.company} deixou de estar nacionalizada.`);
      return true;
    }

    case 16: {
      const towered = state.sites.filter((s) => s.ownerId === id && s.tower);
      if (towered.length === 0) {
        log(state, id, `${name}: sem torres — nada a entregar.`);
        return true;
      }
      if (towered.length === 1) {
        surrenderSite(state, towered[0]!);
        log(state, id, `${name}: entregou a licença e a torre ao banco.`);
        return true;
      }
      state.pending = { kind: 'surrenderTowerSite' };
      return false;
    }

    case 20: {
      state.pending = { kind: 'chooseSpace', options: Array.from({ length: 19 }, (_, i) => i + 1) };
      return false;
    }

    default:
      log(state, id, `Casa ${spaceId} desconhecida — ignorada.`);
      return true;
  }
}

/** Space 16: the licence and its tower go back to the bank. A deposit is not taken. */
export function surrenderSite(state: GameState, site: Site): void {
  if (site.tower) state.bank.towers += 1;
  site.tower = false;
  site.ownerId = null;
}
