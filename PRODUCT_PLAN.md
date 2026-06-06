# Product Plan: Options/Futures Risk Explainer

## Thesis

The market is crowded with option screeners, strategy builders, backtesters, and trading bots. The more defensible product is a risk explainer:

> Paste or build a derivatives position. The system shows what can go wrong before the user trades.

The product should avoid recommendations and operate as education, risk analysis, and decision support.

## Competitor Map

### Strategy Builders And Payoff Calculators

- OptionStrat
- Option Builder
- OptionBuild
- VolStudios
- OptionProfitCalculator-style tools

These products already cover payoff diagrams, templates, and basic Greeks. A clone is weak.

### Backtesting And Automation

- Option Alpha
- Option Omega
- ORATS
- OptionStack
- NexusTrade
- Option Quants
- QuantConnect

This area is crowded and data-intensive. Competing directly means paying for historical options data and solving fill simulation, liquidity, assignment, expiry, and slippage details.

### Risk And Portfolio Tools

- OptionsRealTime
- Optioneer
- Edge Pad
- MimikTrader
- Edge Engine

This is closer to the opportunity. These products prove demand for risk visibility, but many are either broker-specific, futures-specific, execution-oriented, or aimed at active traders.

### AI Options Tools

- OptionPilot
- ORATS Otto
- AI strategy/signal products around Discord, screeners, and trade ideas

This space is risky if it promises trade selection. The safer wedge is AI as explainer, not decision-maker.

## Opportunity

The product should own this narrow promise:

> Explain my derivatives risk like a risk officer, using numbers I can inspect.

The wedge:

- not a signal service,
- not a broker,
- not a black-box AI,
- not a generic options calculator,
- but a clear risk translation layer for complex strategies.

## Target Users

1. Retail options traders who understand basics but struggle with multi-leg risk.
2. Investors using covered calls, cash-secured puts, wheels, spreads, and collars.
3. Crypto options traders on BTC/ETH who need scenario clarity.
4. Educators/newsletters who want shareable risk reports.
5. Small advisory/research teams that need readable position-risk summaries without giving trade advice.

## MVP

### Must Have

- Manual strategy builder.
- Preset strategies.
- Payoff chart at expiry.
- Scenario table:
  - spot down/up,
  - IV down/up,
  - time decay.
- Net Greeks.
- Max profit/loss where bounded.
- Plain-language risk report.
- Exportable report.

### Should Have

- Save/load strategy as JSON.
- Compare two structures side by side.
- Portfolio view by underlying and expiry.
- Assignment/early exercise warning for American options.
- Liquidity/spread warning fields entered manually.

### Later

- Live data adapter.
- Broker import.
- Deribit crypto options.
- ORATS/Polygon/Tradier data.
- AI explanation with strict grounding.
- Backtesting only after data quality is solved.

## Anti-Hallucination Design

The LLM must not:

- calculate option prices,
- invent market data,
- recommend trades,
- create price targets,
- claim probability without model output,
- hide assumptions.

The deterministic engine must produce:

- inputs,
- assumptions,
- formulas/model,
- scenario outputs,
- warnings.

The LLM may only explain:

- what the computed table means,
- which risks dominate,
- what questions the user should ask,
- what assumptions matter.

## Positioning

Possible names:

- Derivatives Risk Explainer
- Options Risk Officer
- Strategy Risk Lens
- Risk Before Trade
- Nonlinear Risk Lab

Best short positioning:

> Understand the trade before the trade understands you.

Safer positioning:

> Educational derivatives risk analysis. No signals. No recommendations.

## 30-Day Execution Plan

### Week 1

- Build static prototype.
- Add 5 strategy presets.
- Generate deterministic report.
- Share with 10-20 users.

### Week 2

- Add save/load JSON.
- Add report export.
- Add better risk classifications.
- Test with real strategies from forums.

### Week 3

- Add portfolio mode.
- Add side-by-side comparison.
- Add manual liquidity fields: bid/ask/spread/open interest.
- Add margin-risk notes.

### Week 4

- Decide market:
  - US equity options,
  - crypto options,
  - futures risk,
  - or educational B2B reports.
- Build landing page and waitlist.
- Collect pain points and willingness to pay.

## Kill Criteria

Stop or pivot if:

- users only ask for signals,
- users will not pay for risk explanation,
- data licensing makes MVP economics bad,
- competitors already provide the same risk report clearly,
- legal/compliance burden forces advisor-like behavior.

## Best Next Bet

Start with a browser-based educational options risk explainer. Do not integrate live data or AI until the deterministic engine feels useful.

