/**
 * The 20 spaces are described to the player in three lengths, and the shortest
 * of them claims whether the square helps or hurts. A hand-written table like
 * that rots silently, so these tests check it against what the engine actually
 * does to a company standing on each square.
 */
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/engine/setup';
import { beginSpace } from '../src/engine/spaces';
import { applyAction } from '../src/engine/engine';
import { tally } from '../src/engine/economy';
import { SPACE_NAMES } from '../src/data/rules';
import { spaceEffect, spaceShort, spaceTone } from '../src/ui/space-text';
import type { GameState } from '../src/engine/types';

const SPACES = Array.from({ length: 20 }, (_, i) => i + 1);

/** A company with one of everything, so no space is a no-op against it. */
function wellStocked(): GameState {
  const s = createGame({ playerCount: 3, seed: 8 });
  s.currentPlayer = 0;
  s.players[0]!.cash = 1000;
  // Three land licences: one drilled, one towered, one idle for confiscation.
  const land = s.sites.filter((x) => x.ownerId === null && x.terrain === 'land').slice(0, 4);
  land.forEach((site) => { site.ownerId = 0; });
  land[0]!.deposit = 'oil6MT';
  land[1]!.deposit = 'gas';
  land[2]!.tower = true;
  const sea = s.sites.find((x) => x.ownerId === null && x.terrain === 'sea')!;
  sea.ownerId = 0;
  s.vehicles.push({ id: 'tk', kind: 'tanker', siteId: null, ownerId: 0, partner: null });
  s.vehicles.push({ id: 'cm', kind: 'truck', siteId: land[3]!.id, ownerId: 0, partner: null });
  // Space 2 only bites from the third passage.
  s.passagemCount = 3;
  return s;
}

/** What the engine actually did, in the same four words the interface uses. */
function observedTone(id: number): 'gain' | 'cost' | 'offer' | 'choice' {
  const s = wellStocked();

  /*
   * Passagem de Ano is the one square whose effect is not in `beginSpace`:
   * annual profits are paid by `advanceMarker` as the marker crosses or stops
   * there, so resolving the square afterwards has nothing left to do. Drive a
   * lap instead.
   */
  if (id === 1) {
    const before = s.players[0]!.cash;
    s.pending = { kind: 'none' };
    s.discard.push({ id: 'lap', type: 'petroleiro', move: 48 });
    s.phase = 'advance';
    applyAction(s, { type: 'advance' });
    expect(s.passagemCount).toBe(4);
    return s.players[0]!.cash > before ? 'gain' : 'cost';
  }
  // Space 17 only does anything to a company the state has taken over.
  if (id === 17) s.players[0]!.nationalised = true;

  const before = {
    cash: s.players[0]!.cash,
    nationalised: s.players[0]!.nationalised,
    assets: tally(s, 0),
  };
  const done = beginSpace(s, id);

  if (!done) {
    switch (s.pending.kind) {
      case 'optionalBuyLicence':
      case 'optionalBuyTower':
      case 'towerOrLicenceChoice':
        return 'offer';
      case 'chooseSpace':
        return 'choice';
      default:
        return 'cost'; // confiscation and surrender both ask which asset to give up
    }
  }

  const after = { cash: s.players[0]!.cash, assets: tally(s, 0) };
  const lostAssets = (Object.keys(after.assets) as (keyof typeof after.assets)[])
    .some((k) => after.assets[k] < before.assets[k]);

  if (s.players[0]!.nationalised && !before.nationalised) return 'cost';
  if (!s.players[0]!.nationalised && before.nationalised) return 'gain';
  if (after.cash > before.cash) return 'gain';
  if (after.cash < before.cash || lostAssets) return 'cost';
  throw new Error(`space ${id} did nothing to a well-stocked company`);
}

describe('space descriptions (src/ui/space-text.ts)', () => {
  it('describes every square, twice, in words', () => {
    for (const id of SPACES) {
      expect(SPACE_NAMES[id], `space ${id} has no name`).toBeTruthy();
      expect(spaceShort(id), `space ${id} has no short form`).toBeTruthy();
      expect(spaceEffect(id), `space ${id} has no full sentence`).toBeTruthy();
    }
  });

  it('keeps the short form short enough for a playing card', () => {
    for (const id of SPACES) {
      expect(spaceShort(id).length, `space ${id}: "${spaceShort(id)}"`).toBeLessThanOrEqual(34);
    }
  });

  it('calls good and bad what the engine actually does', () => {
    for (const id of SPACES) {
      expect(spaceTone(id), `space ${id} — ${SPACE_NAMES[id]}`).toBe(observedTone(id));
    }
  });

  it('agrees with the board about which four squares let you buy', () => {
    // The original paints 1, 3, 5 and 7 teal. Three of them are purchases; the
    // fourth is Passagem de Ano, where you collect instead.
    const offers = SPACES.filter((id) => spaceTone(id) === 'offer');
    expect(offers).toEqual([3, 5, 7]);
    expect(spaceTone(1)).toBe('gain');
  });
});
