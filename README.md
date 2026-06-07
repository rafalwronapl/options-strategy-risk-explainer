# Derivatives Risk Explainer

Prototype of an educational options risk explainer.

The product angle is deliberately not "AI tells you what to trade". The core idea is:

> Deterministic math engine first. AI only explains calculated risk.

This static prototype runs locally in a browser and lets a user build a multi-leg option strategy, inspect payoff, Greeks, stress scenarios, and a plain-language risk report.

## Run

Open `index.html` in a browser.

No install, no API keys, no backend.

## Development

```bash
npm run check
```

The project is intentionally dependency-light. The prototype is plain HTML/CSS/JS and the tests run with Node.

## Current Scope

- European Black-Scholes approximation for calls and puts.
- Manual option legs: long/short, call/put, strike, premium, quantity, per-leg IV, bid, ask, open interest.
- Presets: covered call, bull call spread, iron condor, short strangle, long straddle, collar, ratio call spread.
- Payoff chart at expiry.
- Breakeven markers, strike markers, and current spot marker.
- Net Greeks estimate.
- Stress scenarios across price, IV, and time.
- Deterministic risk officer report.
- Save/load strategy JSON.
- Text risk report export.
- Browser Print/PDF report mode.
- Strategy vs underlying comparison.
- Exposure breakdown.
- IV stress shifts each option leg relative to its own IV.
- Liquidity warnings for wide bid/ask spreads and low open interest.
- CSV export for assumptions, legs, and scenario rows.
- Core math tests.

## Not In Scope Yet

- Trading signals.
- Buy/sell recommendations.
- Broker execution.
- Live market data.
- Tax, suitability, or personalized investment advice.
- Broker margin calculation.
- American exercise pricing.
- Borrow costs, skew, slippage, or commissions.

## Safety Design

The prototype separates calculation from explanation:

- deterministic code calculates payoff, Greeks, stress scenarios, liquidity warnings, and exact payoff tail classification;
- the report explains only calculated outputs;
- no LLM is used in the current version;
- future AI features should consume a JSON calculation bundle and must not invent market data or recommendations.

## Verification

Run:

```bash
npm run check
```

This checks JavaScript syntax and runs core math tests for:

- normal CDF,
- Black-Scholes call/put prices and dividend-yield effect,
- comma decimal parsing,
- bull call spread payoff,
- short call unlimited upside loss,
- iron condor defined risk/reward,
- covered call defined risk/reward,
- short strangle unlimited upside loss.

## Next Technical Steps

1. Add PDF export.
2. Add portfolio-level exposure by underlying and expiration.
3. Add better mobile chart controls.
4. Add margin/risk approximations per broker model.
5. Add optional data adapter for ORATS, Polygon, Tradier, IBKR, or Deribit.
6. Add LLM explanation layer only after all numbers are source-backed.
