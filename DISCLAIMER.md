# Disclaimer

This project is an educational options strategy risk analysis prototype.

It is not investment advice, legal advice, tax advice, brokerage advice, or a recommendation to buy, sell, hold, write, hedge, or exercise any financial instrument.

The software does not evaluate suitability, personal financial circumstances, portfolio objectives, or regulatory obligations. It does not connect to a broker, place orders, provide trading signals, or guarantee execution quality.

## Model Limits

The current prototype uses simplified deterministic calculations:

- European Black-Scholes approximation for mark-to-model option scenarios.
- Continuous dividend yield approximation.
- Manual option leg inputs.
- Manual bid, ask, and open interest fields.
- Expiry payoff classification based on entered legs.

It does not model:

- broker margin,
- early assignment pricing,
- American exercise valuation,
- discrete dividends,
- volatility surface/skew,
- transaction fees,
- slippage,
- taxes,
- borrow costs,
- hard-to-borrow effects,
- trading halts,
- liquidity shocks,
- settlement rules,
- exchange-specific contract adjustments.

## User Responsibility

All outputs depend on user-entered assumptions. Incorrect inputs produce incorrect outputs.

Use the tool only as a way to inspect assumptions, payoff shape, liquidity warnings, and scenario sensitivity. Verify any real trade with broker tools, exchange contract specifications, and qualified professionals where appropriate.
