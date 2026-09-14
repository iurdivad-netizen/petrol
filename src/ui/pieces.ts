/**
 * Playing pieces, drawn to match photographs of a real set.
 *
 * From a mid-game photograph:
 *   - prospecting towers are tall black lattice derricks;
 *   - oil reservoirs are grey flat-topped cylinders, stamped with their
 *     capacity and moulded in different heights for 2, 4 and 6 M.T.;
 *   - gas reservoirs are white domes — a different silhouette entirely, so the
 *     two read apart at a glance across the table;
 *   - a licence is a white tile carrying the company's mark, and every piece
 *     stands on top of one.
 *
 * Original artwork: these are drawn from the shapes, not traced from the board.
 */

import type { DepositKind } from '../engine/types';

function svg(inner: string, viewBox = '0 0 24 24'): string {
  return `<svg viewBox="${viewBox}" class="piece-svg" aria-hidden="true">${inner}</svg>`;
}

/** Black lattice derrick. */
export function towerSvg(): string {
  return svg(`
    <polygon points="12,2 17,21 7,21" fill="#1a1a1a"/>
    <polygon points="12,2 15.2,14 8.8,14" fill="#3a3a3a"/>
    <path d="M8.4 17h7.2M9.2 13h5.6M10 9h4" stroke="#6b6b6b" stroke-width="0.7" fill="none"/>
    <rect x="5.5" y="20.5" width="13" height="2" rx="0.5" fill="#111"/>
  `);
}

/** Grey cylinder; taller for larger capacity, stamped with the figure. */
export function oilSvg(kind: 'oil2MT' | 'oil4MT' | 'oil6MT'): string {
  const h = kind === 'oil6MT' ? 13 : kind === 'oil4MT' ? 10 : 7;
  const top = 22 - h;
  const label = kind === 'oil6MT' ? '6' : kind === 'oil4MT' ? '4' : '2';
  return svg(`
    <rect x="5" y="${top + 1.5}" width="14" height="${h - 1.5}" fill="#8d8f93"/>
    <ellipse cx="12" cy="${top + 1.5}" rx="7" ry="2" fill="#b9bcc0"/>
    <ellipse cx="12" cy="21.5" rx="7" ry="2" fill="#6f7276"/>
    <rect x="5" y="${top + 1.5}" width="3" height="${h - 1.5}" fill="#a2a5a9"/>
    <text x="12" y="${top + 3.2}" font-size="3.4" font-weight="700" fill="#2a2a2a"
          text-anchor="middle" font-family="Arial, sans-serif">${label}</text>
  `);
}

/** White dome. */
export function gasSvg(): string {
  return svg(`
    <path d="M4 19a8 8 0 0 1 16 0z" fill="#f2efe8"/>
    <path d="M4 19a8 8 0 0 1 6-7.5A8 8 0 0 0 8.5 19z" fill="#ffffff"/>
    <path d="M6.5 15.5h11M9 12h6" stroke="#cfcabd" stroke-width="0.7" fill="none"/>
    <rect x="3" y="19" width="18" height="2.4" rx="0.6" fill="#ddd8cb"/>
  `);
}

/** Tanker hull, seen from the side. */
export function tankerSvg(colour = '#e8c220'): string {
  return svg(`
    <path d="M2 15h20l-2.5 4.5H4.5z" fill="${colour}"/>
    <rect x="5" y="11" width="11" height="4" rx="0.8" fill="${colour}"/>
    <rect x="16.5" y="8.5" width="4" height="6.5" rx="0.8" fill="#f4f1e8"/>
    <path d="M6 12.5h9M6 13.8h9" stroke="rgba(0,0,0,0.25)" stroke-width="0.6"/>
  `);
}

/** Tank truck, seen from the side. */
export function truckSvg(colour = '#2f6fd0'): string {
  return svg(`
    <rect x="7" y="10" width="13" height="6" rx="3" fill="${colour}"/>
    <path d="M2 11h5v5H2z" fill="#f4f1e8"/>
    <rect x="2" y="15.5" width="18" height="1.6" fill="#333"/>
    <circle cx="6" cy="18" r="2.1" fill="#1a1a1a"/>
    <circle cx="16.5" cy="18" r="2.1" fill="#1a1a1a"/>
  `);
}

export function depositSvg(kind: DepositKind): string {
  return kind === 'gas' ? gasSvg() : oilSvg(kind);
}
