/** Shared simulation driver used by the economy and report tests. */
import { applyAction } from '../src/engine/engine';
import type { GameState } from '../src/engine/types';

export function drive(s: GameState): void {
  let guard = 0;
  while (s.phase !== 'gameOver' && guard++ < 20000) {
    const id = s.currentPlayer;
    const mine = s.sites.filter((x) => x.ownerId === id);
    switch (s.pending.kind) {
      case 'chooseSpace': applyAction(s, { type: 'chooseSpace', space: 14 }); continue;
      case 'confiscateLicences':
        applyAction(s, { type: 'confiscate', siteIds: mine.filter((x) => !x.tower && !x.deposit).slice(0, s.pending.count).map((x) => x.id) });
        continue;
      case 'surrenderTowerSite':
        applyAction(s, { type: 'surrenderTower', siteId: mine.find((x) => x.tower)!.id });
        continue;
      case 'optionalBuyLicence': {
        const t = (s.pending as any).terrain;
        const free = s.sites.filter((x) => x.ownerId === null && x.terrain === t).slice(0, (s.pending as any).mayDuplicate ? 2 : 1);
        if (!free.length || !applyAction(s, { type: 'buyLicence', siteIds: free.map((x) => x.id) }).ok) applyAction(s, { type: 'declineLicence' });
        continue;
      }
      case 'optionalBuyTower': {
        const t = mine.find((x) => !x.tower && !x.deposit);
        if (!t || !applyAction(s, { type: 'buyTower', siteId: t.id }).ok) applyAction(s, { type: 'declineTower' });
        continue;
      }
      case 'placeDeposit': {
        const t = mine.find((x) => x.tower && !x.deposit);
        if (!t || !applyAction(s, { type: 'placeDeposit', siteId: t.id, deposit: (s.pending as any).deposit }).ok) applyAction(s, { type: 'skipCard' });
        continue;
      }
      case 'towerOrLicenceChoice': {
        const up = mine.find((x) => !x.tower && !x.deposit);
        if (up && applyAction(s, { type: 'chooseTowerOrLicence', choice: 'tower', siteId: up.id }).ok) continue;
        const free = s.sites.find((x) => x.ownerId === null);
        if (free && applyAction(s, { type: 'chooseTowerOrLicence', choice: 'licence', siteId: free.id }).ok) continue;
        applyAction(s, { type: 'skipCard' }); continue;
      }
      case 'buyTankerChoice':
        if (!applyAction(s, { type: 'buyTanker', partner: null }).ok && !applyAction(s, { type: 'buyTanker', partner: 'bank' }).ok) applyAction(s, { type: 'declineTanker' });
        continue;
      case 'buyTruckChoice':
        if (!applyAction(s, { type: 'buyTruck' }).ok) applyAction(s, { type: 'declineTruck' });
        continue;
    }
    switch (s.phase) {
      case 'draw': applyAction(s, { type: 'drawCard' }); break;
      case 'playCard': { const c = s.players[id]!.hand[0]; if (c) applyAction(s, { type: 'playCard', cardId: c.id }); break; }
      case 'resolveCard': applyAction(s, { type: 'skipCard' }); break;
      case 'auction': for (const b of [...s.auction!.awaiting]) applyAction(s, { type: 'passBid', playerId: b }); break;
      case 'advance': applyAction(s, { type: 'advance' }); break;
    }
  }
}

