// tests/phase-1e-mobile-fix-test.js — verify fade-up observer handles tall
// elements at mobile viewport width. Specifically confirms the products
// section (.products-section .fade-up) becomes visible.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const filePath = 'file://' + path.resolve('index.html').replace(/\\/g, '/');
  const browser = await chromium.launch();
  let failures = 0;

  // Test 1: at iPhone-width viewport, products .fade-up acquires .visible class
  try {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 14 Pro
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const page = await ctx.newPage();
    await page.goto(filePath);

    // Scroll to the products section
    await page.locator('#products').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500); // allow observer + failsafe to fire

    const productsVisible = await page.locator('.products-section .fade-up').evaluate(el =>
      el.classList.contains('visible')
    );
    console.log(`Test 1 (products .fade-up has .visible at mobile width): ${productsVisible}`);
    if (!productsVisible) {
      console.error('  FAIL — products .fade-up did not acquire .visible class');
      failures++;
    }

    // Also verify opacity is actually 1 (transition completed)
    const productsOpacity = await page.locator('.products-section .fade-up').evaluate(el =>
      window.getComputedStyle(el).opacity
    );
    console.log(`  products .fade-up opacity: ${productsOpacity}`);
    if (parseFloat(productsOpacity) < 0.99) {
      console.error('  FAIL — products opacity is not ~1');
      failures++;
    }

    await ctx.close();
  } catch (e) { console.error('Test 1 exception:', e.message); failures++; }

  // Test 2: failsafe fires even without scrolling (simulating page loaded at top
  // and user doesn't scroll to products)
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(filePath);

    // Do NOT scroll. Just wait for the failsafe to fire.
    await page.waitForTimeout(2500);

    // Products section is below the fold at load — observer shouldn't fire,
    // but failsafe should make it visible anyway.
    const productsVisible = await page.locator('.products-section .fade-up').evaluate(el =>
      el.classList.contains('visible')
    );
    console.log(`Test 2 (failsafe: products visible without scroll): ${productsVisible}`);
    if (!productsVisible) {
      console.error('  FAIL — failsafe did not apply visible class');
      failures++;
    }

    await ctx.close();
  } catch (e) { console.error('Test 2 exception:', e.message); failures++; }

  await browser.close();

  if (failures > 0) {
    console.error(`\n${failures} mobile-fix test(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll 2 mobile-fix tests passed.');
})();
