# Validation Notes

The prototype is designed around a simple rule:

> Numbers must come from deterministic code. Explanations must describe those numbers.

## Current Automated Checks

Run:

```bash
npm run check
```

This performs:

- JavaScript syntax check.
- Normal CDF sanity check.
- Black-Scholes call/put price checks.
- Dividend-yield direction check.
- Comma decimal parser check.
- Bull call spread payoff checks.
- Breakeven check for a bull call spread.
- Short call unlimited upside loss check.
- Iron condor defined risk/reward check.
- Covered call defined risk/reward check.
- Short strangle unlimited loss check.
- Report block checks for covered call and short strangle.
- Liquidity warning checks.
- Fixture checks for JSON examples.

## Manual Regression Fixtures

Load these through `Load JSON`:

- `examples/iron-condor-defined-risk.json`
- `examples/short-strangle-unlimited-risk.json`
- `examples/covered-call-dividend-risk.json`

Expected behavior:

- Iron condor: defined expiry payoff risk.
- Short strangle: unlimited upside loss risk.
- Covered call: defined expiry payoff risk, dividend yield visible, low open interest warning.

## Known Model Boundaries

The current math is appropriate for an educational prototype, not for production trading:

- Black-Scholes scenarios are approximation only.
- Payoff classification assumes nonnegative underlying prices.
- One expiration is assumed in the UI.
- Per-leg IV is manual, not sourced from a volatility surface.
- Liquidity data is manual and not time-stamped.
- Spread cost is full bid/ask width, not expected slippage.
- Broker margin is not calculated.
