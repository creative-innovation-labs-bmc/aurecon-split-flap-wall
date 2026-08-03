import { chromium } from 'playwright';
import fs from 'node:fs';

const report = {
  passed: false,
  startedAt: new Date().toISOString(),
  initialOffices: [],
  finalSeenCount: 0,
  launchSamples: [],
  consoleErrors: [],
  pageErrors: [],
  assertions: []
};

function assertCheck(condition, name, details = '') {
  report.assertions.push({ name, passed: Boolean(condition), details });
  if (!condition) throw new Error(`${name}${details ? `: ${details}` : ''}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 3840, height: 804 } });
page.on('console', (message) => {
  if (message.type() === 'error') report.consoleErrors.push(message.text());
});
page.on('pageerror', (error) => report.pageErrors.push(String(error)));

try {
  const url = 'http://127.0.0.1:8000/49x7-random.html?seed=20260803&interval=2500&randomdebug=1&temp=17.4&condition=CLEAR&winddir=WNW&wind=15&hum=58&rain=0.2';
  await page.goto(url, { waitUntil: 'load' });

  await page.waitForFunction(() => window.__randomOfficeState?.current?.length === 4, null, { timeout: 10000 });
  const initial = await page.evaluate(() => window.__randomOfficeState);
  report.initialOffices = initial.current;
  assertCheck(new Set(initial.current).size === 4, 'Initial four offices are unique', initial.current.join(', '));
  assertCheck(initial.current.join('|') !== 'ADELAIDE|BRISBANE|CAIRNS|CANBERRA', 'Initial group is not the normal first page', initial.current.join(', '));

  await page.waitForFunction(() => window.__launchClockState?.activeCells > 0, null, { timeout: 10000 });
  const launchOne = await page.evaluate(() => window.__launchClockState);
  report.launchSamples.push(launchOne);
  await page.screenshot({ path: 'qc/random-v2-launch.png' });
  await page.waitForTimeout(2200);
  const launchTwo = await page.evaluate(() => window.__launchClockState);
  report.launchSamples.push(launchTwo);
  assertCheck(launchTwo.activeCells >= launchOne.activeCells, 'Active launch-clock cell count does not go backwards', `${launchOne.activeCells} -> ${launchTwo.activeCells}`);
  assertCheck(launchTwo.time !== launchOne.time, 'Clock time changes while launch is still in progress', `${launchOne.time} -> ${launchTwo.time}`);
  assertCheck(await page.evaluate(() => document.body.classList.contains('launching')), 'Clock changed before the wall launch completed');

  await page.waitForFunction(() => !document.body.classList.contains('launching'), null, { timeout: 20000 });
  await page.screenshot({ path: 'qc/random-v2-complete.png' });

  await page.waitForFunction(() => window.__randomOfficeState?.seenCount === 30, null, { timeout: 30000 });
  const finalState = await page.evaluate(() => window.__randomOfficeState);
  report.finalSeenCount = finalState.seenCount;
  assertCheck(finalState.seenCount === 30, 'All 30 offices were shown before reshuffle', String(finalState.seenCount));
  assertCheck(new Set(finalState.seen).size === 30, 'No repeated office ID before reshuffle', `${new Set(finalState.seen).size} unique`);
  assertCheck(report.consoleErrors.every((entry) => !entry.includes('repeated before')), 'No random-repeat error was logged', report.consoleErrors.join(' | '));
  assertCheck(report.pageErrors.length === 0, 'No page errors', report.pageErrors.join(' | '));

  report.passed = report.assertions.every((item) => item.passed);
} catch (error) {
  report.failure = String(error?.stack || error);
} finally {
  report.finishedAt = new Date().toISOString();
  fs.mkdirSync('qc', { recursive: true });
  fs.writeFileSync('qc/random-v2-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

if (!report.passed) process.exit(1);
