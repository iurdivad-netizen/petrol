/**
 * Board rendering. Pure presentation: it reads GameState and the board data and
 * emits DOM, but holds no rules. Track geometry is derived from TRACK.width /
 * TRACK.height, so correcting the board data reshapes the view automatically.
 */

import { MAP, PASSAGEM_INDEX, SECOND_PASSAGEM_INDEX, TRACK } from '../data/board';
import { DEPOSIT_NAMES, SPACE_NAMES } from '../data/rules';
import { cardBackSvg, depositSvg, tankerSvg, towerSvg, truckSvg } from './pieces';
import { CARD_NAMES } from '../data/rules';
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
export function caption(space: number): string {
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
    // Lets the hand highlight where a card would leave the marker, without
    // repainting the whole board on every hover.
    el.dataset['track'] = String(cell.index);
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
  const tankers = state.vehicles.filter((v) => v.kind === 'tanker');
  // Trucks stand on their own land square rather than in a separate region.
  const truckBySite = new Map(
    state.vehicles.filter((v) => v.kind === 'truck' && v.siteId).map((v) => [v.siteId!, v]),
  );

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

    if (square.region === 'none') {
      el.className = 'site none';
      el.title = 'Ilustração — sem quadrado de prospecção';
      map.appendChild(el);
      continue;
    }

    if (square.region === 'porto') {
      const isPorto = true;
      el.className = 'site porto';
      el.title = 'Porto — petroleiros';

      const slot = portoSquares.indexOf(square);
      const vehicle = tankers[slot];
      if (vehicle) {
        const lic = document.createElement('div');
        lic.className = 'licence';
        lic.style.borderColor = companyColour(vehicle.ownerId);
        el.appendChild(lic);
        const piece = document.createElement('span');
        piece.className = 'piece';
        piece.innerHTML = isPorto
          ? tankerSvg(companyColour(vehicle.ownerId))
          : truckSvg(companyColour(vehicle.ownerId));
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
        label.textContent = 'PORTO';
        el.appendChild(label);
      }
      map.appendChild(el);
      continue;
    }

    const site = state.sites.find((s) => s.id === square.id);
    el.className = `site ${square.terrain}`;
    el.title = `${square.id} — ${square.terrain === 'sea' ? 'mar' : 'terra'}`;

    if (site && site.ownerId !== null) {
      // A licence is a white tile bearing the company's mark; every piece
      // stands on one.
      const company = state.players[site.ownerId]?.company ?? '';
      const licence = document.createElement('div');
      licence.className = 'licence';
      licence.style.borderColor = companyColour(site.ownerId);
      // The company mark only shows on a bare licence; once a tower or deposit
      // stands on the tile the piece covers it, as it does on the board.
      if (!site.tower && !site.deposit) licence.textContent = company;
      el.appendChild(licence);
      el.title += ` — licença ${company}`;
    }
    if (site?.tower) {
      const piece = document.createElement('span');
      piece.className = 'piece';
      piece.innerHTML = towerSvg();
      piece.title = 'Torre de prospecção';
      el.appendChild(piece);
    }
    const truck = site ? truckBySite.get(site.id) : undefined;
    if (truck) {
      const piece = document.createElement('span');
      piece.className = 'piece';
      piece.innerHTML = truckSvg(companyColour(truck.ownerId));
      piece.title = `Camião cisterna de ${state.players[truck.ownerId]?.company}`;
      el.appendChild(piece);
    }
    if (site?.deposit) {
      const piece = document.createElement('span');
      piece.className = 'piece';
      piece.innerHTML = depositSvg(site.deposit);
      piece.title = DEPOSIT_NAMES[site.deposit];
      el.appendChild(piece);
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
    // The deck box, face down, with what is left of it.
    const deckBox = document.createElement('div');
    deckBox.className = 'deck-box';
    if (state.deck.length > 0) {
      deckBox.classList.add('filled');
      deckBox.title = `Baralho — ${state.deck.length} carta(s)`;
      const stack = document.createElement('div');
      stack.className = 'card-stack';
      // A couple of cards peeking out beneath, so it reads as a pile.
      const depth = Math.min(3, state.deck.length);
      for (let i = depth - 1; i >= 0; i--) {
        const layer = document.createElement('div');
        layer.className = 'stack-layer';
        layer.style.transform = `translate(${i * 1.5}px, ${i * 1.5}px)`;
        layer.innerHTML = cardBackSvg();
        stack.appendChild(layer);
      }
      deckBox.appendChild(stack);
      const count = document.createElement('span');
      count.className = 'box-count';
      count.textContent = String(state.deck.length);
      deckBox.appendChild(count);
    } else {
      deckBox.textContent = 'Baralho esgotado';
    }

    const mark = document.createElement('div');
    mark.className = 'karto-mark';
    mark.innerHTML = 'Petróleo<span>Karto</span>';

    // The played box, face up: the board has it backs-downwards, so it shows.
    const playedBox = document.createElement('div');
    playedBox.className = 'deck-box';
    const played = state.discard[state.discard.length - 1];
    if (played) {
      playedBox.classList.add('filled', 'played');
      playedBox.title = `${CARD_NAMES[played.type]} — avança ${played.move}`;
      const face = document.createElement('div');
      face.className = 'mini-card';
      const title = document.createElement('div');
      title.className = 'mini-title';
      title.textContent = CARD_NAMES[played.type];
      const move = document.createElement('div');
      move.className = 'mini-move';
      move.textContent = String(played.move);
      const cap = document.createElement('div');
      cap.className = 'mini-cap';
      cap.textContent = 'casas';
      face.append(title, move, cap);
      playedBox.appendChild(face);
    } else {
      playedBox.textContent = 'Carta jogada';
    }

    overlay.append(deckBox, mark, playedBox);
    map.appendChild(overlay);
  }

  board.appendChild(map);
  return board;
}
