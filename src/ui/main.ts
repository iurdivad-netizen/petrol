/**
 * Controller and views.
 *
 * The UI holds no rules. It asks the engine what is legal, renders state, and
 * dispatches Actions. Every rule decision — prices, legality, payouts — lives
 * in src/engine. That separation is what lets the whole ruleset be tested
 * without rendering anything.
 */

import { applyAction, canUseCard } from '../engine/engine';
import { createGame } from '../engine/setup';
import { scoreboard } from '../engine/scoring';
import { tally } from '../engine/economy';
import { idleLicences, toweredSites } from '../engine/spaces';
import { CARD_NAMES, COMPANIES, PRICES, SPACE_NAMES, SECOND_PASSAGEM_MAX_PLAYERS } from '../data/rules';
import { MAP, TRACK } from '../data/board';
import { companyColour, renderBoard } from './board-view';
import { priceCard, rulesContent } from './rules-view';
import type { Action } from '../engine/actions';
import type { GameState, Site } from '../engine/types';

const SAVE_KEY = 'petroleo-karto-1976-save';

/** Short type names for the card's edge tab, as printed on the original. */
const SHORT_TYPE: Record<string, string> = {
  torreOuLicenca: 'Torre/Lic.',
  reservatorioGas: 'Gás',
  reservatorio6MT: '6 M.T.',
  reservatorio4MT: '4 M.T.',
  reservatorio2MT: '2 M.T.',
  petroleiro: 'Petroleiro',
  camiaoCisterna: 'Camião',
};
const DEBUG = new URLSearchParams(location.search).has('debug');

let state: GameState | null = null;
let selected = new Set<string>();
let notice = '';
/** Narrow screens only: enlarge the board and scroll it instead of fitting it. */
let boardZoomed = false;

/**
 * The rulebook, opened over the game. Built once per open from the engine's own
 * constants, so it always states the rules actually in force.
 */
function openRules(playerCount: number): void {
  const existing = document.getElementById('rules-dialog');
  if (existing) existing.remove();

  const dialog = document.createElement('dialog');
  dialog.id = 'rules-dialog';
  dialog.className = 'rules-dialog';

  const head = el('div', 'rules-head');
  head.appendChild(el('h2', undefined, 'Regras'));
  const close = button('Fechar', () => dialog.close(), 'secondary');
  head.appendChild(close);
  dialog.appendChild(head);

  const bodyWrap = el('div', 'rules-body');
  bodyWrap.appendChild(rulesContent(playerCount));
  dialog.appendChild(bodyWrap);

  // Clicking the backdrop closes it, as does Esc (native to <dialog>).
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove());

  document.body.appendChild(dialog);
  dialog.showModal();
}

const app = document.getElementById('app')!;

// ------------------------------------------------------------------ helpers

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
  const b = el('button', cls, label);
  b.addEventListener('click', onClick);
  return b;
}

function dispatch(action: Action): void {
  if (!state) return;
  const result = applyAction(state, action);
  notice = result.ok ? '' : (result.error ?? '');
  selected.clear();
  save();
  render();
}

function save(): void {
  if (state) localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function load(): boolean {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    state = JSON.parse(raw) as GameState;
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------- setup screen

function renderSetup(): void {
  app.replaceChildren();
  const wrap = el('div', 'setup');
  wrap.appendChild(el('div', 'title', 'PETRÓLEO'));
  wrap.appendChild(el('div', 'sub', 'Karto · Porto · 1976 — recriação digital'));

  const panel = el('div', 'panel');
  panel.appendChild(el('h2', undefined, 'Número de companhias'));

  const row = el('div', 'actions');
  for (let n = 2; n <= 6; n++) {
    row.appendChild(
      button(`${n} jogadores`, () => {
        const second = n <= SECOND_PASSAGEM_MAX_PLAYERS && secondBox.checked;
        state = createGame({ playerCount: n, seed: Date.now() >>> 0, secondPassagem: second });
        save();
        render();
      }),
    );
  }
  panel.appendChild(row);

  const label = el('label', 'muted');
  const secondBox = document.createElement('input');
  secondBox.type = 'checkbox';
  label.appendChild(secondBox);
  label.append(
    ` Activar a segunda «Passagem de Ano» na casa oposta (permitido até ${SECOND_PASSAGEM_MAX_PLAYERS} jogadores)`,
  );
  label.style.display = 'block';
  label.style.marginTop = '10px';
  panel.appendChild(label);

  if (localStorage.getItem(SAVE_KEY)) {
    const resume = el('div', 'actions');
    resume.appendChild(
      button('Retomar jogo guardado', () => {
        if (load()) render();
      }, 'secondary'),
    );
    panel.appendChild(resume);
  }

  const help = el('div', 'actions');
  help.style.justifyContent = 'center';
  help.appendChild(button('Ver as regras', () => openRules(4), 'secondary'));
  panel.appendChild(help);

  wrap.appendChild(panel);
  wrap.appendChild(provisionalBanner());
  app.appendChild(wrap);
}

function provisionalBanner(): HTMLElement {
  const open = TRACK.cells.filter((c) => !c.verified).length;
  // Collapsed by default so it never eats the first screen on a phone; the
  // detail matters, but not before the board.
  const b = document.createElement('details');
  b.className = 'banner';
  const summary = document.createElement('summary');
  summary.textContent = 'Reconstrução — o que é original e o que não é';
  b.appendChild(summary);
  const body = el('div');
  body.innerHTML =
    '<strong>Reconstrução.</strong> As regras, os preços, os lucros, as casas do tabuleiro e a ' +
    'grelha do mapa vêm do livro de regras original da Karto e do próprio tabuleiro, e estão ' +
    'verificados' +
    (open > 0 ? ` — exceto ${open} casa do percurso, ainda por confirmar` : '') +
    '. O <em>número de casas de cada carta</em> é uma reconstrução: não existe fotografia do ' +
    'baralho, e os valores foram deduzidos da economia do próprio jogo — ver ' +
    '<code>docs/RULES.md §12</code>.';
  b.appendChild(body);
  return b;
}

// -------------------------------------------------------------- game screen

function playerPanel(s: GameState): HTMLElement {
  const wrap = el('div', 'panel');
  wrap.appendChild(el('h3', undefined, 'Companhias'));
  const list = el('div', 'players');

  for (const p of s.players) {
    const row = el('div', `player${p.id === s.currentPlayer ? ' active' : ''}${p.bankrupt ? ' bankrupt' : ''}`);
    const swatch = el('div', 'swatch');
    swatch.style.background = companyColour(p.id);
    row.appendChild(swatch);

    const name = el('div');
    name.append(p.company);
    if (p.nationalised) {
      const tag = el('span', 'tag', 'NACIONALIZADA');
      name.appendChild(tag);
    }
    row.appendChild(name);
    row.appendChild(el('div', 'cash', `${p.cash} M`));

    const t = tally(s, p.id);
    const bits = [
      `${t.licences} lic.`,
      `${t.towers} torres`,
      `${t.oil2MT + t.oil4MT + t.oil6MT} petróleo`,
      `${t.gas} gás`,
      `${t.tankers + t.tankerShares} petrol.`,
      `${t.trucks} camiões`,
      `${p.turnsTaken}/${s.turnsPerPlayer} jogadas`,
    ];
    row.appendChild(el('div', 'assets', bits.join(' · ')));
    list.appendChild(row);
  }
  wrap.appendChild(list);
  return wrap;
}

function logPanel(s: GameState): HTMLElement {
  const wrap = el('div', 'panel');
  wrap.appendChild(el('h3', undefined, 'Registo'));
  const log = el('div', 'log');
  for (const entry of s.log.slice(-90).reverse()) {
    const line = el('div');
    const who = entry.playerId === null ? '' : `${s.players[entry.playerId]?.company}: `;
    line.textContent = `${who}${entry.message}`;
    log.appendChild(line);
  }
  wrap.appendChild(log);
  return wrap;
}

/** Sites the current pending decision allows the player to click. */
function selectableSites(s: GameState): Set<string> {
  const id = s.currentPlayer;
  switch (s.pending.kind) {
    case 'optionalBuyLicence': {
      const terrain = s.pending.terrain;
      return new Set(s.sites.filter((x) => x.ownerId === null && x.terrain === terrain).map((x) => x.id));
    }
    case 'optionalBuyTower':
    case 'confiscateLicences':
      return new Set(idleLicences(s, id).map((x) => x.id));
    case 'placeDeposit':
      return new Set(toweredSites(s, id).map((x) => x.id));
    case 'surrenderTowerSite':
      return new Set(s.sites.filter((x) => x.ownerId === id && x.tower).map((x) => x.id));
    case 'towerOrLicenceChoice':
      return new Set([
        ...s.sites.filter((x) => x.ownerId === null).map((x) => x.id),
        ...idleLicences(s, id).map((x) => x.id),
      ]);
    default:
      return new Set();
  }
}

function onSiteClick(site: Site): void {
  if (!state) return;
  const pending = state.pending;
  const multi =
    (pending.kind === 'optionalBuyLicence' && pending.mayDuplicate) ||
    pending.kind === 'confiscateLicences';

  if (multi) {
    if (selected.has(site.id)) selected.delete(site.id);
    else selected.add(site.id);
  } else {
    selected = new Set([site.id]);
  }
  render();
}

/** Buttons appropriate to the current phase and pending decision. */
function controls(s: GameState): HTMLElement {
  const wrap = el('div', 'panel');
  const p = s.players[s.currentPlayer]!;
  const pending = s.pending;

  const heading = el('div', 'turn-head');
  heading.appendChild(el('h3', undefined, `Vez de ${p.company}`));
  heading.appendChild(button('Regras', () => openRules(s.players.length), 'secondary'));
  wrap.appendChild(heading);

  const prompt = el('div', 'prompt');
  const actions = el('div', 'actions');
  const chosen = [...selected];

  if (s.phase === 'gameOver') {
    wrap.replaceChildren(el('h3', undefined, 'Fim do jogo'), scoreTable(s));
    const again = el('div', 'actions');
    again.appendChild(button('Novo jogo', () => { localStorage.removeItem(SAVE_KEY); state = null; render(); }));
    wrap.appendChild(again);
    return wrap;
  }

  switch (pending.kind) {
    case 'chooseSpace':
      prompt.textContent = 'A sua conveniência: escolha a casa que mais lhe interessar (1 a 19).';
      for (const n of pending.options) {
        actions.appendChild(button(String(n), () => dispatch({ type: 'chooseSpace', space: n }), 'secondary'));
      }
      break;

    case 'optionalBuyLicence': {
      const price = PRICES.licence[pending.terrain];
      prompt.textContent =
        `Pode comprar ${pending.mayDuplicate ? 'uma ou duas licenças' : 'uma licença'} ` +
        `${pending.terrain === 'sea' ? 'no mar' : 'em terra'} por ${price} M cada. ` +
        (pending.mayDuplicate ? 'Direito de duplicar — apenas uma vez, no início do jogo. ' : '') +
        'Clique no(s) quadrado(s) no mapa.';
      actions.appendChild(
        button(`Comprar (${chosen.length * price} M)`, () => dispatch({ type: 'buyLicence', siteIds: chosen }))
      );
      (actions.lastChild as HTMLButtonElement).disabled = chosen.length === 0;
      actions.appendChild(button('Não comprar', () => dispatch({ type: 'declineLicence' }), 'secondary'));
      break;
    }

    case 'optionalBuyTower': {
      prompt.textContent = `Pode comprar uma torre de prospecção (terra ${PRICES.tower.land} M, mar ${PRICES.tower.sea} M). Escolha uma licença sua.`;
      const b = button('Comprar torre', () => dispatch({ type: 'buyTower', siteId: chosen[0]! }));
      b.disabled = chosen.length !== 1;
      actions.append(b, button('Não comprar', () => dispatch({ type: 'declineTower' }), 'secondary'));
      break;
    }

    case 'placeDeposit': {
      prompt.textContent =
        `Substitua uma torre por um depósito ${pending.deposit} (custo ${PRICES[pending.deposit]} M). ` +
        'A torre volta ao banco.';
      const b = button('Colocar depósito', () =>
        dispatch({ type: 'placeDeposit', siteId: chosen[0]!, deposit: pending.deposit }));
      b.disabled = chosen.length !== 1;
      actions.append(b, negotiateButtons(s));
      break;
    }

    case 'towerOrLicenceChoice': {
      prompt.textContent = 'Compre uma torre OU uma licença. Escolha um quadrado: livre para licença, ou seu para torre.';
      const site = s.sites.find((x) => x.id === chosen[0]);
      const lic = button('Comprar licença', () =>
        dispatch({ type: 'chooseTowerOrLicence', choice: 'licence', siteId: chosen[0]! }));
      const tow = button('Comprar torre', () =>
        dispatch({ type: 'chooseTowerOrLicence', choice: 'tower', siteId: chosen[0]! }));
      lic.disabled = !site || site.ownerId !== null;
      tow.disabled = !site || site.ownerId !== s.currentPlayer || site.tower;
      actions.append(lic, tow, negotiateButtons(s));
      break;
    }

    case 'buyTankerChoice': {
      prompt.textContent =
        `Pode comprar um petroleiro por ${PRICES.tanker} M (lucro anual ${100} M). ` +
        'Se não tiver capital, pode fazê-lo em sociedade a meias.';
      actions.appendChild(button(`Comprar sozinho (${PRICES.tanker} M)`, () =>
        dispatch({ type: 'buyTanker', partner: null })));
      for (const other of s.players) {
        if (other.id === s.currentPlayer || other.bankrupt) continue;
        actions.appendChild(button(`Sociedade com ${other.company}`, () =>
          dispatch({ type: 'buyTanker', partner: other.id }), 'secondary'));
      }
      actions.appendChild(button('Sociedade com o banco', () =>
        dispatch({ type: 'buyTanker', partner: 'bank' }), 'secondary'));
      actions.appendChild(negotiateButtons(s));
      break;
    }

    case 'buyTruckChoice':
      prompt.textContent = `Pode comprar um camião cisterna por ${PRICES.truck} M (lucro anual 5 M).`;
      actions.append(
        button('Comprar camião', () => dispatch({ type: 'buyTruck' })),
        negotiateButtons(s),
      );
      break;

    case 'confiscateLicences':
      prompt.textContent = `Confiscação: escolha ${pending.count} licenças suas que não estejam em exploração.`;
      {
        const b = button('Entregar', () => dispatch({ type: 'confiscate', siteIds: chosen }));
        b.disabled = chosen.length !== pending.count;
        actions.appendChild(b);
      }
      break;

    case 'surrenderTowerSite':
      prompt.textContent = 'Poço seco: escolha a licença com torre que entrega ao banco.';
      {
        const b = button('Entregar', () => dispatch({ type: 'surrenderTower', siteId: chosen[0]! }));
        b.disabled = chosen.length !== 1;
        actions.appendChild(b);
      }
      break;

    default: {
      // No pending decision — drive the phase.
      switch (s.phase) {
        case 'resolveSpace':
          prompt.textContent = `Casa ${SPACE_NAMES[TRACK.cells[s.markerPos]?.space ?? 1]}.`;
          break;
        case 'draw':
          prompt.textContent = s.deck.length
            ? `Tire uma carta do baralho (${s.deck.length} restantes).`
            : 'O baralho acabou — jogue das cartas que tem na mão.';
          actions.appendChild(button('Tirar carta', () => dispatch({ type: 'drawCard' })));
          break;
        case 'playCard':
          prompt.textContent = 'Escolha a carta que quer jogar.';
          break;
        case 'resolveCard':
          prompt.textContent = 'Resolva a carta jogada.';
          actions.appendChild(negotiateButtons(s));
          break;
        case 'auction': {
          const a = s.auction!;
          const bidder = a.awaiting[0]!;
          prompt.textContent =
            `Leilão de «${CARD_NAMES[a.card.type]}» — ${s.players[bidder]?.company}, licite ou passe.`;
          const input = document.createElement('input');
          input.type = 'number';
          input.min = '1';
          input.value = '10';
          input.style.width = '90px';
          input.style.padding = '8px';
          actions.appendChild(input);
          actions.appendChild(button('Licitar', () =>
            dispatch({ type: 'bid', playerId: bidder, amount: Number(input.value) })));
          actions.appendChild(button('Passar', () => dispatch({ type: 'passBid', playerId: bidder }), 'secondary'));
          break;
        }
        case 'advance': {
          const card = s.discard[s.discard.length - 1];
          prompt.textContent = `Avance o marcador ${card?.move ?? 0} casas. Lembre-se: escolhe a casa do próximo jogador.`;
          actions.appendChild(button(`Avançar ${card?.move ?? 0}`, () => dispatch({ type: 'advance' })));
          break;
        }
      }
    }
  }

  wrap.appendChild(prompt);
  if (notice) {
    const err = el('div', 'prompt', notice);
    err.style.borderLeftColor = '#b00';
    wrap.appendChild(err);
  }
  wrap.appendChild(actions);

  if (s.phase === 'playCard') wrap.appendChild(handView(s));
  return wrap;
}

/** Offer-for-sale and forfeit buttons, available whenever a card is unresolved. */
function negotiateButtons(s: GameState): HTMLElement {
  const frag = el('span');
  if (s.phase !== 'resolveCard') return frag;
  frag.appendChild(button('Vender em leilão', () => dispatch({ type: 'offerCard' }), 'secondary'));
  frag.appendChild(button('Dispensar', () => dispatch({ type: 'skipCard' }), 'danger'));
  return frag;
}

function handView(s: GameState): HTMLElement {
  const p = s.players[s.currentPlayer]!;
  const wrap = el('div');
  wrap.appendChild(el('h3', undefined, `Mão de ${p.company}`));
  const hand = el('div', 'hand');

  for (const card of p.hand) {
    const c = el('button', 'card');

    // Left tab: the card type and its number, as printed on the original.
    const left = el('div', 'edge');
    left.append(SHORT_TYPE[card.type] ?? '');
    left.appendChild(el('span', 'pip', String(card.move)));

    const body = el('div', 'body');
    body.appendChild(el('div', 'karto', 'Jogos Karto'));
    body.appendChild(el('div', 'title', CARD_NAMES[card.type]));
    const usable = canUseCard(s, card);
    body.appendChild(el('div', 'muted', usable ? 'Pode utilizar' : 'Só para negociar'));

    // Right edge: AVANCE (n) CASAS.
    const right = el('div', 'edge right');
    right.append('Avance');
    right.appendChild(el('span', 'pip', String(card.move)));
    right.append('Casas');

    c.append(left, body, right);
    c.addEventListener('click', () => dispatch({ type: 'playCard', cardId: card.id }));
    hand.appendChild(c);
  }
  wrap.appendChild(hand);
  return wrap;
}

function scoreTable(s: GameState): HTMLElement {
  const table = el('table', 'scores');
  table.innerHTML =
    '<thead><tr><th>Companhia</th><th>Cheques</th><th>Depósitos</th><th>Torres</th><th>Frota</th><th>Total</th></tr></thead>';
  const body = el('tbody');
  for (const row of scoreboard(s)) {
    const tr = el('tr', s.winnerIds?.includes(row.playerId) ? 'winner' : '');
    for (const v of [row.company, row.cash, row.deposits, row.towers, row.vehicles, row.total]) {
      tr.appendChild(el('td', undefined, String(v)));
    }
    body.appendChild(tr);
  }
  table.appendChild(body);
  return table;
}

function debugPanel(s: GameState): HTMLElement {
  const wrap = el('div', 'panel');
  wrap.appendChild(el('h3', undefined, 'Modo de desenvolvimento'));
  const actions = el('div', 'actions');
  actions.append(
    button('+500 M ao jogador actual', () => { s.players[s.currentPlayer]!.cash += 500; save(); render(); }, 'secondary'),
    button('Nacionalizar', () => { s.players[s.currentPlayer]!.nationalised = true; save(); render(); }, 'secondary'),
    button('Livre empresa', () => { s.players[s.currentPlayer]!.nationalised = false; save(); render(); }, 'secondary'),
    button('Marcador → Passagem de Ano', () => { s.markerPos = 0; save(); render(); }, 'secondary'),
    button('Estado → consola', () => console.log(JSON.parse(JSON.stringify(s))), 'secondary'),
  );
  wrap.appendChild(actions);
  wrap.appendChild(el('div', 'muted',
    `Baralho ${s.deck.length} · jogadas ${s.discard.length} · ano ${s.passagemCount} · banco ${s.bank.cash} M · ` +
    `percurso ${TRACK.cells.length} casas · mapa ${MAP.columns}×${MAP.rows}`));
  return wrap;
}

function renderGame(s: GameState): void {
  app.replaceChildren();
  app.appendChild(provisionalBanner());

  const layout = el('div', 'layout');
  const left = el('div');
  const boardPanel = el('div', 'panel board-panel');

  // On a phone the board is scaled to fit; this lets a player enlarge it and
  // scroll, which is the only way a 15 x 11 grid stays readable at that size.
  const zoomBar = el('div', 'zoom-bar');
  zoomBar.append(el('span', 'muted', 'Tabuleiro:'));

  const wrap = el('div', `board-wrap${boardZoomed ? ' zoomed' : ''}`);
  wrap.appendChild(
    renderBoard(s, {
      onSiteClick,
      selectableSiteIds: selectableSites(s),
      selectedSiteIds: selected,
    }),
  );
  const fitBtn = button('Ajustar', () => { boardZoomed = false; render(); }, 'secondary');
  const zoomBtn = button('Ampliar', () => { boardZoomed = true; render(); }, 'secondary');
  (boardZoomed ? fitBtn : zoomBtn).classList.remove('secondary');
  zoomBar.append(fitBtn, zoomBtn);
  boardPanel.appendChild(zoomBar);

  boardPanel.appendChild(wrap);
  left.appendChild(boardPanel);
  const controlPanel = controls(s);
  controlPanel.classList.add('controls-panel');
  left.appendChild(controlPanel);
  if (DEBUG) left.appendChild(debugPanel(s));

  const right = el('div');
  right.appendChild(playerPanel(s));
  right.appendChild(priceCard());
  right.appendChild(logPanel(s));
  const tools = el('div', 'panel');
  const toolActions = el('div', 'actions');
  toolActions.append(
    button('Regras', () => openRules(s.players.length)),
    button('Guardar', () => { save(); notice = 'Jogo guardado.'; render(); }, 'secondary'),
    button('Recomeçar', () => {
      if (confirm('Recomeçar o jogo? O jogo guardado será apagado.')) {
        localStorage.removeItem(SAVE_KEY);
        state = null;
        render();
      }
    }, 'danger'),
  );
  tools.appendChild(toolActions);
  right.appendChild(tools);

  layout.append(left, right);
  app.appendChild(layout);
}

function render(): void {
  if (!state) renderSetup();
  else renderGame(state);
}

/**
 * Debug handle. Exposed only under ?debug so tests and manual inspection can
 * reach into a live game: `__petroleo.state` is the GameState, `__petroleo.render()`
 * repaints after changing it.
 */
if (DEBUG) {
  (window as unknown as Record<string, unknown>)['__petroleo'] = {
    get state() {
      return state;
    },
    set state(next: GameState | null) {
      state = next;
    },
    render,
    save,
  };
}

void COMPANIES;
render();
