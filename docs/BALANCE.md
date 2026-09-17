# Nationalisation — what it is actually worth

Measured on the engine as it stands, by simulation. Every figure below comes from
running complete games with the `magnata` AI on all seats and reading the resulting
states; the method is reproducible from `src/engine/ai.ts` and `src/engine/scoring.ts`
without any change to either.

Sample: 300 games per player count, seeds 1..300, plus a 400-game run at 4 players
for the finer breakdowns. Amounts in millions, as the booklet counts them.

---

## 1. The question, and why the premise did not survive measurement

The question put was: *why does a company that scores half still win about 45% of
games?* **It does not.** At no player count does a nationalised company approach
parity, let alone 45%.

| Players | Companies ending nationalised | Share of wins, before the §4 fix | after |
| --- | --- | --- | --- |
| 2 | 28.8% | 22.3% | **19.1%** |
| 3 | 33.8% | 27.5% | **23.5%** |
| 4 | 35.2% | 22.6% | **20.3%** |
| 5 | 29.5% | 9.2% | **8.9%** |
| 6 | 31.1% | 7.3% | **4.7%** |

A nationalised company is under-represented among winners at every count, and the
penalty grows sharply with table size — at six players it takes under 5% of wins on
31% of finishes. That is the shape one would expect: more players means more turns,
and the cost of nationalisation is charged per turn, not at the end.

The "after" column is the engine as it now stands, with the price-list defect in §4
corrected. Both columns are 300 games per player count.

[Certain] on the numbers. The earlier 45% figure is not reproducible and should be
treated as superseded; I cannot reconstruct what it measured.

## 2. Where the cost actually falls

Per game at 4 players, summed across all companies:

| Effect | Value | Direction |
| --- | --- | --- |
| Annual profits forgone while nationalised | **92** | cost |
| End-of-game halving of deposits and trucks | **≈11** | cost |
| Board bills paid at half | **14** | benefit |
| ~~Assets bought at half list price~~ | ~~17~~ | removed, see §4 |

Net: roughly **90 per game** once the price-list defect is corrected, borne by about
1.4 companies. That matches the observed spread directly: at 4 players, mean total
**294** for a company that ends nationalised against **338** for one that does not —
a gap of 44, up from 33 before the fix.

**The end-of-game halving is not the mechanism.** It removes a mean of **8** from a
nationalised company's total, about 2.5% of it. Nationalisation hurts almost entirely
through the halved cash flow during play (`payBank` / `receiveFromBank` in
`src/engine/economy.ts`), not through `scorePlayer`.

The reason the scoring clause bites so little is what companies actually own at the
end. Per company, at 4 players:

| Licences | Towers | Deposits | Tanker shares | Trucks |
| --- | --- | --- | --- | --- |
| 3.36 | **0.00** | 1.40 | 0.60 | 0.74 |

Licences score nothing (§11). Tankers are exempt from nationalisation by the booklet.
That leaves deposits and trucks — about 13 of halvable value against a total of 320,
most of which is cash.

Towers at **0.00** is not a defect. Over 1,600 company-ends, not one tower survived:
1,129 were bought and 1,119 were immediately converted into deposits, which is correct
play, since a tower earns nothing per year and only a deposit does. Peak towers alive
on the board at any moment averages 2.1.

## 3. The scoring interpretation — settled, and what it cost

`src/engine/scoring.ts` halves a nationalised company's **towers, deposits and
trucks**, leaving **cash and tankers** whole. Three readings of *"só contará metade dos
seus bens"* were on the table:

| Reading | What halves | Games whose winner changes |
| --- | --- | --- |
| **Adopted** | towers + deposits + trucks | — |
| Marker-based (the code until now) | deposits + trucks | 0 of 400 |
| Whole total | everything, cash included | **89 of 400 (22%)** |

**Why the adopted reading.** §11 as transcribed says a nationalised company "counts
only half its **assets**", and the same section lists the winner's total as "towers +
oil and gas reservoirs + tankers + trucks + **cheques**" — cheques enumerated apart
from the assets. Space 13 states outright that tankers are not nationalised. Towers,
deposits and trucks are what is left.

**Why not the whole total.** It is a different game: cash is 222 of a 320 mean total,
so halving it swings a fifth of all games. It also charges nationalisation twice —
`receiveFromBank` has already taken half of every profit the company collected on its
way in. The clause reads as a statement about what the pieces on the board are worth,
not about the balance sheet.

**Why not marker-based.** Space 13 places a red marker "beside every oil and gas
deposit and every truck". That is the bookkeeping for the *in-play* halving — the
marker tells the banker which income to halve — and reading it as the definition of
the scoring clause makes §11's word "assets" do no work. Towers are assets, count at
their purchase price, and are not among the exemptions.

Including towers cost nothing measurable, exactly as expected: across 300 games at
each player count, **not one nationalised company ended holding a tower**, and every
win share is unchanged to three decimals. A tower earns nothing per year and is
converted into a deposit as soon as a deposit card allows. The line is there to make
the rule right in human play, where a tower can easily be standing when the deck runs
out.

[Likely], not [Certain]. The clause is short, and the reading turns on whether
"cheques" count among a company's *bens*. What would settle it is a photograph of the
booklet's scoring paragraph in the original Portuguese, or any published play report.
The whole-total reading is a two-line change in `scorePlayer` if that evidence ever
turns up.

## 4. A defect found while measuring — now fixed

`payBank` halves *every* outflow for a nationalised company, and purchases are routed
through it. A nationalised company therefore buys at half list price and scores the
asset at full price:

```
land licence, list price 7 — a nationalised company pays 4
```

[Certain] — asserted directly against the engine.

This is an arbitrage worth 17 per game at 4 players, and it is not what the booklet
describes. "Recebe ou paga metade de tudo" sits in a clause about profits and losses;
buying a licence at the price printed in the price list is neither. The affordability
check already uses the full price, so the company must *have* the full amount and then
pays half of it — which reads like an oversight rather than a decision.

**Fixed.** `payPrice` and `receivePrice` in `src/engine/economy.ts` now carry every
price-list transaction — licence, tower, deposit, tanker, truck, and the bank's
buy-back of a half share — while `payBank` and `receiveFromBank` keep the halving for
what the board imposes. Six tests in `tests/gameplay.test.ts` pin it; five of them
fail against the old routing.

The engine already had a precedent for the distinction: interest on a loan to the
bank was deliberately left unhalved, "a loan return, not a profit of the company's
operations". A price on the price list is the same kind of thing.

Effect: nationalised companies lose about 17 per game of unearned discount, and
their win share falls by roughly two points at most player counts and by 2.6 at six
(§1). The sign was already right; the fix widens a penalty that was being partly
refunded.
