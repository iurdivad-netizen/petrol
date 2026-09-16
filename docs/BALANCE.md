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

| Players | Companies ending nationalised | Their share of wins |
| --- | --- | --- |
| 2 | 28.8% | 22.3% |
| 3 | 33.4% | 27.5% |
| 4 | 35.1% | 22.6% |
| 5 | 29.4% | 9.2% |
| 6 | 31.2% | 7.3% |

A nationalised company is under-represented among winners at every count, and the
penalty grows sharply with table size — at six players it takes 7% of wins on 31% of
finishes. That is the shape one would expect: more players means more turns, and the
cost of nationalisation is charged per turn, not at the end.

[Certain] on the numbers. The earlier 45% figure is not reproducible and should be
treated as superseded; I cannot reconstruct what it measured.

## 2. Where the cost actually falls

Per game at 4 players, summed across all companies:

| Effect | Value | Direction |
| --- | --- | --- |
| Annual profits forgone while nationalised | **92** | cost |
| End-of-game halving of deposits and trucks | **≈11** | cost |
| Board bills paid at half | **14** | benefit |
| Assets bought at half list price | **17** | benefit |

Net: roughly **70 per game**, borne by about 1.4 companies — some 50 each, against a
mean final total near 320. That matches the observed spread directly: mean total 303
for a company that ends nationalised against 336 for one that does not.

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

## 3. The scoring interpretation is the one thing that would change games

`src/engine/scoring.ts` carries a flagged interpretation: the booklet's *"só contará
metade"* is applied to deposits and trucks, not to cash, towers or tankers. The
alternative reading — halve the company's entire final total — **changes the winner in
89 of 400 games (22%)**.

That is not a detail. It is the single largest open rules question in the codebase,
because cash is 222 of a 320 mean total: halving it is a different game.

The current reading is the better-supported one, and I would not change it:

- §11 as transcribed says a nationalised company "counts only half its **assets**",
  and the same section lists the winner's total as "towers + oil and gas reservoirs +
  tankers + trucks + **cheques**" — cheques enumerated separately from the assets.
- Space 13 places a red marker "beside every oil and gas deposit and every truck",
  and states that tankers are not nationalised. The halving is described against
  specific pieces on the board, not against a company's balance.
- The in-play halving already charges nationalisation against every profit the
  company collects. Halving the accumulated cash as well charges the same thing twice.

[Likely], not [Certain]: the clause is short and the reading turns on whether
"cheques" count as assets. What would settle it is a photograph of the booklet's
scoring paragraph in the original Portuguese, or any published play report.

One narrower gap, noted for completeness: the current code omits **towers** from the
halving, on the marker-based rationale. The "half its assets" reading would include
them. Since no tower has ever survived to scoring in 1,600 measured company-ends, the
distinction is worth exactly nothing in play, and is not worth resolving.

## 4. A defect found while measuring, not yet changed

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

The fix is one line of routing: purchases should debit cash directly, leaving
`payBank` for board-imposed losses. It would cost nationalised companies about 17 per
game, widening a penalty that is already the right sign. **Not changed** — the rule
behind it is booklet-sourced and the call belongs to the project owner.
