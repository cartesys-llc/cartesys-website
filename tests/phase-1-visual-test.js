const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const breakpoints = [
    { name: 'mobile-360', width: 360, height: 800 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1024', width: 1024, height: 800 },
  ];
  const filePath = 'file://' + path.resolve('index.html').replace(/\\/g, '/');

  for (const bp of breakpoints) {
    const context = await browser.newContext({ viewport: { width: bp.width, height: bp.height } });
    const page = await context.newPage();
    await page.goto(filePath);
    await page.waitForTimeout(4500);
    await page.screenshot({ path: `tests/phase-1-screenshots/${bp.name}-full.png`, fullPage: true });
    await context.close();
  }

  await browser.close();
  console.log('Screenshots written to tests/phase-1-screenshots/');
})();
