const legsEl = document.getElementById("legs");
const summaryEl = document.getElementById("summary");
const scenariosEl = document.getElementById("scenarios");
const reportEl = document.getElementById("riskReport");
const validationEl = document.getElementById("validation");
const exposureEl = document.getElementById("exposure");
const comparisonEl = document.getElementById("comparison");
const chart = document.getElementById("payoffChart");
const ctx = chart.getContext("2d");

const presets = {
  coveredCall: [
    { side: "long", type: "stock", strike: 0, premium: 500, qty: 1 },
    { side: "short", type: "call", strike: 520, premium: 6.2, qty: 1 },
  ],
  bullCall: [
    { side: "long", type: "call", strike: 500, premium: 14, qty: 1 },
    { side: "short", type: "call", strike: 530, premium: 5, qty: 1 },
  ],
  ironCondor: [
    { side: "short", type: "put", strike: 470, premium: 4, qty: 1 },
    { side: "long", type: "put", strike: 450, premium: 1.8, qty: 1 },
    { side: "short", type: "call", strike: 530, premium: 4.2, qty: 1 },
    { side: "long", type: "call", strike: 550, premium: 1.9, qty: 1 },
  ],
  shortStrangle: [
    { side: "short", type: "put", strike: 470, premium: 6.8, qty: 1 },
    { side: "short", type: "call", strike: 530, premium: 7.1, qty: 1 },
  ],
  longStraddle: [
    { side: "long", type: "call", strike: 500, premium: 15.2, qty: 1 },
    { side: "long", type: "put", strike: 500, premium: 13.8, qty: 1 },
  ],
  collar: [
    { side: "long", type: "stock", strike: 0, premium: 500, qty: 1 },
    { side: "long", type: "put", strike: 470, premium: 6.1, qty: 1 },
    { side: "short", type: "call", strike: 530, premium: 5.8, qty: 1 },
  ],
  ratioCallSpread: [
    { side: "long", type: "call", strike: 500, premium: 14, qty: 1 },
    { side: "short", type: "call", strike: 530, premium: 5, qty: 2 },
  ],
  putCalendarApprox: [
    { side: "short", type: "put", strike: 500, premium: 8, qty: 1 },
    { side: "long", type: "put", strike: 500, premium: 13, qty: 1 },
  ],
};

function normalCdf(x) {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * z);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * erf);
}

function normalPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function blackScholes(type, spot, strike, years, rate, vol) {
  if (years <= 0 || vol <= 0 || strike <= 0 || spot <= 0) {
    const intrinsic = type === "call" ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
    return { price: intrinsic, delta: type === "call" ? (spot > strike ? 1 : 0) : (spot < strike ? -1 : 0), gamma: 0, theta: 0, vega: 0 };
  }

  const sqrtT = Math.sqrt(years);
  const d1 = (Math.log(spot / strike) + (rate + 0.5 * vol * vol) * years) / (vol * sqrtT);
  const d2 = d1 - vol * sqrtT;
  const disc = Math.exp(-rate * years);
  const pdf = normalPdf(d1);

  if (type === "call") {
    return {
      price: spot * normalCdf(d1) - strike * disc * normalCdf(d2),
      delta: normalCdf(d1),
      gamma: pdf / (spot * vol * sqrtT),
      theta: (-(spot * pdf * vol) / (2 * sqrtT) - rate * strike * disc * normalCdf(d2)) / 365,
      vega: spot * pdf * sqrtT / 100,
    };
  }

  return {
    price: strike * disc * normalCdf(-d2) - spot * normalCdf(-d1),
    delta: normalCdf(d1) - 1,
    gamma: pdf / (spot * vol * sqrtT),
    theta: (-(spot * pdf * vol) / (2 * sqrtT) + rate * strike * disc * normalCdf(-d2)) / 365,
    vega: spot * pdf * sqrtT / 100,
  };
}

function money(value) {
  if (!Number.isFinite(value)) return "unbounded";
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function parseNumeric(value) {
  if (typeof value === "number") return value;
  return Number(String(value).replace(",", "."));
}

function readInputs() {
  return {
    symbol: document.getElementById("symbol").value.trim() || "UNDERLYING",
    spot: parseNumeric(document.getElementById("spot").value),
    days: parseNumeric(document.getElementById("days").value),
    iv: parseNumeric(document.getElementById("iv").value) / 100,
    rate: parseNumeric(document.getElementById("rate").value) / 100,
    multiplier: parseNumeric(document.getElementById("multiplier").value),
  };
}

function readLegs() {
  return [...document.querySelectorAll(".leg")].map((node) => ({
    side: node.querySelector(".side").value,
    type: node.querySelector(".type").value,
    strike: parseNumeric(node.querySelector(".strike").value),
    premium: parseNumeric(node.querySelector(".premium").value),
    qty: parseNumeric(node.querySelector(".qty").value),
  }));
}

function strategySnapshot() {
  return {
    version: 1,
    market: readInputs(),
    legs: readLegs(),
  };
}

function validateStrategy(market, legs) {
  const errors = [];
  if (!Number.isFinite(market.spot) || market.spot <= 0) errors.push("Spot price must be positive.");
  if (!Number.isFinite(market.days) || market.days < 0) errors.push("Days to expiry must be zero or positive.");
  if (!Number.isFinite(market.iv) || market.iv <= 0) errors.push("Implied volatility must be positive.");
  if (!Number.isFinite(market.multiplier) || market.multiplier <= 0) errors.push("Contract multiplier must be positive.");
  if (!legs.length) errors.push("Add at least one leg.");
  legs.forEach((leg, index) => {
    const label = `Leg ${index + 1}`;
    if (!["long", "short"].includes(leg.side)) errors.push(`${label}: side must be long or short.`);
    if (!["call", "put", "stock"].includes(leg.type)) errors.push(`${label}: type must be call, put, or stock.`);
    if (leg.type !== "stock" && (!Number.isFinite(leg.strike) || leg.strike <= 0)) errors.push(`${label}: option strike must be positive.`);
    if (!Number.isFinite(leg.premium) || leg.premium < 0) errors.push(`${label}: premium/cost must be zero or positive.`);
    if (!Number.isFinite(leg.qty) || leg.qty <= 0) errors.push(`${label}: quantity must be positive.`);
  });
  return errors;
}

function showValidation(errors) {
  validationEl.hidden = errors.length === 0;
  validationEl.innerHTML = errors.map((error) => `<div>${error}</div>`).join("");
}

function signed(leg) {
  return leg.side === "long" ? 1 : -1;
}

function legPayoffAtExpiry(leg, spot, multiplier) {
  const q = leg.qty * multiplier * signed(leg);
  if (leg.type === "stock") return q * (spot - leg.premium);
  const intrinsic = leg.type === "call" ? Math.max(0, spot - leg.strike) : Math.max(0, leg.strike - spot);
  return q * (intrinsic - leg.premium);
}

function legMarkToModel(leg, market) {
  const q = leg.qty * market.multiplier * signed(leg);
  if (leg.type === "stock") return q * (market.spot - leg.premium);
  const years = Math.max(0, market.days) / 365;
  const model = blackScholes(leg.type, market.spot, leg.strike, years, market.rate, market.iv);
  return q * (model.price - leg.premium);
}

function totalPayoff(legs, spot, multiplier) {
  return legs.reduce((sum, leg) => sum + legPayoffAtExpiry(leg, spot, multiplier), 0);
}

function totalModelPl(legs, market) {
  return legs.reduce((sum, leg) => sum + legMarkToModel(leg, market), 0);
}

function payoffSlopeAtInfinity(legs, direction, multiplier) {
  return legs.reduce((sum, leg) => {
    const q = leg.qty * multiplier * signed(leg);
    if (leg.type === "stock") return sum + q;
    if (direction === "up" && leg.type === "call") return sum + q;
    if (direction === "down" && leg.type === "put") return sum - q;
    return sum;
  }, 0);
}

function exactPayoffRisk(legs, market) {
  const strikes = [...new Set(legs.filter((leg) => leg.type !== "stock").map((leg) => leg.strike))]
    .filter((strike) => Number.isFinite(strike) && strike > 0)
    .sort((a, b) => a - b);
  const upSlope = payoffSlopeAtInfinity(legs, "up", market.multiplier);
  const downsideUnlimitedLoss = false;
  const upsideUnlimitedLoss = upSlope < 0;
  const downsideUnlimitedProfit = false;
  const upsideUnlimitedProfit = upSlope > 0;
  const pointsToCheck = [0, ...strikes, market.spot].filter((spot) => Number.isFinite(spot) && spot >= 0);
  const values = pointsToCheck.map((spot) => ({ spot, value: totalPayoff(legs, spot, market.multiplier) }));
  const finiteMin = Math.min(...values.map((point) => point.value));
  const finiteMax = Math.max(...values.map((point) => point.value));
  return {
    values,
    finiteMin,
    finiteMax,
    min: downsideUnlimitedLoss || upsideUnlimitedLoss ? -Infinity : finiteMin,
    max: downsideUnlimitedProfit || upsideUnlimitedProfit ? Infinity : finiteMax,
    downsideUnlimitedLoss,
    upsideUnlimitedLoss,
    downsideUnlimitedProfit,
    upsideUnlimitedProfit,
    definedRisk: !(downsideUnlimitedLoss || upsideUnlimitedLoss),
    definedReward: !(downsideUnlimitedProfit || upsideUnlimitedProfit),
  };
}

function greeks(legs, market) {
  return legs.reduce((acc, leg) => {
    if (leg.type === "stock") {
      acc.delta += leg.qty * market.multiplier * signed(leg);
      return acc;
    }
    const model = blackScholes(leg.type, market.spot, leg.strike, market.days / 365, market.rate, market.iv);
    const q = leg.qty * market.multiplier * signed(leg);
    acc.delta += model.delta * q;
    acc.gamma += model.gamma * q;
    acc.theta += model.theta * q;
    acc.vega += model.vega * q;
    return acc;
  }, { delta: 0, gamma: 0, theta: 0, vega: 0 });
}

function addLeg(leg = { side: "long", type: "call", strike: 500, premium: 10, qty: 1 }) {
  const row = document.createElement("div");
  row.className = "leg";
  row.innerHTML = `
    <label>Side
      <select class="side">
        <option value="long">Long</option>
        <option value="short">Short</option>
      </select>
    </label>
    <label>Type
      <select class="type">
        <option value="call">Call</option>
        <option value="put">Put</option>
        <option value="stock">Stock</option>
      </select>
    </label>
    <label>Strike
      <input class="strike" type="number" step="0.01">
    </label>
    <label>Premium/Cost
      <input class="premium" type="number" step="0.01">
    </label>
    <label>Qty
      <input class="qty" type="number" step="1" min="1">
    </label>
    <button class="removeLeg" type="button" title="Remove leg">x</button>
  `;
  row.querySelector(".side").value = leg.side;
  row.querySelector(".type").value = leg.type;
  row.querySelector(".strike").value = leg.strike;
  row.querySelector(".premium").value = leg.premium;
  row.querySelector(".qty").value = leg.qty;
  row.querySelector(".removeLeg").addEventListener("click", () => {
    row.remove();
    render();
  });
  row.querySelectorAll("input, select").forEach((el) => el.addEventListener("input", render));
  legsEl.appendChild(row);
}

function setPreset(name) {
  legsEl.innerHTML = "";
  presets[name].forEach(addLeg);
  render();
}

function setStrategy(snapshot) {
  const market = snapshot.market || {};
  if (market.symbol) document.getElementById("symbol").value = market.symbol;
  if (Number.isFinite(market.spot)) document.getElementById("spot").value = market.spot;
  if (Number.isFinite(market.days)) document.getElementById("days").value = market.days;
  if (Number.isFinite(market.iv)) document.getElementById("iv").value = market.iv > 1 ? market.iv : market.iv * 100;
  if (Number.isFinite(market.rate)) document.getElementById("rate").value = market.rate > 1 ? market.rate : market.rate * 100;
  if (Number.isFinite(market.multiplier)) document.getElementById("multiplier").value = market.multiplier;
  legsEl.innerHTML = "";
  (snapshot.legs || []).forEach(addLeg);
  render();
}

function payoffSeries(legs, market) {
  const low = market.spot * 0.65;
  const high = market.spot * 1.35;
  const points = [];
  for (let i = 0; i <= 80; i += 1) {
    const spot = low + ((high - low) * i) / 80;
    points.push({ spot, value: totalPayoff(legs, spot, market.multiplier) });
  }
  return points;
}

function breakEvens(legs, market) {
  const strikes = [...new Set(legs.filter((leg) => leg.type !== "stock").map((leg) => leg.strike))]
    .filter((strike) => Number.isFinite(strike) && strike > 0)
    .sort((a, b) => a - b);
  const bounds = [0, ...strikes, Math.max(market.spot * 2, (strikes.at(-1) || market.spot) * 1.5)]
    .filter((value, index, arr) => Number.isFinite(value) && value >= 0 && arr.indexOf(value) === index)
    .sort((a, b) => a - b);
  const roots = [];

  for (let i = 0; i < bounds.length - 1; i += 1) {
    const left = bounds[i];
    const right = bounds[i + 1];
    const leftValue = totalPayoff(legs, left, market.multiplier);
    const rightValue = totalPayoff(legs, right, market.multiplier);
    if (leftValue === 0) roots.push(left);
    if (leftValue * rightValue < 0) {
      const root = left + (right - left) * (Math.abs(leftValue) / (Math.abs(leftValue) + Math.abs(rightValue)));
      roots.push(root);
    }
  }
  if (totalPayoff(legs, bounds.at(-1), market.multiplier) === 0) roots.push(bounds.at(-1));
  return [...new Set(roots.map((root) => Number(root.toFixed(4))))].sort((a, b) => a - b);
}

function boundedness(points) {
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const min = Math.min(...points.map((p) => p.value));
  const max = Math.max(...points.map((p) => p.value));
  const downsideSlope = points[1].value - first;
  const upsideSlope = last - points[points.length - 2].value;
  return {
    min,
    max,
    downsideUnbounded: downsideSlope < -1,
    upsideUnbounded: upsideSlope < -1,
  };
}

function drawChart(points, legs, market, breakevens) {
  const dpr = window.devicePixelRatio || 1;
  const rect = chart.getBoundingClientRect();
  chart.width = Math.round(rect.width * dpr);
  chart.height = Math.round(360 * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = rect.width;
  const height = 360;
  const pad = 40;
  ctx.clearRect(0, 0, width, height);

  const xs = points.map((p) => p.spot);
  const ys = points.map((p) => p.value);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 0);
  const ySpan = maxY - minY || 1;

  const xScale = (x) => pad + ((x - minX) / (maxX - minX)) * (width - pad * 2);
  const yScale = (y) => height - pad - ((y - minY) / ySpan) * (height - pad * 2);

  ctx.strokeStyle = "#d7dfdb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, yScale(0));
  ctx.lineTo(width - pad, yScale(0));
  ctx.stroke();

  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = xScale(point.spot);
    const y = yScale(point.value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const strikes = [...new Set(legs.filter((leg) => leg.type !== "stock").map((leg) => leg.strike))]
    .filter((strike) => strike >= minX && strike <= maxX)
    .sort((a, b) => a - b);

  ctx.strokeStyle = "#9aa5a1";
  ctx.setLineDash([2, 5]);
  strikes.forEach((strike) => {
    const x = xScale(strike);
    ctx.beginPath();
    ctx.moveTo(x, pad);
    ctx.lineTo(x, height - pad);
    ctx.stroke();
    ctx.fillStyle = "#5d6965";
    ctx.fillText(String(Math.round(strike)), x + 4, height - pad - 8);
  });

  ctx.strokeStyle = "#a15c10";
  ctx.setLineDash([5, 5]);
  breakevens.filter((point) => point >= minX && point <= maxX).forEach((point) => {
    const x = xScale(point);
    ctx.beginPath();
    ctx.moveTo(x, pad);
    ctx.lineTo(x, height - pad);
    ctx.stroke();
    ctx.fillStyle = "#a15c10";
    ctx.fillText("BE", x + 4, pad + 30);
  });

  ctx.strokeStyle = "#a12b2b";
  ctx.setLineDash([6, 5]);
  if (Number.isFinite(market.spot)) {
    const x = xScale(market.spot);
    ctx.beginPath();
    ctx.moveTo(x, pad);
    ctx.lineTo(x, height - pad);
    ctx.stroke();
    ctx.fillStyle = "#a12b2b";
    ctx.fillText("spot", x + 5, pad + 14);
  }
  ctx.setLineDash([]);

  ctx.fillStyle = "#5d6965";
  ctx.font = "12px Segoe UI, Arial";
  ctx.fillText(`Low ${money(minY)}`, pad, height - 12);
  ctx.fillText(`High ${money(maxY)}`, pad, 18);
  ctx.fillText(`${Math.round(minX)}`, pad, height - pad + 22);
  ctx.fillText(`${Math.round(maxX)}`, width - pad - 30, height - pad + 22);
}

function scenarioRows(legs, market) {
  const base = totalModelPl(legs, market);
  return [
    ["Spot -10%", market.spot * 0.9, market.iv, market.days],
    ["Spot -5%", market.spot * 0.95, market.iv, market.days],
    ["Base", market.spot, market.iv, market.days],
    ["Spot +5%", market.spot * 1.05, market.iv, market.days],
    ["Spot +10%", market.spot * 1.1, market.iv, market.days],
    ["IV -20 pts", market.spot, Math.max(0.01, market.iv - 0.2), market.days],
    ["IV +20 pts", market.spot, market.iv + 0.2, market.days],
    ["Half time left", market.spot, market.iv, Math.max(0, market.days / 2)],
    ["Expiry", market.spot, market.iv, 0],
  ].map(([name, spot, iv, days]) => {
    const pl = totalModelPl(legs, { ...market, spot, iv, days });
    return { name, spot, iv, days, pl, delta: pl - base };
  });
}

function renderSummary(market, points, risk, netGreeks) {
  const badge = document.getElementById("boundedBadge");
  badge.textContent = risk.definedRisk ? "Defined risk" : "Unlimited loss risk";
  badge.className = `badge ${risk.definedRisk ? "" : "danger"}`;

  const breakevenText = breakEvens(readLegs(), market).map((point) => point.toFixed(2)).join(", ") || "none";
  summaryEl.innerHTML = [
    ["Max Profit", Number.isFinite(risk.max) ? money(risk.max) : "unlimited"],
    ["Max Loss", Number.isFinite(risk.min) ? money(risk.min) : "unlimited"],
    ["Breakeven", breakevenText],
    ["Net Delta", netGreeks.delta.toFixed(1)],
    ["Net Theta / Day", money(netGreeks.theta)],
    ["Net Vega / 1 IV pt", money(netGreeks.vega)],
    ["Net Gamma", netGreeks.gamma.toFixed(3)],
    ["Spot", market.spot.toFixed(2)],
    ["Days", market.days.toFixed(0)],
  ].map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function renderScenarios(rows) {
  scenariosEl.innerHTML = rows.map((row) => {
    const cls = row.pl >= 0 ? "profit" : "loss";
    return `
      <tr>
        <td>${row.name}</td>
        <td>${row.spot.toFixed(2)}</td>
        <td>${(row.iv * 100).toFixed(1)}%</td>
        <td>${row.days.toFixed(0)}</td>
        <td class="${cls}">${money(row.pl)}</td>
      </tr>
    `;
  }).join("");
}

function renderComparison(rows, market) {
  comparisonEl.innerHTML = rows
    .filter((row) => ["Spot -10%", "Spot -5%", "Base", "Spot +5%", "Spot +10%", "Expiry"].includes(row.name))
    .map((row) => {
      const underlyingPl = (row.spot - market.spot) * market.multiplier;
      const diff = row.pl - underlyingPl;
      return `
        <tr>
          <td>${row.name}</td>
          <td class="${row.pl >= 0 ? "profit" : "loss"}">${money(row.pl)}</td>
          <td class="${underlyingPl >= 0 ? "profit" : "loss"}">${money(underlyingPl)}</td>
          <td class="${diff >= 0 ? "profit" : "loss"}">${money(diff)}</td>
        </tr>
      `;
    }).join("");
}

function renderExposure(legs, market, netGreeks) {
  const optionLegs = legs.filter((leg) => leg.type !== "stock");
  const shortPremium = optionLegs
    .filter((leg) => leg.side === "short")
    .reduce((sum, leg) => sum + leg.premium * leg.qty * market.multiplier, 0);
  const longPremium = optionLegs
    .filter((leg) => leg.side === "long")
    .reduce((sum, leg) => sum + leg.premium * leg.qty * market.multiplier, 0);
  const grossNotional = legs.reduce((sum, leg) => {
    const ref = leg.type === "stock" ? market.spot : leg.strike;
    return sum + ref * leg.qty * market.multiplier;
  }, 0);
  const shortContracts = optionLegs.filter((leg) => leg.side === "short").reduce((sum, leg) => sum + leg.qty, 0);

  exposureEl.innerHTML = [
    ["Gross Notional", money(grossNotional)],
    ["Long Premium Paid", money(longPremium)],
    ["Short Premium Collected", money(shortPremium)],
    ["Short Option Contracts", shortContracts.toFixed(0)],
    ["Delta Dollars Approx", money(netGreeks.delta * market.spot)],
    ["Vega Per 10 IV pts", money(netGreeks.vega * 10)],
    ["Theta Per Week", money(netGreeks.theta * 7)],
    ["Leg Count", legs.length.toString()],
  ].map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function reportBlocks(legs, market, risk, netGreeks, scenarios) {
  const hasShortOption = legs.some((leg) => leg.side === "short" && leg.type !== "stock");
  const hasNakedCall = hasUncoveredShortCall(legs);
  const hasShortGamma = netGreeks.gamma < -0.05;
  const nearExpiry = market.days <= 7;
  const worst = scenarios.reduce((a, b) => (a.pl < b.pl ? a : b));
  const blocks = [];

  const shockRows = scenarios.filter((row) => row.name !== "Base");
  const strongestShock = shockRows.reduce((a, b) => (Math.abs(a.delta) > Math.abs(b.delta) ? a : b));

  blocks.push({
    level: "",
    title: "What this position mainly depends on",
    text: `Net delta is ${netGreeks.delta.toFixed(1)}, theta is ${money(netGreeks.theta)} per day, and vega is ${money(netGreeks.vega)} per 1 IV point. The largest displayed shock is ${strongestShock.name}, moving mark-to-model P/L by ${money(strongestShock.delta)} from the base case.`,
  });

  if (hasNakedCall || !risk.definedRisk) {
    blocks.push({
      level: "danger",
      title: "Unlimited loss risk",
      text: "The exact payoff classification shows loss can continue in at least one tail. This is not a small detail: a gap move, volatility spike, or margin change can dominate the trade.",
    });
  } else {
    blocks.push({
      level: "",
      title: "Defined payoff risk",
      text: "The option payoff is defined by the entered legs. This still depends on correct fills, contract multiplier, assignment assumptions, liquidity, transaction costs, and broker margin.",
    });
  }

  if (hasShortOption) {
    blocks.push({
      level: "warn",
      title: "Short option risk",
      text: "Short option premium can make the trade feel high-probability, but losses can arrive quickly. Watch gamma near expiry, early assignment, liquidity, and margin changes.",
    });
  }

  if (hasShortGamma || nearExpiry) {
    blocks.push({
      level: "warn",
      title: "Gamma and expiry risk",
      text: "Short gamma and near-expiry positions can change risk quickly. A position that looks calm at one price can become unstable after a small move in the underlying.",
    });
  }

  if (legs.some((leg) => leg.type !== "stock" && leg.side === "short")) {
    blocks.push({
      level: "warn",
      title: "Assignment and exercise assumptions",
      text: "This prototype uses European-style Black-Scholes approximations. American-style equity options can be assigned early, especially around dividends or deep in-the-money short legs.",
    });
  }

  blocks.push({
    level: worst.pl < 0 ? "warn" : "",
    title: "Worst displayed scenario",
    text: `${worst.name} produces the weakest displayed mark-to-model P/L: ${money(worst.pl)}. This is not a worst-case guarantee; it is only one scenario from the grid.`,
  });

  blocks.push({
    level: "",
    title: "Questions before trading",
    text: "What assumption would make this trade wrong? What happens if IV moves against you? Can you hold through the worst displayed loss? Are bid/ask spread and commissions large enough to erase the edge?",
  });

  return blocks;
}

function hasUncoveredShortCall(legs) {
  const shortCalls = legs.filter((leg) => leg.side === "short" && leg.type === "call");
  const longCalls = legs.filter((leg) => leg.side === "long" && leg.type === "call");
  return shortCalls.some((shortLeg) => {
    const coveringQty = longCalls
      .filter((longLeg) => longLeg.strike > shortLeg.strike)
      .reduce((sum, leg) => sum + leg.qty, 0);
    return coveringQty < shortLeg.qty;
  });
}

function renderReport(blocks) {
  reportEl.innerHTML = blocks.map((block) => `
    <div class="reportBlock ${block.level}">
      <strong>${block.title}</strong>
      <span>${block.text}</span>
    </div>
  `).join("");
}

function render() {
  const market = readInputs();
  const legs = readLegs();
  const errors = validateStrategy(market, legs);
  showValidation(errors);
  if (errors.length) return;

  const points = payoffSeries(legs, market);
  const risk = exactPayoffRisk(legs, market);
  const netGreeks = greeks(legs, market);
  const scenarios = scenarioRows(legs, market);
  const breakevenPoints = breakEvens(legs, market);

  drawChart(points, legs, market, breakevenPoints);
  renderSummary(market, points, risk, netGreeks);
  renderScenarios(scenarios);
  renderComparison(scenarios, market);
  renderExposure(legs, market, netGreeks);
  renderReport(reportBlocks(legs, market, risk, netGreeks, scenarios));
}

function exportReport() {
  const snapshot = strategySnapshot();
  const market = snapshot.market;
  const legs = snapshot.legs;
  const scenarios = scenarioRows(legs, market);
  const text = [
    `Derivatives Risk Explainer Report`,
    `Symbol: ${market.symbol}`,
    `Spot: ${market.spot}`,
    `Days: ${market.days}`,
    `IV: ${(market.iv * 100).toFixed(1)}%`,
    `Rate: ${(market.rate * 100).toFixed(2)}%`,
    `Multiplier: ${market.multiplier}`,
    "",
    "Legs:",
    ...legs.map((leg, index) => `${index + 1}. ${leg.side} ${leg.qty} ${leg.type} strike=${leg.strike} premium=${leg.premium}`),
    "",
    "Scenarios:",
    ...scenarios.map((row) => `${row.name}: spot=${row.spot.toFixed(2)}, IV=${(row.iv * 100).toFixed(1)}%, days=${row.days.toFixed(0)}, P/L=${money(row.pl)}`),
    "",
    [...document.querySelectorAll(".reportBlock")].map((node) => node.innerText).join("\n\n"),
  ].join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${market.symbol || "strategy"}-risk-report.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function saveStrategy() {
  const snapshot = strategySnapshot();
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${snapshot.market.symbol || "strategy"}-strategy.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function loadStrategy(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      setStrategy(JSON.parse(reader.result));
    } catch (error) {
      showValidation([`Could not load strategy JSON: ${error.message}`]);
    }
  });
  reader.readAsText(file);
}

document.getElementById("addLeg").addEventListener("click", () => {
  addLeg();
  render();
});
document.getElementById("exportReport").addEventListener("click", exportReport);
document.getElementById("saveStrategy").addEventListener("click", saveStrategy);
document.getElementById("loadStrategy").addEventListener("change", (event) => {
  if (event.target.files[0]) loadStrategy(event.target.files[0]);
});
document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => setPreset(button.dataset.preset)));
document.querySelectorAll("input").forEach((input) => input.addEventListener("input", render));
window.addEventListener("resize", render);

setPreset("ironCondor");
