/**
 * The rulebook, and the price table, rendered during play.
 *
 * Every figure here is read from the same constants the engine enforces — no
 * transcribed copy. If a price changes in src/data/rules.ts, this sheet changes
 * with it, so the rules a player reads can never disagree with the rules the
 * game applies.
 */

import {
  ANNUAL_PROFIT,
  BANK_BORROW_INTEREST,
  CARD_NAMES,
  COMPONENT_SUPPLY,
  CONFISCATION_ACTIVE_FROM_PASSAGE,
  CONFISCATION_COUNT,
  DECK_COMPOSITION,
  PRICES,
  SECOND_PASSAGEM_MAX_PLAYERS,
  SPACE_FLAT_COST,
  SPACE_NAMES,
  SPACE_TARIFFS,
  STARTING_CAPITAL,
  TURNS_PER_PLAYER,
} from '../data/rules';
import type { CardType } from '../engine/types';

const M = (n: number) => `${n} M`;

/** Cost and yearly income for everything that can be bought. */
export interface PriceRow {
  what: string;
  cost: number;
  income: number | null;
  note?: string;
}

export function priceRows(): PriceRow[] {
  return [
    { what: 'Licença em terra', cost: PRICES.licence.land, income: null, note: 'não conta no final' },
    { what: 'Licença no mar', cost: PRICES.licence.sea, income: null, note: 'não conta no final' },
    { what: 'Torre em terra', cost: PRICES.tower.land, income: 0 },
    { what: 'Torre no mar', cost: PRICES.tower.sea, income: 0 },
    { what: 'Depósito 2 M.T.', cost: PRICES.oil2MT, income: ANNUAL_PROFIT.oil2MT },
    { what: 'Depósito 4 M.T.', cost: PRICES.oil4MT, income: ANNUAL_PROFIT.oil4MT },
    { what: 'Depósito 6 M.T.', cost: PRICES.oil6MT, income: ANNUAL_PROFIT.oil6MT },
    { what: 'Reservatório de gás', cost: PRICES.gas, income: ANNUAL_PROFIT.gas },
    { what: 'Camião cisterna', cost: PRICES.truck, income: ANNUAL_PROFIT.truck },
    { what: 'Petroleiro', cost: PRICES.tanker, income: ANNUAL_PROFIT.tanker, note: 'pode ser a meias' },
  ];
}

/** Compact always-visible price card for the side column. */
export function priceCard(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'panel';
  const h = document.createElement('h3');
  h.textContent = 'Preços e lucros anuais';
  wrap.appendChild(h);

  const table = document.createElement('table');
  table.className = 'scores prices';
  table.innerHTML = '<thead><tr><th>&nbsp;</th><th>Custo</th><th>Lucro/ano</th></tr></thead>';
  const body = document.createElement('tbody');
  for (const row of priceRows()) {
    const tr = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = row.what;
    const cost = document.createElement('td');
    cost.textContent = M(row.cost);
    const inc = document.createElement('td');
    inc.textContent = row.income === null ? '—' : row.income === 0 ? '0' : M(row.income);
    if (row.income) inc.className = 'gain';
    tr.append(name, cost, inc);
    body.appendChild(tr);
  }
  table.appendChild(body);
  wrap.appendChild(table);

  const note = document.createElement('p');
  note.className = 'muted';
  note.textContent =
    'Os lucros são pagos a todas as companhias sempre que o marcador passa ou pára na Passagem de Ano.';
  wrap.appendChild(note);
  return wrap;
}

/** One line describing what a board space does, built from the rule data. */
function spaceEffect(id: number): string {
  const perAsset = (t: Record<string, number>, verb: string) => {
    const labels: Record<string, string> = {
      oil2MT: '2 M.T.', oil4MT: '4 M.T.', oil6MT: '6 M.T.',
      gas: 'gás', truck: 'camião', tanker: 'petroleiro', tower: 'torre',
    };
    return `${verb} ` + Object.entries(t).map(([k, v]) => `${labels[k] ?? k} ${v}`).join(', ') + ' M';
  };

  switch (id) {
    case 1:
      return 'Todas as companhias recebem os lucros anuais.';
    case 2:
      return `Entrega ${CONFISCATION_COUNT} licenças sem torre nem depósito. Só a partir da ${CONFISCATION_ACTIVE_FROM_PASSAGE}.ª passagem de ano.`;
    case 3:
      return `Pode comprar uma licença no mar por ${M(PRICES.licence.sea)}.`;
    case 5:
      return `Pode comprar uma licença em terra por ${M(PRICES.licence.land)}.`;
    case 7:
      return `Pode comprar uma torre: terra ${M(PRICES.tower.land)}, mar ${M(PRICES.tower.sea)}.`;
    case 6:
      return perAsset(SPACE_TARIFFS.oilTax, 'Paga por cada depósito de petróleo:');
    case 8:
      return (
        perAsset(SPACE_TARIFFS.incomeTax, 'Paga por cada:') +
        `, e ainda ${SPACE_TARIFFS.incomeTaxCashRate * 100}% do dinheiro que lhe restar.`
      );
    case 11:
      return perAsset(SPACE_TARIFFS.gasTax, 'Paga por cada depósito de gás:');
    case 14:
      return perAsset(SPACE_TARIFFS.priceRise, 'Recebe por cada depósito:');
    case 19:
      return perAsset(SPACE_TARIFFS.priceFall, 'Paga por cada depósito:');
    case 13:
      return 'A sua companhia é nacionalizada: recebe e paga metade de tudo até à Livre Empresa.';
    case 16:
      return 'Entrega ao banco uma licença com torre. Sem torres, nada deve.';
    case 17:
      return 'A nacionalização termina. Volta a receber tudo por inteiro.';
    case 20:
      return 'Escolhe qualquer uma das casas 1 a 19.';
    case 4:
      return `Paga ${M(SPACE_FLAT_COST[4]!)} de reparações, se tiver petroleiro.`;
    case 15:
      return `Paga ${M(SPACE_FLAT_COST[15]!)}, se tiver pelo menos uma torre.`;
    default: {
      const flat = SPACE_FLAT_COST[id];
      return flat ? `Paga ${M(flat)} ao banco.` : '';
    }
  }
}

function section(title: string): HTMLElement {
  const h = document.createElement('h3');
  h.textContent = title;
  return h;
}

function paragraph(text: string): HTMLElement {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

function list(items: string[], ordered = false): HTMLElement {
  const el = document.createElement(ordered ? 'ol' : 'ul');
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    el.appendChild(li);
  }
  return el;
}

/** The full rulebook, built from the engine's own constants. */
export function rulesContent(playerCount: number): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'rules';

  wrap.appendChild(paragraph(
    'Um país imaginário, a Kartolândia, dividiu o seu território em zonas de exploração ' +
    'e licenciou companhias estrangeiras para extrair o petróleo. Ganha quem tiver maior ' +
    'capital no fim.',
  ));

  wrap.appendChild(section('A sua vez, por esta ordem'));
  wrap.appendChild(list([
    'Cumpre o que diz a casa onde está o marcador azul — foi o jogador anterior que o lá pôs.',
    'Tira uma carta do baralho.',
    'Joga uma carta.',
    'Cumpre o que ela diz, se puder e quiser — ou vende-a em leilão a outra companhia.',
    'Avança o marcador as casas que a carta indicar. É assim que escolhe a casa do jogador seguinte.',
  ], true));

  wrap.appendChild(section('Para ter um depósito a render'));
  wrap.appendChild(list([
    `1 — Comprar uma licença de prospecção (terra ${M(PRICES.licence.land)}, mar ${M(PRICES.licence.sea)}).`,
    `2 — Comprar uma torre e colocá-la sobre a licença (terra ${M(PRICES.tower.land)}, mar ${M(PRICES.tower.sea)}).`,
    '3 — Com a carta certa, trocar a torre por um depósito de petróleo ou gás.',
    'Só a partir daqui começa a ter lucros na passagem de ano.',
  ]));

  wrap.appendChild(section('Preços e lucros anuais'));
  const table = document.createElement('table');
  table.className = 'scores prices';
  table.innerHTML = '<thead><tr><th>&nbsp;</th><th>Custo</th><th>Lucro/ano</th><th>&nbsp;</th></tr></thead>';
  const body = document.createElement('tbody');
  for (const row of priceRows()) {
    const tr = document.createElement('tr');
    for (const [text, cls] of [
      [row.what, ''],
      [M(row.cost), ''],
      [row.income === null ? '—' : row.income === 0 ? '0' : M(row.income), row.income ? 'gain' : ''],
      [row.note ?? '', 'muted'],
    ] as [string, string][]) {
      const td = document.createElement('td');
      td.textContent = text;
      if (cls) td.className = cls;
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
  table.appendChild(body);
  wrap.appendChild(table);

  wrap.appendChild(section('As 20 casas à volta do mapa'));
  const spaces = document.createElement('table');
  spaces.className = 'scores spaces';
  spaces.innerHTML = '<thead><tr><th>N.º</th><th>Casa</th><th>O que acontece</th></tr></thead>';
  const sbody = document.createElement('tbody');
  for (let id = 1; id <= 20; id++) {
    const tr = document.createElement('tr');
    const n = document.createElement('td');
    n.textContent = String(id);
    n.className = [3, 5, 7].includes(id) ? 'teal-num' : 'red-num';
    const name = document.createElement('td');
    name.textContent = SPACE_NAMES[id] ?? '';
    const eff = document.createElement('td');
    eff.textContent = spaceEffect(id);
    tr.append(n, name, eff);
    sbody.appendChild(tr);
  }
  spaces.appendChild(sbody);
  wrap.appendChild(spaces);

  wrap.appendChild(section('Negociar cartas'));
  wrap.appendChild(paragraph(
    'Uma carta que não possa ou não queira usar pode ser vendida. Se houver mais do que um ' +
    'interessado, faz-se leilão e vende-se a quem der mais. Quem comprar paga-lhe o lance e, ' +
    'depois, o preço do próprio bem ao banco — e exerce a regalia na sua própria vez. ' +
    'Se ninguém quiser, perde o direito à carta.',
  ));

  wrap.appendChild(section('Petroleiros em sociedade'));
  wrap.appendChild(paragraph(
    `Um petroleiro custa ${M(PRICES.tanker)} e rende ${M(ANNUAL_PROFIT.tanker)} por ano. ` +
    'Sem capital para o comprar sozinho, pode fazê-lo a meias com outra companhia ou com o ' +
    'banco: lucros e prejuízos são sempre divididos ao meio. A sociedade pode ser desfeita ' +
    'na sua vez.',
  ));

  wrap.appendChild(section('Fim do jogo'));
  wrap.appendChild(list([
    `Cada jogador joga exactamente ${TURNS_PER_PLAYER} vezes.`,
    'Quem ficar sem dinheiro abandona o jogo e os seus bens saem do tabuleiro.',
    `Se o banco ficar sem dinheiro, pede emprestado aos jogadores e paga ${BANK_BORROW_INTEREST * 100}% de juros.`,
    'Ganha quem somar maior capital: torres, depósitos, petroleiros, camiões e cheques.',
    'Os bens contam pelo preço de compra. As licenças não valem nada.',
    'Uma companhia ainda nacionalizada conta apenas metade.',
  ]));

  wrap.appendChild(section('Este jogo'));
  const comp = DECK_COMPOSITION[playerCount];
  if (comp) {
    const lines = (Object.entries(comp) as [CardType, number][])
      .map(([t, n]) => `${n} × ${CARD_NAMES[t]}`);
    wrap.appendChild(paragraph(
      `Com ${playerCount} jogadores usam-se ${playerCount * TURNS_PER_PLAYER} cartas das 60, ` +
      `e cada companhia começa com ${M(STARTING_CAPITAL)}:`,
    ));
    wrap.appendChild(list(lines));
  }
  wrap.appendChild(paragraph(
    `Na caixa: ${COMPONENT_SUPPLY.towers} torres, ${COMPONENT_SUPPLY.oil6MT + COMPONENT_SUPPLY.oil4MT + COMPONENT_SUPPLY.oil2MT} ` +
    `depósitos de petróleo, ${COMPONENT_SUPPLY.gas} de gás, ${COMPONENT_SUPPLY.tankers} petroleiros ` +
    `e ${COMPONENT_SUPPLY.trucks} camiões. A segunda Passagem de Ano só é permitida até ` +
    `${SECOND_PASSAGEM_MAX_PLAYERS} jogadores.`,
  ));

  return wrap;
}
