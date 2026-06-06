# Derivatives Risk Explainer

Prototype of an educational options risk explainer.

The product angle is deliberately not "AI tells you what to trade". The core idea is:

> Deterministic math engine first. AI only explains calculated risk.

This static prototype runs locally in a browser and lets a user build a multi-leg option strategy, inspect payoff, Greeks, stress scenarios, and a plain-language risk report.

## Run

Open `index.html` in a browser.

No install, no API keys, no backend.

## Current Scope

- European Black-Scholes approximation for calls and puts.
- Manual option legs: long/short, call/put, strike, premium, quantity.
- Presets: covered call, bull call spread, iron condor, short strangle, long straddle, collar, ratio call spread.
- Payoff chart at expiry.
- Breakeven markers, strike markers, and current spot marker.
- Net Greeks estimate.
- Stress scenarios across price, IV, and time.
- Deterministic risk officer report.
- Save/load strategy JSON.
- Text risk report export.
- Strategy vs underlying comparison.
- Exposure breakdown.
- Core math tests.

## Not In Scope Yet

- Trading signals.
- Buy/sell recommendations.
- Broker execution.
- Live market data.
- Tax, suitability, or personalized investment advice.
- Broker margin calculation.
- American exercise pricing.
- Dividends, borrow costs, skew, slippage, or commissions.

## Safety Design

The prototype separates calculation from explanation:

- deterministic code calculates payoff, Greeks, stress scenarios, and exact payoff tail classification;
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
- Black-Scholes call/put prices,
- comma decimal parsing,
- bull call spread payoff,
- short call unlimited upside loss,
- iron condor defined risk/reward,
- covered call defined risk/reward,
- short strangle unlimited upside loss.

## Next Technical Steps

1. Add per-leg IV and optional dividend yield.
2. Add CSV/PDF export.
3. Add portfolio-level exposure by underlying and expiration.
4. Add margin/risk approximations per broker model.
5. Add optional data adapter for ORATS, Polygon, Tradier, IBKR, or Deribit.
6. Add LLM explanation layer only after all numbers are source-backed.
