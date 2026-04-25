// tests/phase-1c-smoke.js — animation smoke tests for Phase 1c
// Verifies: counter reaches target, reduced-motion jumps to target,
// hover changes shadow, grid-drift animation is active.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const indexPath = path.resolve('index.html');
  const filePath = 'file://' + indexPath.replace(/\\/g, '/');
  const html = fs.readFileSync(indexPath, 'utf8');

  // Extract the first hero-stat-num intended value from HTML source
  const match = html.match(/class="hero-stat-num"[^>]*>\s*([^<]+?)\s*</);
  if (!match) {
    console.error('FAIL: could not find hero-stat-num in HTML source');
    process.exit(1);
  }
  const targetStatText = match[1].trim();
  console.log(`Target stat text (from HTML): "${targetStatText}"`);

  const browser = await chromium.launch();
  let failures = 0;

  // Test 1: counter reaches final value (no reduced-motion)
  try {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(filePath);
    await page.waitForTimeout(4500);
    const actual = (await page.locator('.hero-stat-num').first().textContent()).trim();
    console.log(`Test 1 (counter final value) — expected "${targetStatText}", got "${actual}"`);
    if (actual !== targetStatText) {
      console.error('  FAIL');
      failures++;
    }
    await ctx.close();
  } catch (e) { console.error('Test 1 exception:', e.message); failures++; }

  // Test 2: reduced-motion jumps to final value immediately
  try {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 800 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(filePath);
    await page.waitForTimeout(250);
    const actual = (await page.locator('.hero-stat-num').first().textContent()).trim();
    console.log(`Test 2 (reduced-motion fast-path) — expected "${targetStatText}", got "${actual}"`);
    if (actual !== targetStatText) {
      console.error('  FAIL');
      failures++;
    }
    await ctx.close();
  } catch (e) { console.error('Test 2 exception:', e.message); failures++; }

  // Test 3: hover changes box-shadow
  try {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(filePath);
    const card = page.locator('.build-card').first();
    await card.scrollIntoViewIfNeeded();
    const shadowBefore = await card.evaluate(el => window.getComputedStyle(el).boxShadow);
    await card.hover();
    await page.waitForTimeout(400);
    const shadowAfter = await card.evaluate(el => window.getComputedStyle(el).boxShadow);
    console.log(`Test 3 (hover shadow change)`);
    console.log(`  before: ${shadowBefore}`);
    console.log(`  after:  ${shadowAfter}`);
    if (shadowBefore === shadowAfter) {
      console.error('  FAIL — hover did not change box-shadow');
      failures++;
    }
    await ctx.close();
  } catch (e) { console.error('Test 3 exception:', e.message); failures++; }

  // Test 4: grid-drift animation is active
  try {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(filePath);
    const animName = await page.locator('.grid-bg').evaluate(el => window.getComputedStyle(el).animationName);
    console.log(`Test 4 (grid-drift active) — animationName: "${animName}"`);
    if (animName !== 'grid-drift') {
      console.error(`  FAIL — expected "grid-drift", got "${animName}"`);
      failures++;
    }
    await ctx.close();
  } catch (e) { console.error('Test 4 exception:', e.message); failures++; }

  // Test 5: hero fade-in animation is wired on all 6 hero elements
  try {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(filePath);
    const selectors = ['.hero h1', '.hero .hero-tagline', '.hero .hero-desc', '.hero .hero-cta', '.hero .hero-stats'];
    console.log('Test 5 (hero fade-in animation wired on all 5 elements):');
    let test5Failures = 0;
    for (const sel of selectors) {
      const animName = await page.locator(sel).evaluate(el => window.getComputedStyle(el).animationName);
      console.log(`  ${sel} — animationName: "${animName}"`);
      if (animName !== 'hero-fade-in') {
        console.error(`    FAIL — expected "hero-fade-in", got "${animName}"`);
        test5Failures++;
      }
    }
    if (test5Failures > 0) failures++;
    await ctx.close();
  } catch (e) { console.error('Test 5 exception:', e.message); failures++; }

  // Test 6: reduced-motion disables hero fade-in AND makes elements visible
  try {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 800 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(filePath);
    await page.waitForTimeout(100);
    const selectors = ['.hero h1', '.hero .hero-tagline', '.hero .hero-desc', '.hero .hero-cta', '.hero .hero-stats'];
    console.log('Test 6 (reduced-motion hero elements all visible):');
    let test6Failures = 0;
    for (const sel of selectors) {
      const opacity = await page.locator(sel).evaluate(el => window.getComputedStyle(el).opacity);
      console.log(`  ${sel} — opacity: ${opacity}`);
      if (parseFloat(opacity) < 0.99) {
        console.error(`    FAIL — expected opacity ~1, got ${opacity}`);
        test6Failures++;
      }
    }
    if (test6Failures > 0) failures++;
    await ctx.close();
  } catch (e) { console.error('Test 6 exception:', e.message); failures++; }

  await browser.close();

  if (failures > 0) {
    console.error(`\n${failures} smoke test(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll 6 smoke tests passed.');
})();
