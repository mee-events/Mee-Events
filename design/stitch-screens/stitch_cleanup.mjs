import { chromium } from 'playwright';
import fs from 'fs';

const PROFILE = '/Users/vinaychilagani/.cache/chrome-devtools-mcp/chrome-profile';
const PROJECT = 'https://stitch.withgoogle.com/projects/4200285447239326275?pli=1';

const DELETE_IDS = JSON.parse(fs.readFileSync('cleanup-plan.md','utf8'))
  .split('## KEEP')[0]
  .match(/id=([a-f0-9]{32})/g)
  ?.map(s => s.slice(3)) || [];

console.log('delete ids from plan:', DELETE_IDS.length);

const browser = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  channel: 'chrome',
  args: ['--disable-blink-features=AutomationControlled'],
  viewport: { width: 1440, height: 900 },
});

const page = browser.pages()[0] || await browser.newPage();
await page.goto(PROJECT, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(8000);

// Find companion iframe
const frame = page.frames().find(f => f.url().includes('app-companion'));
console.log('frames:', page.frames().map(f => f.url().slice(0,80)));
if (!frame) {
  console.error('No companion frame');
  await browser.close();
  process.exit(1);
}

// Try to evaluate store access inside iframe
const storeProbe = await frame.evaluate(() => {
  const keys = Object.keys(window).filter(k => /zustand|__REACT|store/i.test(k));
  // Find React root fiber
  const root = document.querySelector('#root') || document.body.firstElementChild;
  const fiberKey = root && Object.keys(root).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactContainer'));
  return { keys, fiberKey: fiberKey || null, hasRoot: !!root, title: document.title };
});
console.log('probe', storeProbe);

// Search for text nodes with junk titles and click + backspace
const junkTitles = [
  'Untitled Prototype',
  'Generating Screen...',
  'CX00 — Customer Final Flow Index',
  'A — Editorial Indian Luxury',
  'B — Modern Trusted Marketplace',
  'C — Celebratory Minimal',
  'Event Booking Flow',
  'Hyderabad Events Prototype',
  'Mee Events Platform',
];

async function deleteByTitle(title) {
  // Find label on canvas
  const handle = await frame.$(`text=${title}`);
  if (!handle) {
    // try partial
    const all = await frame.$$('div, span, p, h1, h2, h3, label');
    let found = null;
    for (const el of all) {
      const t = await el.textContent();
      if (t && t.trim() === title) { found = el; break; }
    }
    if (!found) return { title, ok: false, reason: 'not found' };
    await found.click({ timeout: 5000 });
  } else {
    await handle.click({ timeout: 5000 });
  }
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(500);
  return { title, ok: true };
}

const results = [];
for (const title of junkTitles) {
  try {
    // delete all instances of this title (up to 15)
    for (let i = 0; i < 15; i++) {
      const r = await deleteByTitle(title);
      results.push({ ...r, attempt: i });
      if (!r.ok) break;
      console.log('deleted instance', title, i);
    }
  } catch (e) {
    results.push({ title, ok: false, reason: String(e) });
    console.log('err', title, e.message);
  }
}

fs.writeFileSync('cleanup-results.json', JSON.stringify(results, null, 2));
console.log('done', results.filter(r => r.ok).length, 'ok');
await page.waitForTimeout(3000);
// don't close - leave browser; just disconnect
await browser.close();
