#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "wall-live.js"
RANDOM_HTML = ROOT / "49x7-random.html"

text = JS.read_text(encoding="utf-8")

replacements = []

replacements.append((
"""    { display: 'HOCHIMIN', country: 'VNM', tz: 'Asia/Ho_Chi_Minh' }
  ];
""",
"""    { display: 'HOCHIMIN', country: 'VNM', tz: 'Asia/Ho_Chi_Minh' }
  ].map((office, index) => ({ ...office, id: index }));
"""))

replacements.append((
"""  const params = new URLSearchParams(window.location.search);
  const noAnimation = params.get('noanim') === '1';
  const cycleOffices = params.get('cycle') !== '0';
""",
"""  const params = new URLSearchParams(window.location.search);
  const randomOfficeMode = params.get('randommode') === '1'
    || /49x7-random\\.html$/i.test(window.location.pathname);
  const randomDebug = params.get('randomdebug') === '1';
  const randomIntervalMs = Math.max(2500, Number(params.get('interval')) || OFFICE_PAGE_MS);
  const noAnimation = params.get('noanim') === '1';
  const cycleOffices = params.get('cycle') !== '0';
"""))

replacements.append((
"""  let officePage = Number(params.get('page') || 0);
  let lastSecond = -1;
  let lastMinuteKey = '';
  let colonTimer = 0;
""",
"""  let officePage = Number(params.get('page') || 0);
  let currentOfficeCards = null;
  let randomDeck = [];
  let randomDeckIndex = 0;
  let randomSeen = new Set();
  let lastSecond = -1;
  let lastMinuteKey = '';
  let colonTimer = 0;
  let launchClockTimer = 0;
  const activeLaunchClockCells = new Set();
"""))

replacements.append((
"""  function now() {
    return fixedDate ? new Date(fixedDate.getTime()) : new Date();
  }

  function sanitise(value, maxLength, fallback = '--') {
""",
"""  function now() {
    return fixedDate ? new Date(fixedDate.getTime()) : new Date();
  }

  function seededGenerator(seedValue) {
    let state = (Number(seedValue) || 1) >>> 0;
    return () => {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  const seededRandom = params.has('seed') ? seededGenerator(params.get('seed')) : null;

  function randomValue() {
    if (seededRandom) return seededRandom();
    if (window.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return value[0] / 4294967296;
    }
    return Math.random();
  }

  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(randomValue() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function updateRandomDebugState() {
    if (!randomOfficeMode) return;
    window.__randomOfficeState = {
      current: (currentOfficeCards || []).filter(Boolean).map((office) => office.display),
      seen: [...randomSeen],
      seenCount: randomSeen.size,
      deckIndex: randomDeckIndex,
      deckLength: randomDeck.length
    };
  }

  function resetRandomDeck(avoidVisible = false) {
    const visibleIds = new Set((currentOfficeCards || []).filter(Boolean).map((office) => office.id));
    let candidate = shuffle(OFFICE_NAMES);
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const defaultOpening = candidate.slice(0, 4).every((office, index) => office.id === index);
      const repeatsVisible = avoidVisible
        && candidate.slice(0, 4).some((office) => visibleIds.has(office.id));
      if (!defaultOpening && !repeatsVisible) break;
      candidate = shuffle(OFFICE_NAMES);
    }
    randomDeck = candidate;
    randomDeckIndex = 0;
    randomSeen = new Set();
  }

  function initialiseRandomOffices() {
    if (!randomOfficeMode || currentOfficeCards) return;
    resetRandomDeck(false);
    currentOfficeCards = randomDeck.slice(0, 4);
    randomDeckIndex = 4;
    randomSeen = new Set(currentOfficeCards.map((office) => office.id));
    updateRandomDebugState();
    if (randomDebug) console.log('[random offices] initial', currentOfficeCards.map((office) => office.display));
  }

  function advanceRandomOffices() {
    if (!randomOfficeMode) return;
    if (randomDeckIndex >= randomDeck.length) resetRandomDeck(true);

    const remaining = randomDeck.length - randomDeckIndex;
    const count = Math.min(4, remaining);
    const batch = randomDeck.slice(randomDeckIndex, randomDeckIndex + count);
    const targetSlots = count === 2 ? [0, 1] : [0, 1, 2, 3].slice(0, count);

    batch.forEach((office, index) => {
      if (randomSeen.has(office.id)) {
        console.error('Random office repeated before the full deck was shown:', office.display);
        return;
      }
      currentOfficeCards[targetSlots[index]] = office;
      randomSeen.add(office.id);
    });
    randomDeckIndex += count;
    updateRandomDebugState();
    if (randomDebug) {
      console.log('[random offices] batch', batch.map((office) => office.display), `${randomSeen.size}/${OFFICE_NAMES.length}`);
    }
    renderOfficeCards(now(), 'page');
  }

  function sanitise(value, maxLength, fallback = '--') {
"""))

replacements.append((
"""  function visiblePageOffices(page) {
    const capacity = 4;
    const pageCount = Math.ceil(OFFICE_NAMES.length / capacity);
    officePage = ((page % pageCount) + pageCount) % pageCount;
    const start = officePage * capacity;
    return Array.from({ length: capacity }, (_, index) => OFFICE_NAMES[(start + index) % OFFICE_NAMES.length]);
  }
""",
"""  function visiblePageOffices(page) {
    if (randomOfficeMode) {
      initialiseRandomOffices();
      return currentOfficeCards;
    }
    const capacity = 4;
    const pageCount = Math.ceil(OFFICE_NAMES.length / capacity);
    officePage = ((page % pageCount) + pageCount) % pageCount;
    const start = officePage * capacity;
    return Array.from({ length: capacity }, (_, index) => OFFICE_NAMES[(start + index) % OFFICE_NAMES.length]);
  }
"""))

replacements.append((
"""  function renderClock(date = now(), mode = 'steady') {
    const time = fullTimeFor('Australia/Melbourne', date);
    const digits = [time[0], time[1], time[3], time[4], time[6], time[7]];
    digits.forEach((digit, index) => {
      drawPattern(
        DIGITS_4X5[digit],
        1,
        CENTRE_START + DIGIT_STARTS[index],
        mode,
        mode === 'transition' ? index * 65 : 0,
        mode === 'transition' ? FAST_HALF_MS : NORMAL_HALF_MS
      );
    });
  }


  function pulseColons() {
""",
"""  function renderClock(date = now(), mode = 'steady') {
    const time = fullTimeFor('Australia/Melbourne', date);
    const digits = [time[0], time[1], time[3], time[4], time[6], time[7]];
    digits.forEach((digit, index) => {
      drawPattern(
        DIGITS_4X5[digit],
        1,
        CENTRE_START + DIGIT_STARTS[index],
        mode,
        mode === 'transition' ? index * 65 : 0,
        mode === 'transition' ? FAST_HALF_MS : NORMAL_HALF_MS
      );
    });
  }

  function clockDigitsAt(date = now()) {
    const time = fullTimeFor('Australia/Melbourne', date);
    return [time[0], time[1], time[3], time[4], time[6], time[7]];
  }

  function updateLaunchClockCell(key, date = now(), halfMs = FAST_HALF_MS) {
    const [digitIndex, row, col] = key.split(':').map(Number);
    const digits = clockDigitsAt(date);
    const pattern = DIGITS_4X5[digits[digitIndex]];
    setCell(
      1 + row,
      CENTRE_START + DIGIT_STARTS[digitIndex] + col,
      ' ',
      pattern[row][col] === '1',
      0,
      halfMs
    );
  }

  function updateActiveLaunchClock(date = now()) {
    activeLaunchClockCells.forEach((key) => updateLaunchClockCell(key, date, FAST_HALF_MS));
    if (randomOfficeMode) {
      window.__launchClockState = {
        activeCells: activeLaunchClockCells.size,
        time: fullTimeFor('Australia/Melbourne', date),
        updatedAt: Date.now()
      };
    }
  }

  function startLiveLaunchClock() {
    activeLaunchClockCells.clear();
    for (let digitIndex = 0; digitIndex < DIGIT_STARTS.length; digitIndex += 1) {
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          const globalRow = 1 + row;
          const globalCol = CENTRE_START + DIGIT_STARTS[digitIndex] + col;
          const key = `${digitIndex}:${row}:${col}`;
          window.setTimeout(() => {
            activeLaunchClockCells.add(key);
            updateLaunchClockCell(key, now(), NORMAL_HALF_MS);
            updateRandomDebugState();
          }, launchDelay(globalRow, globalCol));
        }
      }
    }

    const liveLaunchTick = () => {
      if (!document.body.classList.contains('launching')) return;
      updateActiveLaunchClock(now());
      pulseColons();
      launchClockTimer = window.setTimeout(liveLaunchTick, 1000 - (Date.now() % 1000) + 8);
    };
    launchClockTimer = window.setTimeout(liveLaunchTick, 1000 - (Date.now() % 1000) + 8);
  }


  function pulseColons() {
"""))

replacements.append((
"""  function startRuntime() {
    const date = now();
    const time = fullTimeFor('Australia/Melbourne', date);
    lastSecond = Number(time.slice(-2));
    lastMinuteKey = time.slice(0, 5);
    document.body.classList.remove('launching');
    pulseColons();

    if (cycleOffices && !fixedDate) {
      window.setInterval(() => {
        officePage += 1;
        renderOfficeCards(now(), 'page');
      }, OFFICE_PAGE_MS);
    }
""",
"""  function startRuntime() {
    const date = now();
    const time = fullTimeFor('Australia/Melbourne', date);
    lastSecond = Number(time.slice(-2));
    lastMinuteKey = time.slice(0, 5);
    document.body.classList.remove('launching');
    window.clearTimeout(launchClockTimer);
    activeLaunchClockCells.clear();
    pulseColons();

    if (cycleOffices && !fixedDate) {
      window.setInterval(() => {
        if (randomOfficeMode) advanceRandomOffices();
        else {
          officePage += 1;
          renderOfficeCards(now(), 'page');
        }
      }, randomOfficeMode ? randomIntervalMs : OFFICE_PAGE_MS);
    }
"""))

replacements.append((
"""  async function initialise() {
    fitStage();
    buildBoard();
    document.body.classList.add('launching');

    await Promise.race([loadWeather(false), delay(WEATHER_BOOT_TIMEOUT_MS)]);
    const date = now();
    renderMetadata('launch');
    renderOfficeCards(date, 'launch');
    renderClock(date, 'launch');

    const launchEnd = launchDelay(TOTAL_ROWS - 1, TOTAL_COLS - 1) + NORMAL_HALF_MS * 2 + 160;
""",
"""  async function initialise() {
    fitStage();
    buildBoard();
    document.body.classList.add('launching');
    if (randomOfficeMode) initialiseRandomOffices();

    await Promise.race([loadWeather(false), delay(WEATHER_BOOT_TIMEOUT_MS)]);
    const date = now();
    renderMetadata('launch');
    renderOfficeCards(date, 'launch');
    if (randomOfficeMode && !noAnimation) startLiveLaunchClock();
    else renderClock(date, 'launch');

    const launchEnd = launchDelay(TOTAL_ROWS - 1, TOTAL_COLS - 1) + NORMAL_HALF_MS * 2 + 160;
"""))

for old, new in replacements:
    if old not in text:
        if new in text:
            continue
        raise RuntimeError(f"Expected patch target not found:\n{old[:180]}")
    text = text.replace(old, new, 1)

JS.write_text(text, encoding="utf-8")

html = RANDOM_HTML.read_text(encoding="utf-8")
html = html.replace('  <script src="random-office-mode.js?v=1"></script>\n', '')
html = html.replace('wall-live.js?v=10', 'wall-live.js?v=11')
RANDOM_HTML.write_text(html, encoding="utf-8")

# Static assertions for CI/QC.
assert "const randomOfficeMode" in text
assert "initialiseRandomOffices();" in text
assert "advanceRandomOffices();" in text
assert "startLiveLaunchClock();" in text
assert "window.__launchClockState" in text
assert "random-office-mode.js" not in html
assert "wall-live.js?v=11" in html
print("Applied random-office v2 and live launch clock support")
