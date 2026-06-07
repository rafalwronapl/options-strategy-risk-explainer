const fs = require("fs");
const vm = require("vm");
const path = require("path");
const assert = require("assert");

const code = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8").replace("setPreset(\"ironCondor\");", "");
const sandbox = {
  document: {
    getElementById() {
      return {
        getContext() {
          return {};
        },
        addEventListener() {},
        querySelectorAll() {
          return [];
        },
      };
    },
    querySelectorAll() {
      return [];
    },
  },
  window: { addEventListener() {}, devicePixelRatio: 1 },
  console,
};

vm.createContext(sandbox);
vm.runInContext(`${code}\nthis.__riskEngine = { blackScholes, legPayoffAtExpiry, totalPayoff, boundedness, exactPayoffRisk, breakEvens, chartRange, normalCdf, parseNumeric, parseOptionalNumeric, csvEscape, presets, greeks, scenarioRows, reportBlocks };`, sandbox);

const engine = sandbox.__riskEngine;

assert(Math.abs(engine.normalCdf(0) - 0.5) < 0.000001);
assert.strictEqual(engine.parseNumeric("4,5"), 4.5);
assert.strictEqual(engine.parseNumeric("4.5"), 4.5);
assert(Number.isNaN(engine.parseOptionalNumeric("")));
assert.strictEqual(engine.parseOptionalNumeric("1,25"), 1.25);
assert.strictEqual(engine.csvEscape('a,"b"'), '"a,""b"""');

const call = engine.blackScholes("call", 100, 100, 1, 0.05, 0.2);
assert(Math.abs(call.price - 10.45) < 0.08, `call price was ${call.price}`);
assert(call.delta > 0.62 && call.delta < 0.65, `call delta was ${call.delta}`);

const put = engine.blackScholes("put", 100, 100, 1, 0.05, 0.2);
assert(Math.abs(put.price - 5.57) < 0.08, `put price was ${put.price}`);
assert(put.delta < -0.35 && put.delta > -0.40, `put delta was ${put.delta}`);

const dividendCall = engine.blackScholes("call", 100, 100, 1, 0.05, 0.2, 0.03);
assert(dividendCall.price < call.price, "dividend yield should reduce call value");

const bullCall = [
  { side: "long", type: "call", strike: 100, premium: 6, qty: 1 },
  { side: "short", type: "call", strike: 110, premium: 2, qty: 1 },
];
assert.strictEqual(engine.totalPayoff(bullCall, 90, 100), -400);
assert.strictEqual(engine.totalPayoff(bullCall, 105, 100), 100);
assert.strictEqual(engine.totalPayoff(bullCall, 120, 100), 600);
const bullCallBreakEvens = engine.breakEvens(bullCall, { spot: 100, multiplier: 100 });
assert.strictEqual(bullCallBreakEvens.length, 1);
assert.strictEqual(bullCallBreakEvens[0], 104);

const shortCall = [{ side: "short", type: "call", strike: 100, premium: 3, qty: 1 }];
const points = [90, 100, 110, 120, 130].map((spot) => ({
  spot,
  value: engine.totalPayoff(shortCall, spot, 100),
}));
assert.strictEqual(engine.boundedness(points).upsideUnbounded, true);
assert.strictEqual(engine.exactPayoffRisk(shortCall, { spot: 100, multiplier: 100 }).upsideUnlimitedLoss, true);
assert.strictEqual(engine.exactPayoffRisk(shortCall, { spot: 100, multiplier: 100 }).definedRisk, false);

const ironCondorRisk = engine.exactPayoffRisk(engine.presets.ironCondor, { spot: 500, multiplier: 100 });
assert.strictEqual(ironCondorRisk.definedRisk, true);
assert.strictEqual(ironCondorRisk.definedReward, true);
assert.strictEqual(ironCondorRisk.max, 450);
assert.strictEqual(ironCondorRisk.min, -1550);

const coveredCallRisk = engine.exactPayoffRisk(engine.presets.coveredCall, { spot: 500, multiplier: 100 });
assert.strictEqual(coveredCallRisk.definedRisk, true);
assert.strictEqual(coveredCallRisk.definedReward, true);

const strangleRisk = engine.exactPayoffRisk(engine.presets.shortStrangle, { spot: 500, multiplier: 100 });
assert.strictEqual(strangleRisk.definedRisk, false);
assert.strictEqual(strangleRisk.upsideUnlimitedLoss, true);
assert(engine.chartRange(engine.presets.shortStrangle, { spot: 500 }, strangleRisk).high >= 1000);

const stockOnly = [{ side: "long", type: "stock", strike: 0, premium: 100, qty: 1 }];
const stockOnlyRisk = engine.exactPayoffRisk(stockOnly, { spot: 100, multiplier: 100 });
assert.strictEqual(stockOnlyRisk.definedRisk, true);
assert.strictEqual(stockOnlyRisk.definedReward, false);
assert.strictEqual(stockOnlyRisk.min, -10000);
assert.strictEqual(engine.breakEvens(stockOnly, { spot: 100, multiplier: 100 })[0], 100);

const shortPut = [{ side: "short", type: "put", strike: 95, premium: 3, qty: 1 }];
const shortPutRisk = engine.exactPayoffRisk(shortPut, { spot: 100, multiplier: 100 });
assert.strictEqual(shortPutRisk.definedRisk, true);
assert.strictEqual(shortPutRisk.definedReward, true);
assert.strictEqual(shortPutRisk.min, -9200);
assert.strictEqual(shortPutRisk.max, 300);
assert.strictEqual(engine.breakEvens(shortPut, { spot: 100, multiplier: 100 })[0], 92);

const collarRisk = engine.exactPayoffRisk(engine.presets.collar, { spot: 500, multiplier: 100 });
assert.strictEqual(collarRisk.definedRisk, true);
assert.strictEqual(collarRisk.definedReward, true);

const ratioRisk = engine.exactPayoffRisk(engine.presets.ratioCallSpread, { spot: 500, multiplier: 100 });
assert.strictEqual(ratioRisk.definedRisk, false);
assert.strictEqual(ratioRisk.upsideUnlimitedLoss, true);

const brokenWingCondor = [
  { side: "long", type: "put", strike: 450, premium: 1, qty: 1 },
  { side: "short", type: "put", strike: 470, premium: 4, qty: 1 },
  { side: "short", type: "call", strike: 530, premium: 4, qty: 1 },
  { side: "long", type: "call", strike: 560, premium: 1, qty: 1 },
];
const brokenWingRisk = engine.exactPayoffRisk(brokenWingCondor, { spot: 500, multiplier: 100 });
assert.strictEqual(brokenWingRisk.definedRisk, true);
assert.strictEqual(brokenWingRisk.definedReward, true);

const market = { symbol: "SPY", spot: 500, days: 35, iv: 0.22, rate: 0.045, dividend: 0, multiplier: 100 };
const coveredCallReport = engine.reportBlocks(
  engine.presets.coveredCall,
  market,
  coveredCallRisk,
  engine.greeks(engine.presets.coveredCall, market),
  engine.scenarioRows(engine.presets.coveredCall, market)
);
assert(!coveredCallReport.some((block) => block.title === "Expiry payoff risk: unlimited loss"));

const strangleReport = engine.reportBlocks(
  engine.presets.shortStrangle,
  market,
  strangleRisk,
  engine.greeks(engine.presets.shortStrangle, market),
  engine.scenarioRows(engine.presets.shortStrangle, market)
);
assert(strangleReport.some((block) => block.title === "Expiry payoff risk: unlimited loss"));

const missingLiquidityReport = engine.reportBlocks(
  engine.presets.ironCondor,
  market,
  ironCondorRisk,
  engine.greeks(engine.presets.ironCondor, market),
  engine.scenarioRows(engine.presets.ironCondor, market)
);
assert(missingLiquidityReport.some((block) => block.title === "Missing liquidity data"));

const badMarketLegs = [{ side: "long", type: "call", strike: 100, premium: 5, qty: 1, iv: 0.2, bid: 6, ask: 7, openInterest: 0 }];
const badMarketRisk = engine.exactPayoffRisk(badMarketLegs, { spot: 100, multiplier: 100 });
const badMarketReport = engine.reportBlocks(
  badMarketLegs,
  { symbol: "T", spot: 100, days: 30, iv: 0.2, rate: 0.04, dividend: 0, multiplier: 100 },
  badMarketRisk,
  engine.greeks(badMarketLegs, { spot: 100, days: 30, iv: 0.2, rate: 0.04, dividend: 0, multiplier: 100 }),
  engine.scenarioRows(badMarketLegs, { spot: 100, days: 30, iv: 0.2, rate: 0.04, dividend: 0, multiplier: 100 })
);
assert(badMarketReport.some((block) => block.title === "Entered premium outside bid/ask"));
assert(badMarketReport.some((block) => block.title === "Zero open interest"));

const spreadHeavyLegs = [
  { side: "long", type: "call", strike: 100, premium: 1, qty: 1, iv: 0.2, bid: 0.5, ask: 1.5, openInterest: 200 },
  { side: "short", type: "call", strike: 102, premium: 0.4, qty: 1, iv: 0.2, bid: 0.1, ask: 0.7, openInterest: 200 },
];
const spreadHeavyMarket = { spot: 100, days: 20, iv: 0.2, rate: 0.04, dividend: 0, multiplier: 100 };
const spreadHeavyRisk = engine.exactPayoffRisk(spreadHeavyLegs, spreadHeavyMarket);
const spreadHeavyReport = engine.reportBlocks(
  spreadHeavyLegs,
  spreadHeavyMarket,
  spreadHeavyRisk,
  engine.greeks(spreadHeavyLegs, spreadHeavyMarket),
  engine.scenarioRows(spreadHeavyLegs, spreadHeavyMarket)
);
assert(spreadHeavyReport.some((block) => block.title === "Spread cost vs max profit"));

const exampleExpectations = [
  ["iron-condor-defined-risk.json", true],
  ["covered-call-dividend-risk.json", true],
  ["short-strangle-unlimited-risk.json", false],
];

for (const [fileName, definedRisk] of exampleExpectations) {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "examples", fileName), "utf8"));
  const risk = engine.exactPayoffRisk(fixture.legs, fixture.market);
  assert.strictEqual(risk.definedRisk, definedRisk, `${fileName} definedRisk`);
  const rows = engine.scenarioRows(fixture.legs, fixture.market);
  assert(rows.length >= 5, `${fileName} scenarios`);
  const report = engine.reportBlocks(
    fixture.legs,
    fixture.market,
    risk,
    engine.greeks(fixture.legs, fixture.market),
    rows
  );
  assert(report.length >= 4, `${fileName} report blocks`);
}

console.log("core tests passed");
