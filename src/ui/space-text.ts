/**
 * What each of the 20 board spaces does, in words, and whether it is worth
 * landing on.
 *
 * Every figure is read from the constants the engine enforces, so a space can
 * never be described in terms the game does not apply. Three lengths, because
 * three places need it: a badge word, a phrase small enough for a playing
 * card, and the full sentence for the rulebook and the turn prompt.
 *
 * NOTE ON COLOUR: the board's own teal and red are the artefact's, and they do
 * NOT mean good and bad — teal marks the four squares where you may collect or
 * buy (1, 3, 5 and 7), red marks all the rest. Space 14 raises the oil price
 * and space 17 ends nationalisation, and both are red on the original board.
 * The tone below is this reconstruction's reading of the outcome, shown only on
 * the cards and in the prompt panel, never painted onto the board.
 */

import {
  CONFISCATION_ACTIVE_FROM_PASSAGE,
  CONFISCATION_COUNT,
  PRICES,
  SPACE_FLAT_COST,
  SPACE_TARIFFS,
} from '../data/rules';

/** Whether the company that resolves this square gains, loses, or chooses. */
export type SpaceTone = 'gain' | 'cost' | 'offer' | 'choice';

const TONES: Record<number, SpaceTone> = {
  1: 'gain',    // Passagem de Ano — every company collects
  2: 'cost',
  3: 'offer',   // may buy a sea licence
  4: 'cost',
  5: 'offer',   // may buy a land licence
  6: 'cost',
  7: 'offer',   // may buy a tower
  8: 'cost',
  9: 'cost',
  10: 'cost',
  11: 'cost',
  12: 'cost',
  13: 'cost',   // nationalisation
  14: 'gain',   // the oil price rises
  15: 'cost',
  16: 'cost',
  17: 'gain',   // Livre Empresa ends nationalisation
  18: 'cost',
  19: 'cost',
  20: 'choice', // apply any space from 1 to 19
};

export function spaceTone(id: number): SpaceTone {
  return TONES[id] ?? 'cost';
}

/** The badge word, and the arrow that goes with it. */
export const TONE_LABEL: Record<SpaceTone, string> = {
  gain: 'Ganha',
  cost: 'Perde',
  offer: 'Pode comprar',
  choice: 'Escolhe',
};

export const TONE_SIGN: Record<SpaceTone, string> = {
  gain: '▲',
  cost: '▼',
  offer: '＋',
  choice: '◆',
};

const M = (n: number) => `${n} M`;

/** Short enough for a playing card: what it costs or brings, and nothing else. */
export function spaceShort(id: number): string {
  switch (id) {
    case 1: return 'Lucros anuais a todos';
    case 2: return `Entrega ${CONFISCATION_COUNT} licenças paradas`;
    case 3: return `Licença no mar ${M(PRICES.licence.sea)}`;
    case 5: return `Licença em terra ${M(PRICES.licence.land)}`;
    case 7: return `Torre ${M(PRICES.tower.land)} / ${M(PRICES.tower.sea)}`;
    case 4: return `${M(SPACE_FLAT_COST[4]!)} se tiver petroleiro`;
    case 15: return `${M(SPACE_FLAT_COST[15]!)} se tiver torre`;
    case 6: return 'Imposto por depósito de petróleo';
    case 8: return 'Imposto por bem + 10% do capital';
    case 11: return 'Imposto por depósito de gás';
    case 14: return 'Recebe por cada depósito';
    case 19: return 'Paga por cada depósito';
    case 13: return 'Nacionalizada: metade de tudo';
    case 16: return 'Entrega uma licença com torre';
    case 17: return 'Fim da nacionalização';
    case 20: return 'Qualquer casa de 1 a 19';
    default: {
      const flat = SPACE_FLAT_COST[id];
      return flat ? `Paga ${M(flat)}` : '';
    }
  }
}

/** One full sentence, for the rulebook and the turn prompt. */
export function spaceEffect(id: number): string {
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
