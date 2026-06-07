const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

async function canvasHasPixels(page) {
  return page.locator("#payoffChart").evaluate((canvas) => {
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let colored = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) colored += 1;
    }
    return colored > 1000;
  });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(pathToFileURL(path.join(__dirname, "..", "index.html")).href);

  await page.click('[data-preset="shortStrangle"]');
  assert.match(await page.locator("#quickRiskSummary").innerText(), /Unbounded loss risk/);
  assert.strictEqual(await page.locator("#strategyEducationTitle").innerText(), "Short Strangle");
  assert.strictEqual(await page.locator(".leg").count(), 2);
  assert.strictEqual(await canvasHasPixels(page), true, "payoff chart should not be blank");

  await page.click('[data-preset="coveredCall"]');
  const firstPremiumLabel = await page.locator(".leg").first().locator(".premium").locator("xpath=..").innerText();
  assert.match(firstPremiumLabel, /Cost Basis/);

  await page.setInputFiles("#loadStrategy", path.join(__dirname, "..", "examples", "short-strangle-unlimited-risk.json"));
  await page.waitForFunction(() => document.querySelector("#strategyEducationTitle")?.textContent === "Custom Strategy");
  assert.match(await page.locator("#quickRiskSummary").innerText(), /Unbounded loss risk/);
  assert.strictEqual(await page.locator("#strategyEducationTitle").innerText(), "Custom Strategy");

  await browser.close();
  console.log("browser smoke passed");
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
