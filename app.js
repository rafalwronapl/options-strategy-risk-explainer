const legsEl = document.getElementById("legs");
const summaryEl = document.getElementById("summary");
const scenariosEl = document.getElementById("scenarios");
const reportEl = document.getElementById("riskReport");
const validationEl = document.getElementById("validation");
const exposureEl = document.getElementById("exposure");
const comparisonEl = document.getElementById("comparison");
const positionSummaryEl = document.getElementById("positionSummary");
const riskFlagsEl = document.getElementById("riskFlags");
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

function blackScholes(type, spot, strike, years, rate, vol, dividend = 0) {
  if (years <= 0 || vol <= 0 || strike <= 0 || spot <= 0) {
    const intrinsic = type === "call" ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
    return { price: intrinsic, delta: type === "call" ? (spot > strike ? 1 : 0) : (spot < strike ? -1 : 0), gamma: 0, theta: 0, vega: 0 };
  }

  const sqrtT = Math.sqrt(years);
  const d1 = (Math.log(spot / strike) + (rate - dividend + 0.5 * vol * vol) * years) / (vol * sqrtT);
  const d2 = d1 - vol * sqrtT;
  const rateDisc = Math.exp(-rate * years);
  const dividendDisc = Math.exp(-dividend * years);
  const pdf = normalPdf(d1);

  if (type === "call") {
    return {
      price: spot * dividendDisc * normalCdf(d1) - strike * rateDisc * normalCdf(d2),
      delta: dividendDisc * normalCdf(d1),
      gamma: (dividendDisc * pdf) / (spot * vol * sqrtT),
      theta: (-(spot * dividendDisc * pdf * vol) / (2 * sqrtT) - rate * strike * rateDisc * normalCdf(d2) + dividend * spot * dividendDisc * normalCdf(d1)) / 365,
      vega: spot * dividendDisc * pdf * sqrtT / 100,
    };
  }

  return {
    price: strike * rateDisc * normalCdf(-d2) - spot * dividendDisc * normalCdf(-d1),
    delta: dividendDisc * (normalCdf(d1) - 1),
    gamma: (dividendDisc * pdf) / (spot * vol * sqrtT),
    theta: (-(spot * dividendDisc * pdf * vol) / (2 * sqrtT) + rate * strike * rateDisc * normalCdf(-d2) - dividend * spot * dividendDisc * normalCdf(-d1)) / 365,
    vega: spot * dividendDisc * pdf * sqrtT / 100,
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

function parseOptionalNumeric(value) {
  if (typeof value === "number") return value;
  const text = String(value).trim();
  if (!text) return NaN;
  return Number(text.replace(",", "."));
}

function readInputs() {
  return {
    symbol: document.getElementById("symbol").value.trim() || "UNDERLYING",
    spot: parseNumeric(document.getElementById("spot").value),
    days: parseNumeric(document.getElementById("days").value),
    iv: parseNumeric(document.getElementById("iv").value) / 100,
    rate: parseNumeric(document.getElementById("rate").value) / 100,
    dividend: parseNumeric(document.getElementById("dividend").value) / 100,
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
    iv: parseNumeric(node.querySelector(".legIv").value) / 100,
    bid: parseOptionalNumeric(node.querySelector(".bid").value),
    ask: parseOptionalNumeric(node.querySelector(".ask").value),
    openInterest: parseOptionalNumeric(node.querySelector(".openInterest").value),
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
  if (!Number.isFinite(market.dividend) || market.dividend < 0) errors.push("Dividend yield must be zero or positive.");
  if (!Number.isFinite(market.multiplier) || market.multiplier <= 0) errors.push("Contract multiplier must be positive.");
  if (!legs.length) errors.push("Add at least one leg.");
  legs.forEach((leg, index) => {
    const label = `Leg ${index + 1}`;
    if (!["long", "short"].includes(leg.side)) errors.push(`${label}: side must be long or short.`);
    if (!["call", "put", "stock"].includes(leg.type)) errors.push(`${label}: type must be call, put, or stock.`);
    if (leg.type !== "stock" && (!Number.isFinite(leg.strike) || leg.strike <= 0)) errors.push(`${label}: option strike must be positive.`);
    if (!Number.isFinite(leg.premium) || leg.premium < 0) errors.push(`${label}: premium/cost must be zero or positive.`);
    if (!Number.isFinite(leg.qty) || leg.qty <= 0) errors.push(`${label}: quantity must be positive.`);
    if (leg.type !== "stock" && (!Number.isFinite(leg.iv) || leg.iv <= 0)) errors.push(`${label}: leg IV must be positive.`);
    if (leg.type !== "stock" && Number.isFinite(leg.bid) && Number.isFinite(leg.ask) && leg.ask < leg.bid) errors.push(`${label}: ask cannot be below bid.`);
    if (leg.type !== "stock" && Number.isFinite(leg.openInterest) && leg.openInterest < 0) errors.push(`${label}: open interest cannot be negative.`);
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
  const model = blackScholes(leg.type, market.spot, leg.strike, years, market.rate, leg.iv || market.iv, market.dividend);
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
    const model = blackScholes(leg.type, market.spot, leg.strike, market.days / 365, market.rate, leg.iv || market.iv, market.dividend);
    const q = leg.qty * market.multiplier * signed(leg);
    acc.delta += model.delta * q;
    acc.gamma += model.gamma * q;
    acc.theta += model.theta * q;
    acc.vega += model.vega * q;
    return acc;
  }, { delta: 0, gamma: 0, theta: 0, vega: 0 });
}

function addLeg(leg = { side: "long", type: "call", strike: 500, premium: 10, qty: 1 }) {
  const defaultIv = Number.isFinite(leg.iv) ? leg.iv * 100 : parseNumeric(document.getElementById("iv").value);
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
    <label>Premium
      <input class="premium" type="number" step="0.01">
    </label>
    <label>Qty
      <input class="qty" type="number" step="1" min="1">
    </label>
    <label>IV %
      <input class="legIv" type="number" step="0.1" min="0.1">
    </label>
    <button class="removeLeg" type="button" title="Remove leg">x</button>
    <details class="advancedLeg">
      <summary>Liquidity</summary>
      <div class="advancedGrid">
        <label>Bid
          <input class="bid" type="number" step="0.01" min="0">
        </label>
        <label>Ask
          <input class="ask" type="number" step="0.01" min="0">
        </label>
        <label>Open Interest
          <input class="openInterest" type="number" step="1" min="0">
        </label>
      </div>
    </details>
  `;
  row.querySelector(".side").value = leg.side;
  row.querySelector(".type").value = leg.type;
  row.querySelector(".strike").value = leg.strike;
  row.querySelector(".premium").value = leg.premium;
  row.querySelector(".qty").value = leg.qty;
  row.querySelector(".legIv").value = defaultIv;
  row.querySelector(".bid").value = Number.isFinite(leg.bid) ? leg.bid : "";
  row.querySelector(".ask").value = Number.isFinite(leg.ask) ? leg.ask : "";
  row.querySelector(".openInterest").value = Number.isFinite(leg.openInterest) ? leg.openInterest : "";
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
  if (Number.isFinite(market.dividend)) document.getElementById("dividend").value = market.dividend > 1 ? market.dividend : market.dividend * 100;
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
  const lastStrike = strikes.at(-1) || market.spot;
  const bounds = [0, ...strikes]
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

  const tailLeft = bounds.at(-1) ?? 0;
  const tailValue = totalPayoff(legs, tailLeft, market.multiplier);
  const tailSlope = payoffSlopeAtInfinity(legs, "up", market.multiplier);
  if (tailValue === 0) roots.push(tailLeft);
  if (tailSlope !== 0) {
    const root = tailLeft - (tailValue / tailSlope);
    if (root >= tailLeft && root <= Math.max(lastStrike * 100, market.spot * 100)) roots.push(root);
  }
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

function drawChart(points, legs, market, breakevens, risk) {
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

  if (!risk.definedRisk) {
    ctx.fillStyle = "#a12b2b";
    ctx.font = "bold 13px Segoe UI, Arial";
    ctx.fillText("Tail risk continues beyond chart", pad, pad + 16);
    if (risk.upsideUnlimitedLoss) {
      ctx.fillText("loss can expand to the right", width - pad - 170, pad + 16);
    }
  }
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
    const ivShift = iv - market.iv;
    const shiftedLegs = legs.map((leg) => ({
      ...leg,
      iv: leg.type === "stock" ? leg.iv : Math.max(0.01, (leg.iv || market.iv) + ivShift),
    }));
    const pl = totalModelPl(shiftedLegs, { ...market, spot, iv, days });
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
    ["Dividend Yield", `${(market.dividend * 100).toFixed(2)}%`],
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
  const enteredSpreads = optionLegs
    .filter((leg) => Number.isFinite(leg.bid) && Number.isFinite(leg.ask))
    .map((leg) => Math.max(0, leg.ask - leg.bid));
  const maxSpread = enteredSpreads.length ? Math.max(...enteredSpreads) : NaN;

  exposureEl.innerHTML = [
    ["Gross Notional", money(grossNotional)],
    ["Long Premium Paid", money(longPremium)],
    ["Short Premium Collected", money(shortPremium)],
    ["Short Option Contracts", shortContracts.toFixed(0)],
    ["Delta Dollars Approx", money(netGreeks.delta * market.spot)],
    ["Vega Per 10 IV pts", money(netGreeks.vega * 10)],
    ["Theta Per Week", money(netGreeks.theta * 7)],
    ["Max Bid/Ask Spread", Number.isFinite(maxSpread) ? `$${maxSpread.toFixed(2)}` : "not entered"],
    ["Leg Count", legs.length.toString()],
  ].map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function renderPositionSummary(legs, market) {
  const calls = legs.filter((leg) => leg.type === "call");
  const puts = legs.filter((leg) => leg.type === "put");
  const stocks = legs.filter((leg) => leg.type === "stock");
  const shortOptions = legs.filter((leg) => leg.side === "short" && leg.type !== "stock");
  const longOptions = legs.filter((leg) => leg.side === "long" && leg.type !== "stock");
  const netPremium = legs.reduce((sum, leg) => {
    if (leg.type === "stock") return sum;
    return sum + (-signed(leg) * leg.premium * leg.qty * market.multiplier);
  }, 0);
  const rows = [
    ["Calls / Puts / Stock", `${calls.length} / ${puts.length} / ${stocks.length}`],
    ["Long Option Contracts", longOptions.reduce((sum, leg) => sum + leg.qty, 0).toFixed(0)],
    ["Short Option Contracts", shortOptions.reduce((sum, leg) => sum + leg.qty, 0).toFixed(0)],
    ["Net Premium Cashflow", `${money(netPremium)} ${netPremium >= 0 ? "credit" : "debit"}`],
    ["Structure Type", shortOptions.length && longOptions.length ? "multi-leg spread" : shortOptions.length ? "short premium" : "long premium / stock"],
  ];
  positionSummaryEl.innerHTML = rows.map(([label, value]) => `
    <div class="summaryItem"><span>${label}</span><strong>${value}</strong></div>
  `).join("");
}

function reportBlocks(legs, market, risk, netGreeks, scenarios) {
  const hasShortOption = legs.some((leg) => leg.side === "short" && leg.type !== "stock");
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

  if (!risk.definedRisk) {
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

  const wideSpreadLegs = legs.filter((leg) => {
    if (leg.type === "stock" || !Number.isFinite(leg.bid) || !Number.isFinite(leg.ask) || leg.premium <= 0) return false;
    return (leg.ask - leg.bid) / leg.premium > 0.15;
  });
  if (wideSpreadLegs.length) {
    blocks.push({
      level: "warn",
      title: "Liquidity and spread risk",
      text: `${wideSpreadLegs.length} option leg(s) have a bid/ask spread above 15% of entered premium. A theoretical payoff can disappear if fills are poor.`,
    });
  }

  const missingLiquidityLegs = legs.filter((leg) => leg.type !== "stock" && (!Number.isFinite(leg.bid) || !Number.isFinite(leg.ask) || !Number.isFinite(leg.openInterest)));
  if (missingLiquidityLegs.length) {
    blocks.push({
      level: "warn",
      title: "Missing liquidity data",
      text: `${missingLiquidityLegs.length} option leg(s) are missing bid, ask, or open interest. The payoff math can be correct while real fills remain poor.`,
    });
  }

  const premiumOutsideMarketLegs = legs.filter((leg) => (
    leg.type !== "stock"
    && Number.isFinite(leg.bid)
    && Number.isFinite(leg.ask)
    && (leg.premium < leg.bid || leg.premium > leg.ask)
  ));
  if (premiumOutsideMarketLegs.length) {
    blocks.push({
      level: "warn",
      title: "Entered premium outside bid/ask",
      text: `${premiumOutsideMarketLegs.length} option leg(s) use a premium outside the entered bid/ask range. Check whether you entered a fill, mark, mid, or stale quote.`,
    });
  }

  const zeroOiLegs = legs.filter((leg) => leg.type !== "stock" && Number.isFinite(leg.openInterest) && leg.openInterest === 0);
  if (zeroOiLegs.length) {
    blocks.push({
      level: "warn",
      title: "Zero open interest",
      text: `${zeroOiLegs.length} option leg(s) have zero open interest entered. That can make exits fragile even if the theoretical structure looks clean.`,
    });
  }

  const lowOiLegs = legs.filter((leg) => leg.type !== "stock" && Number.isFinite(leg.openInterest) && leg.openInterest > 0 && leg.openInterest < 100);
  if (lowOiLegs.length) {
    blocks.push({
      level: "warn",
      title: "Low open interest",
      text: `${lowOiLegs.length} option leg(s) have open interest below 100. That can mean wider spreads, worse fills, and more fragile exits.`,
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

function renderReport(blocks) {
  riskFlagsEl.innerHTML = blocks.map((block) => `
    <span class="riskFlag ${block.level}">${block.title}</span>
  `).join("");
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

  drawChart(points, legs, market, breakevenPoints, risk);
  renderSummary(market, points, risk, netGreeks);
  renderScenarios(scenarios);
  renderComparison(scenarios, market);
  renderExposure(legs, market, netGreeks);
  renderPositionSummary(legs, market);
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
    `Dividend Yield: ${(market.dividend * 100).toFixed(2)}%`,
    `Multiplier: ${market.multiplier}`,
    "",
    "Legs:",
    ...legs.map((leg, index) => `${index + 1}. ${leg.side} ${leg.qty} ${leg.type} strike=${leg.strike} premium=${leg.premium} IV=${((leg.iv || market.iv) * 100).toFixed(1)}% bid=${Number.isFinite(leg.bid) ? leg.bid : ""} ask=${Number.isFinite(leg.ask) ? leg.ask : ""} OI=${Number.isFinite(leg.openInterest) ? leg.openInterest : ""}`),
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

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function exportCsv() {
  const snapshot = strategySnapshot();
  const market = snapshot.market;
  const legs = snapshot.legs;
  const scenarios = scenarioRows(legs, market);
  const lines = [
    ["section", "field", "value", "side", "type", "strike", "premium", "qty", "iv", "bid", "ask", "open_interest", "scenario", "spot", "days", "pl"].map(csvEscape).join(","),
    ["market", "symbol", market.symbol].map(csvEscape).join(","),
    ["market", "spot", market.spot].map(csvEscape).join(","),
    ["market", "days", market.days].map(csvEscape).join(","),
    ["market", "global_iv", market.iv].map(csvEscape).join(","),
    ["market", "rate", market.rate].map(csvEscape).join(","),
    ["market", "dividend", market.dividend].map(csvEscape).join(","),
    ["market", "multiplier", market.multiplier].map(csvEscape).join(","),
    ...legs.map((leg, index) => [
      "leg",
      index + 1,
      "",
      leg.side,
      leg.type,
      leg.strike,
      leg.premium,
      leg.qty,
      leg.iv,
      Number.isFinite(leg.bid) ? leg.bid : "",
      Number.isFinite(leg.ask) ? leg.ask : "",
      Number.isFinite(leg.openInterest) ? leg.openInterest : "",
    ].map(csvEscape).join(",")),
    ...scenarios.map((row) => [
      "scenario",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      row.iv,
      "",
      "",
      "",
      row.name,
      row.spot,
      row.days,
      row.pl,
    ].map(csvEscape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${market.symbol || "strategy"}-risk-data.csv`;
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
document.getElementById("exportCsv").addEventListener("click", exportCsv);
document.getElementById("saveStrategy").addEventListener("click", saveStrategy);
document.getElementById("loadStrategy").addEventListener("change", (event) => {
  if (event.target.files[0]) loadStrategy(event.target.files[0]);
});
document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => setPreset(button.dataset.preset)));
document.querySelectorAll("input").forEach((input) => input.addEventListener("input", render));
window.addEventListener("resize", render);

setPreset("ironCondor");
