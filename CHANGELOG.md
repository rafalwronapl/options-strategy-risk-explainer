# Changelog

## 0.1.0

Initial early prototype.

### Added

- Static browser app with no backend and no API keys.
- Manual multi-leg options strategy builder.
- Presets:
  - covered call,
  - bull call spread,
  - iron condor,
  - short strangle,
  - long straddle,
  - collar,
  - ratio call spread.
- Expiry payoff chart with spot, strike, and breakeven markers.
- Exact payoff risk classification for entered legs.
- Dynamic chart range for unlimited upside loss structures.
- Tail Risk Panel with P/L checkpoints at 2x, 3x, and 5x spot.
- Black-Scholes mark-to-model scenario estimates.
- Per-leg IV.
- Continuous dividend yield approximation.
- Stress scenarios for spot, IV, and time.
- Strategy vs underlying comparison.
- Exposure breakdown.
- Position summary.
- Risk flags.
- Liquidity fields:
  - bid,
  - ask,
  - open interest.
- Liquidity warnings:
  - missing liquidity data,
  - wide bid/ask spread,
  - zero open interest,
  - low open interest,
  - premium outside bid/ask,
  - spread cost vs max profit.
- Save/load strategy JSON.
- Text report export.
- CSV export.
- Browser Print/PDF mode with print-only Strategy Inputs.
- Example strategy fixtures.
- Core math/regression tests.
- GitHub Actions CI.
- Disclaimer and validation notes.

### Boundaries

- No trading signals.
- No recommendations.
- No broker execution.
- No live market data.
- No broker margin engine.
- No American exercise valuation.

