/**
 * Board rendering. Pure presentation: it reads GameState and the board data and
 * emits DOM, but holds no rules. Track geometry is derived from TRACK.width /
 * TRACK.height, so correcting the board data reshapes the view automatically.
 */

import { MAP, PASSAGEM_INDEX, SECOND_PASSAGEM_INDEX, TRACK } from '../data/board';
import { SPACE_NAMES } from '../data/rules';
import type { GameState, Site } from '../engine/types';

const COMPANY_COLOURS = ['#d4342a', '#1d9099', '#f0b93b', '#7b3fa0', '#2a7d4f', '#e2761b'];

export function companyColour(playerIndex: number): string {
  return COMPANY_COLOURS[playerIndex % COMPANY_COLOURS.length]!;
}

/** Grid position (1-based column/row) of a track cell, anticlockwise from bottom-right. */
export function trackPosition(index: number): { col: number; row: number } {
  const w = TRACK.width;
  const h = TRACK.height;
  if (index < w) return { col: w - index, row: h };
  if (index < w + (h - 1)) return { col: 1, row: h - (index - (w - 1)) };
  const topStart = w + h - 2;
  if (index < topStart + w) return { col: 1 + (index - topStart), row: 1 };
  const rightStart = topStart + w - 1;
  return { col: w, row: 1 + (index - rightStart) };
}

/** Short caption under the space number, so the board reads without the rulebook. */
function caption(space: number): string {
  const full = SPACE_NAMES[space] ?? '';
  return full.length > 22 ? full.slice(0, 20) + '…' : full;
}

export interface BoardHandlers {
  onSiteClick?: (site: Site) => void;
  selectableSiteIds?: Set<string>;
  selectedSiteIds?: Set<string>;
}

export function renderBoard(state: GameState, handlers: BoardHandlers = {}): HTMLElement {
  const board = document.createElement('div');
  board.className = 'board';
  board.style.gridTemplateColumns = `repeat(${TRACK.width}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${TRACK.height}, 1fr)`;

  for (const cell of TRACK.cells) {
    const { col, row } = trackPosition(cell.index);
    const el = document.createElement('div');
    const teal = [1, 3, 5, 7].includes(cell.space);
    el.className = `cell ${teal ? 'teal' : 'red'}`;
    if (cell.index === PASSAGEM_INDEX) el.classList.add('passagem', 'pennant');
    if (cell.index === SECOND_PASSAGEM_INDEX) el.classList.add('pennant');
    if (cell.index === state.markerPos) el.classList.add('current');
    el.style.gridColumn = String(col);
    el.style.gridRow = String(row);
    el.title = `${cell.space} — ${SPACE_NAMES[cell.space] ?? ''}${cell.verified ? '' : ' (leitura provisória)'}`;

    const num = document.createElement('div');
    num.textContent = cell.index === PASSAGEM_INDEX ? '★' : String(cell.space);
    el.appendChild(num);

    const cap = document.createElement('div');
    cap.className = 'caption';
    cap.textContent = cell.index === PASSAGEM_INDEX ? 'Passagem de Ano' : caption(cell.space);
    el.appendChild(cap);

    if (cell.index === state.markerPos) {
      const marker = document.createElement('div');
      marker.className = 'marker';
      marker.title = 'Marcador azul';
      el.appendChild(marker);
    }
    board.appendChild(el);
  }

  // The map occupies the whole interior of the track.
  const map = document.createElement('div');
  map.className = 'map';
  map.style.gridColumn = `2 / ${TRACK.width}`;
  map.style.gridRow = `2 / ${TRACK.height}`;
  map.style.gridTemplateColumns = `repeat(${MAP.columns}, 1fr)`;
  map.style.gridTemplateRows = `repeat(${MAP.rows}, 1fr)`;

  // Vehicles live outside the prospecting grid: tankers in the porto, trucks in
  // the zona industrial (RULES.md §8).
  const portoSquares = MAP.squares.filter((s) => s.region === 'porto');
  const industrialSquares = MAP.squares.filter((s) => s.region === 'industrial');
  const tankers = state.vehicles.filter((v) => v.kind === 'tanker');
  const trucks = state.vehicles.filter((v) => v.kind === 'truck');

  for (const square of MAP.squares) {
    const el = document.createElement('div');
    // Every square is placed explicitly. Auto-placement would flow cells around
    // the definitely-positioned card panel and displace the whole map.
    el.style.gridColumn = String(square.col + 1);
    el.style.gridRow = String(square.row + 1);

    if (square.region === 'panel') {
      el.className = 'site panel';
      map.appendChild(el);
      continue;
    }

    if (square.region === 'porto' || square.region === 'industrial') {
      const isPorto = square.region === 'porto';
      el.className = `site ${isPorto ? 'porto' : 'industrial'}`;
      el.title = isPorto ? 'Porto — petroleiros' : 'Zona industrial — camiões cisterna';

      const slot = (isPorto ? portoSquares : industrialSquares).indexOf(square);
      const vehicle = (isPorto ? tankers : trucks)[slot];
      if (vehicle) {
        const lic = document.createElement('div');
        lic.className = 'owner';
        lic.style.background = companyColour(vehicle.ownerId);
        lic.style.opacity = '0.6';
        el.appendChild(lic);
        const piece = document.createElement('span');
        piece.className = 'piece';
        piece.textContent = isPorto ? '🚢' : '🚚';
        const owner = state.players[vehicle.ownerId]?.company;
        piece.title = vehicle.partner === null
          ? `${owner}`
          : `${owner} em sociedade com ${vehicle.partner === 'bank' ? 'o banco' : state.players[vehicle.partner]?.company}`;
        el.appendChild(piece);
        if (vehicle.partner !== null) {
          const mark = document.createElement('span');
          mark.className = 'partner-mark';
          mark.textContent = vehicle.partner === 'bank' ? '●' : '◐';
          mark.title = piece.title;
          el.appendChild(mark);
        }
      } else if (slot === 0) {
        const label = document.createElement('span');
        label.className = 'region-label';
        label.textContent = isPorto ? 'PORTO' : 'ZONA INDUSTRIAL';
        el.appendChild(label);
      }
      map.appendChild(el);
      continue;
    }

    const site = state.sites.find((s) => s.id === square.id);
    el.className = `site ${square.terrain}`;
    el.title = `${square.id} — ${square.terrain === 'sea' ? 'mar' : 'terra'}`;

    if (site?.ownerId !== null && site !== undefined) {
      const owner = document.createElement('div');
      owner.className = 'owner';
      owner.style.background = companyColour(site.ownerId as number);
      owner.style.opacity = '0.55';
      el.appendChild(owner);
      el.title += ` — licença de ${state.players[site.ownerId as number]?.company}`;
    }
    if (site?.tower) {
      const piece = document.createElement('span');
      piece.className = 'piece';
      piece.textContent = '⛏';
      piece.title = 'Torre de prospecção';
      el.appendChild(piece);
    }
    if (site?.deposit) {
      const piece = document.createElement('span');
      piece.className = 'piece';
      piece.textContent = site.deposit === 'gas' ? '🔥' : '🛢';
      piece.title = site.deposit;
      el.appendChild(piece);
      const label = document.createElement('span');
      label.className = 'caption';
      label.style.position = 'absolute';
      label.style.bottom = '1px';
      label.style.color = '#fff';
      label.textContent = site.deposit === 'gas' ? 'GÁS' : site.deposit.replace('oil', '');
      el.appendChild(label);
    }

    if (site && handlers.selectableSiteIds?.has(site.id)) {
      el.classList.add('selectable');
      el.addEventListener('click', () => handlers.onSiteClick?.(site));
    }
    if (site && handlers.selectedSiteIds?.has(site.id)) el.classList.add('selected');

    map.appendChild(el);
  }

  // The printed card panel, laid over its region of the grid.
  const panel = MAP.squares.filter((s) => s.region === 'panel');
  if (panel.length > 0) {
    const cols = panel.map((s) => s.col);
    const rows = panel.map((s) => s.row);
    const overlay = document.createElement('div');
    overlay.className = 'panel-inner';
    overlay.style.gridColumn = `${Math.min(...cols) + 1} / ${Math.max(...cols) + 2}`;
    overlay.style.gridRow = `${Math.min(...rows) + 1} / ${Math.max(...rows) + 2}`;
    overlay.innerHTML =
      '<div class="deck-box">Coloque aqui o baralho com as costas voltadas para cima</div>' +
      '<div class="karto-mark">Petróleo<span>Karto</span></div>' +
      '<div class="deck-box">Coloque aqui a carta que jogou com as costas voltadas para baixo</div>';
    map.appendChild(overlay);
  }

  board.appendChild(map);
  return board;
}
