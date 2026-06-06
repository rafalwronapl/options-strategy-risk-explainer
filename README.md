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
- Presets: covered call, bull call spread, iron condor, short strangle, long straddle.
- Payoff chart at expiry.
- Net Greeks estimate.
- Stress scenarios across price, IV, and time.
- Deterministic risk officer report.

## Not In Scope Yet

- Trading signals.
- Buy/sell recommendations.
- Broker execution.
- Live market data.
- Tax, suitability, or personalized investment advice.

## Next Technical Steps

1. Add input validation for real broker/import data.
2. Add portfolio-level exposure by underlying and expiration.
3. Add margin/risk approximations per broker model.
4. Add CSV/PDF export.
5. Add optional data adapter for ORATS, Polygon, Tradier, IBKR, or Deribit.
6. Add LLM explanation layer only after all numbers are source-backed.

