/**
 * Typed rule constants for PETRÓLEO (Karto, 1976), transcribed from the
 * original Karto rules booklet. See docs/RULES.md for the prose version and
 * data/petroleo.rules.json for the canonical machine-readable copy — a test
 * asserts these two stay in agreement.
 *
 * All monetary values are in millions of Kartos.
 */

import type { CardType, DepositKind, Terrain } from '../engine/types';

/**
 * The six licensed companies.
 *
 * CORRECTED against a photograph of an actual copy, whose licence tiles read
 * SACOR (red wordmark, green "S" shield). Secondary collector sources uniformly
 * list "CEPSA, ESSO, GALP, MOBIL, SHELL, TOTAL", but that cannot be right for a
 * 1976 Portuguese game: GALP did not exist as a brand until 1976 and its logo
 * only launched in 1978, while SACOR and SONAP were the Portuguese operators of
 * the day (both nationalised in 1975, merged into Petrogal in April 1976).
 * A source describing the game's licences names exactly this set — the foreign
 * majors plus "Sonap and Sacor, precursors of Galp".
 *
 * Trademarks, kept as data: replace this array to ship a trademark-free build.
 * Nothing in the engine depends on the names.
 */
export const COMPANIES = ['SACOR', 'SONAP', 'ESSO', 'MOBIL', 'SHELL', 'BP'] as const;

export const STARTING_CAPITAL = 200;
export const STARTING_HAND = 4;
export const TURNS_PER_PLAYER = 10;
export const CARDS_PER_PLAYER = 10;

/** RULES.md §8. Sea licences are cheaper than land; sea towers cost far more. */
export const PRICES = {
  licence: { land: 7, sea: 5 } as Record<Terrain, number>,
  tower: { land: 5, sea: 12 } as Record<Terrain, number>,
  oil6MT: 10,
  oil4MT: 7,
  oil2MT: 5,
  gas: 6,
  truck: 5,
  tanker: 300,
} as const;

/** Paid by the bank to every company at Passagem de Ano (RULES.md §8). */
export const ANNUAL_PROFIT: Record<DepositKind | 'tanker' | 'truck', number> = {
  oil6MT: 20,
  oil4MT: 14,
  oil2MT: 10,
  gas: 12,
  tanker: 100,
  truck: 5,
};

/** Scoring values — assets count at their fixed purchase price (RULES.md §11). */
export const DEPOSIT_VALUE: Record<DepositKind, number> = {
  oil6MT: PRICES.oil6MT,
  oil4MT: PRICES.oil4MT,
  oil2MT: PRICES.oil2MT,
  gas: PRICES.gas,
};

export const COMPONENT_SUPPLY = {
  towers: 28,
  oil6MT: 9,
  oil4MT: 9,
  oil2MT: 9,
  gas: 9,
  tankers: 5,
  trucks: 5,
  licencesPerCompany: 30,
} as const;

export const CHEQUES: ReadonlyArray<{ value: number; qty: number }> = [
  { value: 1, qty: 40 },
  { value: 5, qty: 20 },
  { value: 10, qty: 20 },
  { value: 20, qty: 60 },
  { value: 50, qty: 60 },
];

export const BANK_STARTING_CASH = CHEQUES.reduce((sum, c) => sum + c.value * c.qty, 0); // 4540

/** Interest the bank pays immediately when it must borrow from players (§11). */
export const BANK_BORROW_INTEREST = 0.1;

/** RULES.md §4 — every column totals exactly 10 cards per player. */
export const DECK_COMPOSITION: Record<number, Record<CardType, number>> = {
  6: { torreOuLicenca: 14, reservatorioGas: 9, reservatorio6MT: 9, reservatorio4MT: 9, reservatorio2MT: 9, petroleiro: 5, camiaoCisterna: 5 },
  5: { torreOuLicenca: 10, reservatorioGas: 8, reservatorio6MT: 8, reservatorio4MT: 8, reservatorio2MT: 8, petroleiro: 4, camiaoCisterna: 4 },
  4: { torreOuLicenca: 8, reservatorioGas: 7, reservatorio6MT: 7, reservatorio4MT: 6, reservatorio2MT: 6, petroleiro: 3, camiaoCisterna: 3 },
  3: { torreOuLicenca: 8, reservatorioGas: 5, reservatorio6MT: 5, reservatorio4MT: 4, reservatorio2MT: 4, petroleiro: 2, camiaoCisterna: 2 },
  2: { torreOuLicenca: 8, reservatorioGas: 3, reservatorio6MT: 3, reservatorio4MT: 2, reservatorio2MT: 2, petroleiro: 1, camiaoCisterna: 1 },
};

/** Space 2 only bites from the third passage, giving companies time to buy towers (§9). */
export const CONFISCATION_ACTIVE_FROM_PASSAGE = 3;
export const CONFISCATION_COUNT = 2;

/** The second Passagem de Ano may only be enabled at this player count or fewer (§8). */
export const SECOND_PASSAGEM_MAX_PLAYERS = 4;

export const CARD_DEPOSIT: Partial<Record<CardType, DepositKind>> = {
  reservatorio6MT: 'oil6MT',
  reservatorio4MT: 'oil4MT',
  reservatorio2MT: 'oil2MT',
  reservatorioGas: 'gas',
};

/** Per-asset levies for the tax and price-swing spaces (RULES.md §9). */
export const SPACE_TARIFFS = {
  /** 6 — Imposto sobre petróleo. */
  oilTax: { oil2MT: 2, oil4MT: 4, oil6MT: 6 } as Record<string, number>,
  /** 8 — Imposto de rendimento, plus 10% of cash remaining afterwards. */
  incomeTax: { oil2MT: 1, oil4MT: 2, oil6MT: 3, truck: 1, tanker: 10, tower: 1 } as Record<string, number>,
  incomeTaxCashRate: 0.1,
  /** 11 — Imposto de gás. */
  gasTax: { gas: 4 } as Record<string, number>,
  /** 14 — Subida do preço do petróleo (received). */
  priceRise: { oil2MT: 4, oil4MT: 8, oil6MT: 12 } as Record<string, number>,
  /** 19 — Baixa de preço do petróleo (paid). */
  priceFall: { oil2MT: 2, oil4MT: 4, oil6MT: 6 } as Record<string, number>,
} as const;

/** Flat payments to the bank (RULES.md §9). */
export const SPACE_FLAT_COST: Record<number, number> = {
  4: 50, // Temporal — avaria num petroleiro
  9: 5, // Incêndio nos depósitos de petróleo
  10: 4, // Temporal — grandes prejuízos numa torre
  12: 3, // Desastre com um camião cisterna
  15: 4, // Incêndio num poço
  18: 5, // Incêndio num depósito de gás
};

export const SPACE_NAMES: Record<number, string> = {
  1: 'Passagem de Ano',
  2: 'Duas licenças que não estavam em exploração foram confiscadas',
  3: 'Licença de exploração no mar',
  4: 'Temporal — avaria num petroleiro',
  5: 'Licença de exploração em terra',
  6: 'Imposto sobre petróleo',
  7: 'Compre uma torre de prospecção',
  8: 'Imposto de rendimento',
  9: 'Incêndio nos depósitos de petróleo',
  10: 'Temporal — grandes prejuízos numa torre',
  11: 'Imposto de gás',
  12: 'Desastre com um camião cisterna',
  13: 'Nacionalização',
  14: 'Subida do preço do petróleo',
  15: 'Incêndio num poço',
  16: 'Poço seco',
  17: 'Livre empresa',
  18: 'Incêndio num depósito de gás',
  19: 'Baixa de preço do petróleo',
  20: 'A sua conveniência',
};

export const CARD_NAMES: Record<CardType, string> = {
  torreOuLicenca: 'Compre 1 torre ou 1 licença',
  reservatorioGas: 'Reservatório de gás',
  reservatorio6MT: 'Reservatório de 6 M.T.',
  reservatorio4MT: 'Reservatório de 4 M.T.',
  reservatorio2MT: 'Reservatório de 2 M.T.',
  petroleiro: 'Petroleiro',
  camiaoCisterna: 'Camião cisterna',
};
