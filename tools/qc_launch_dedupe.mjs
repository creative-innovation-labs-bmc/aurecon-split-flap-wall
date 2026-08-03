import { chromium } from 'playwright';
import fs from 'node:fs';

const report = {
  passed: false,
  startedAt: new Date().toISOString(),
  before: null,
  after: null,
  deltas: null,
  assertions: [],
  pageErrors: [],
  consoleErrors: []
};

function assert(name, passed, details = '') {
  report.assertions.push({ name, passed: Boolean(passed), details });
  if (!passed) throw new Error(`${name}: ${details}`);
}

function clockDigits(time) {
  return [time[0], time[1], time[3], time[4], time[6], time[7]];
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 3840, height: 804 } });

page.on('pageerror', (error) => report.pageErrors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') report.consoleErrors.push(message.text());
});

try {
  await page.goto(
    'http://127.0.0.1:8000/49x7-random.html?seed=37&cycle=0&temp=17.4&condition=CLEAR&winddir=WNW&wind=15&hum=58&rain=0.2',
    { waitUntil: 'domcontentloaded' }
  );

  await page.waitForFunction(() => (
    document.body.classList.contains('launching')
    && window.__launchClockDedupe?.wrappedCount === 120
  ), null, { timeout: 10000 });

  // By this point all five macro rows have entered. The footer row is still
  // building, leaving a controlled window in which the clock remains in its
  // launch mode but no macro cell is entering for the first time.
  await page.waitForTimeout(7000);

  report.before = await page.evaluate(() => ({
    launching: document.body.classList.contains('launching'),
    dedupe: structuredClone(window.__launchClockDedupe),
    clock: structuredClone(window.__launchClockState)
  }));

  await page.waitForTimeout(1200);

  report.after = await page.evaluate(() => ({
    launching: document.body.classList.contains('launching'),
    dedupe: structuredClone(window.__launchClockDedupe),
    clock: structuredClone(window.__launchClockState)
  }));

  const beforeCounts = report.before.dedupe.passedByDigit;
  const afterCounts = report.after.dedupe.passedByDigit;
  const passedDeltas = afterCounts.map((value, index) => value - beforeCounts[index]);
  const suppressedDelta = report.after.dedupe.suppressedCount - report.before.dedupe.suppressedCount;
  const beforeDigits = clockDigits(report.before.clock.time);
  const afterDigits = clockDigits(report.after.clock.time);
  const changedDigits = beforeDigits.map((value, index) => value !== afterDigits[index]);

  report.deltas = {
    passedByDigit: passedDeltas,
    suppressed: suppressedDelta,
    beforeDigits,
    afterDigits,
    changedDigits
  };

  assert('All 120 macro flaps were wrapped', report.after.dedupe.wrappedCount === 120, String(report.after.dedupe.wrappedCount));
  assert('QC samples occurred while launch was active', report.before.launching && report.after.launching, `${report.before.launching} / ${report.after.launching}`);
  assert('The clock advanced during the sample', report.before.clock.time !== report.after.clock.time, `${report.before.clock.time} -> ${report.after.clock.time}`);
  assert('Identical macro requests were suppressed', suppressedDelta > 0, String(suppressedDelta));

  changedDigits.forEach((changed, index) => {
    if (changed) {
      assert(
        `Changed digit ${index} received flap updates`,
        passedDeltas[index] > 0,
        `${beforeDigits[index]} -> ${afterDigits[index]}, delta ${passedDeltas[index]}`
      );
    } else {
      assert(
        `Unchanged digit ${index} stayed still`,
        passedDeltas[index] === 0,
        `${beforeDigits[index]} -> ${afterDigits[index]}, delta ${passedDeltas[index]}`
      );
    }
  });

  assert('No page errors', report.pageErrors.length === 0, report.pageErrors.join(' | '));
  report.passed = true;
} catch (error) {
  report.failure = String(error?.stack || error);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  fs.mkdirSync('qc', { recursive: true });
  fs.writeFileSync('qc/launch-dedupe-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await page.screenshot({ path: 'qc/launch-dedupe-frame.png', fullPage: true }).catch(() => {});
  await browser.close();
}
