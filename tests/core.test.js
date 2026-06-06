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
vm.runInContext(`${code}\nthis.__riskEngine = { blackScholes, legPayoffAtExpiry, totalPayoff, boundedness, exactPayoffRisk, normalCdf, parseNumeric, presets };`, sandbox);

const engine = sandbox.__riskEngine;

assert(Math.abs(engine.normalCdf(0) - 0.5) < 0.000001);
assert.strictEqual(engine.parseNumeric("4,5"), 4.5);
assert.strictEqual(engine.parseNumeric("4.5"), 4.5);

const call = engine.blackScholes("call", 100, 100, 1, 0.05, 0.2);
assert(Math.abs(call.price - 10.45) < 0.08, `call price was ${call.price}`);
assert(call.delta > 0.62 && call.delta < 0.65, `call delta was ${call.delta}`);

const put = engine.blackScholes("put", 100, 100, 1, 0.05, 0.2);
assert(Math.abs(put.price - 5.57) < 0.08, `put price was ${put.price}`);
assert(put.delta < -0.35 && put.delta > -0.40, `put delta was ${put.delta}`);

const bullCall = [
  { side: "long", type: "call", strike: 100, premium: 6, qty: 1 },
  { side: "short", type: "call", strike: 110, premium: 2, qty: 1 },
];
assert.strictEqual(engine.totalPayoff(bullCall, 90, 100), -400);
assert.strictEqual(engine.totalPayoff(bullCall, 105, 100), 100);
assert.strictEqual(engine.totalPayoff(bullCall, 120, 100), 600);

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

console.log("core tests passed");
