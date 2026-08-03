(() => {
  'use strict';

  const OFFICE_PAGE_MS = 14000;
  const OFFICE_CHAR_STAGGER_MS = 46;
  const OFFICE_LINE_STEP_MS = 520;
  const CARD_STAGGER_MS = 1540;
  const HALF_FLIP_MS = 300;
  const SIDE_COLS = 8;
  const TOTAL_COLS = 49;
  const RIGHT_START = TOTAL_COLS - SIDE_COLS;

  const OFFICES = [
    { display: 'ADELAIDE', country: 'AUS', tz: 'Australia/Adelaide' },
    { display: 'BRISBANE', country: 'AUS', tz: 'Australia/Brisbane' },
    { display: 'CAIRNS', country: 'AUS', tz: 'Australia/Brisbane' },
    { display: 'CANBERRA', country: 'AUS', tz: 'Australia/Sydney' },
    { display: 'DARWIN', country: 'AUS', tz: 'Australia/Darwin' },
    { display: 'GLADSTON', country: 'AUS', tz: 'Australia/Brisbane' },
    { display: 'GOLDCOST', country: 'AUS', tz: 'Australia/Brisbane' },
    { display: 'MACKAY', country: 'AUS', tz: 'Australia/Brisbane' },
    { display: 'MAROOCHY', country: 'AUS', tz: 'Australia/Brisbane' },
    { display: 'NEWCASTL', country: 'AUS', tz: 'Australia/Sydney' },
    { display: 'PERTH', country: 'AUS', tz: 'Australia/Perth' },
    { display: 'SYDNEY', country: 'AUS', tz: 'Australia/Sydney' },
    { display: 'TOOWOOMB', country: 'AUS', tz: 'Australia/Brisbane' },
    { display: 'TOWNSVIL', country: 'AUS', tz: 'Australia/Brisbane' },
    { display: 'BEIJING', country: 'CHN', tz: 'Asia/Shanghai' },
    { display: 'SHANGHAI', country: 'CHN', tz: 'Asia/Shanghai' },
    { display: 'HONGKONG', country: 'HKG', tz: 'Asia/Hong_Kong' },
    { display: 'JAKARTA', country: 'IDN', tz: 'Asia/Jakarta' },
    { display: 'MACAU', country: 'MAC', tz: 'Asia/Macau' },
    { display: 'JOHOR', country: 'MYS', tz: 'Asia/Kuala_Lumpur' },
    { display: 'PETALING', country: 'MYS', tz: 'Asia/Kuala_Lumpur' },
    { display: 'AUCKLAND', country: 'NZL', tz: 'Pacific/Auckland' },
    { display: 'CHRISTCH', country: 'NZL', tz: 'Pacific/Auckland' },
    { display: 'HAMILTON', country: 'NZL', tz: 'Pacific/Auckland' },
    { display: 'TAURANGA', country: 'NZL', tz: 'Pacific/Auckland' },
    { display: 'WELLINGT', country: 'NZL', tz: 'Pacific/Auckland' },
    { display: 'MANILA', country: 'PHL', tz: 'Asia/Manila' },
    { display: 'SINGAPOR', country: 'SGP', tz: 'Asia/Singapore' },
    { display: 'BANGKOK', country: 'THA', tz: 'Asia/Bangkok' },
    { display: 'HOCHIMIN', country: 'VNM', tz: 'Asia/Ho_Chi_Minh' }
  ].map((office, index) => ({ ...office, id: index }));

  const originalParams = new URLSearchParams(window.location.search);
  const randomCycleEnabled = originalParams.get('randomcycle') !== '0';
  const noAnimation = originalParams.get('noanim') === '1';
  const debug = originalParams.get('randomdebug') === '1';
  const intervalMs = Math.max(2500, Number(originalParams.get('interval')) || OFFICE_PAGE_MS);

  function seededGenerator(seedValue) {
    let state = Number(seedValue) >>> 0;
    return () => {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  const seeded = originalParams.has('seed')
    ? seededGenerator(originalParams.get('seed'))
    : null;

  function randomValue() {
    if (seeded) return seeded();
    if (window.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return value[0] / 4294967296;
    }
    return Math.random();
  }

  function randomInt(max) {
    return Math.floor(randomValue() * max);
  }

  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  const requestedStart = Number(originalParams.get('startpage'));
  const startPage = Number.isInteger(requestedStart) && requestedStart >= 0 && requestedStart <= 6
    ? requestedStart
    : randomInt(7);

  const liveParams = new URLSearchParams(originalParams);
  liveParams.set('cycle', '0');
  liveParams.set('page', String(startPage));
  liveParams.set('randommode', '1');
  window.history.replaceState(null, '', `${window.location.pathname}?${liveParams.toString()}${window.location.hash}`);

  const initialCards = Array.from({ length: 4 }, (_, offset) => OFFICES[startPage * 4 + offset]);
  let currentCards = [...initialCards];
  let deck = shuffle(OFFICES.filter((office) => !initialCards.some((shown) => shown.id === office.id)));
  let deckIndex = 0;
  let cycleSeen = new Set(initialCards.map((office) => office.id));
  let cellMap = null;
  let nextTimer = 0;
  let minuteTimer = 0;

  function log(...args) {
    if (debug) console.log('[random offices]', ...args);
  }

  function centred(text, width) {
    const clean = String(text ?? '').slice(0, width);
    const remaining = width - clean.length;
    const left = Math.floor(remaining / 2);
    return `${' '.repeat(left)}${clean}${' '.repeat(remaining - left)}`;
  }

  function centredOfficeName(text, width, isRight) {
    const clean = String(text ?? '').slice(0, width);
    const remaining = width - clean.length;
    let left = Math.floor(remaining / 2);
    if (isRight && (clean.length === 5 || clean.length === 7) && remaining > 0) {
      left = Math.min(left + 1, remaining);
    }
    return `${' '.repeat(left)}${clean}${' '.repeat(remaining - left)}`;
  }

  const formatters = new Map();
  function formatterFor(timeZone) {
    if (!formatters.has(timeZone)) {
      formatters.set(timeZone, new Intl.DateTimeFormat('en-AU', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        hourCycle: 'h23'
      }));
    }
    return formatters.get(timeZone);
  }

  function shortTimeFor(timeZone, date = new Date()) {
    const parts = formatterFor(timeZone).formatToParts(date);
    const mapped = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    if (mapped.hour === '24') mapped.hour = '00';
    return { hour: mapped.hour, minute: mapped.minute };
  }

  function officeTimeText(timeZone, width, date = new Date()) {
    const time = shortTimeFor(timeZone, date);
    return width === SIDE_COLS - 1
      ? ` ${time.hour} ${time.minute} `
      : ` ${time.hour} ${time.minute}  `;
  }

  function getCell(row, col) {
    return cellMap.get(`${col + 1},${row + 1}`);
  }

  function writeText(row, startCol, width, text, delayBase = 0, charStagger = OFFICE_CHAR_STAGGER_MS) {
    const value = String(text ?? '').slice(0, width).padEnd(width, ' ');
    for (let index = 0; index < width; index += 1) {
      const flap = getCell(row, startCol + index);
      if (!flap) continue;
      if (noAnimation) {
        flap.setStatic(value[index], false);
      } else {
        flap._randomOriginalUpdate(value[index], false, delayBase + index * charStagger, HALF_FLIP_MS);
      }
    }
  }

  const slots = [
    { startCol: 0, startRow: 0, isRight: false },
    { startCol: 0, startRow: 4, isRight: false },
    { startCol: RIGHT_START, startRow: 0, isRight: true },
    { startCol: RIGHT_START, startRow: 4, isRight: true }
  ];

  function writeCard(slotIndex, office, sequenceIndex, date = new Date()) {
    const slot = slots[slotIndex];
    const detailStart = slot.isRight ? slot.startCol + 1 : slot.startCol;
    const detailWidth = slot.isRight ? SIDE_COLS - 1 : SIDE_COLS;
    const baseDelay = sequenceIndex * CARD_STAGGER_MS;
    const lines = [
      { row: slot.startRow, start: slot.startCol, width: SIDE_COLS, text: centredOfficeName(office.display, SIDE_COLS, slot.isRight) },
      { row: slot.startRow + 1, start: detailStart, width: detailWidth, text: centred(office.country, detailWidth) },
      { row: slot.startRow + 2, start: detailStart, width: detailWidth, text: officeTimeText(office.tz, detailWidth, date) }
    ];
    lines.forEach((line, lineIndex) => {
      writeText(line.row, line.start, line.width, line.text, baseDelay + lineIndex * OFFICE_LINE_STEP_MS);
    });
  }

  function refreshCurrentTimes() {
    const date = new Date();
    currentCards.forEach((office, slotIndex) => {
      if (!office) return;
      const slot = slots[slotIndex];
      const detailStart = slot.isRight ? slot.startCol + 1 : slot.startCol;
      const detailWidth = slot.isRight ? SIDE_COLS - 1 : SIDE_COLS;
      writeText(slot.startRow + 2, detailStart, detailWidth, officeTimeText(office.tz, detailWidth, date), slotIndex * 80, 18);
    });
  }

  function createNextCycleDeck() {
    const visibleIds = new Set(currentCards.filter(Boolean).map((office) => office.id));
    let candidate = shuffle(OFFICES);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (candidate.slice(0, 4).every((office) => !visibleIds.has(office.id))) break;
      candidate = shuffle(OFFICES);
    }
    deck = candidate;
    deckIndex = 0;
    cycleSeen = new Set();
    log('new cycle', deck.map((office) => office.display));
  }

  function nextRandomBatch() {
    if (deckIndex >= deck.length) createNextCycleDeck();

    const remaining = deck.length - deckIndex;
    const count = Math.min(4, remaining);
    const batch = deck.slice(deckIndex, deckIndex + count);
    const targetSlots = count === 2 ? [0, 1] : [0, 1, 2, 3].slice(0, count);

    for (const office of batch) {
      if (cycleSeen.has(office.id)) {
        console.error('Random office cycle attempted a repeat before all offices were shown:', office.display);
        return;
      }
    }

    batch.forEach((office, batchIndex) => {
      const slotIndex = targetSlots[batchIndex];
      writeCard(slotIndex, office, batchIndex);
      currentCards[slotIndex] = office;
      cycleSeen.add(office.id);
    });
    deckIndex += count;

    log('batch', batch.map((office) => office.display), `shown ${cycleSeen.size}/${OFFICES.length}`);
    if (deckIndex >= deck.length) log('all offices shown once before reshuffle');
    scheduleNext();
  }

  function scheduleNext() {
    window.clearTimeout(nextTimer);
    if (randomCycleEnabled) nextTimer = window.setTimeout(nextRandomBatch, intervalMs);
  }

  function lockSideCells() {
    const sideColumns = [...Array(SIDE_COLS).keys(), ...Array.from({ length: SIDE_COLS }, (_, index) => RIGHT_START + index)];
    for (let row = 0; row < 7; row += 1) {
      for (const col of sideColumns) {
        const flap = getCell(row, col);
        if (!flap || flap._randomOriginalUpdate) continue;
        flap._randomOriginalUpdate = flap.update;
        flap.update = () => {};
      }
    }
  }

  function beginRandomMode() {
    const flaps = [...document.querySelectorAll('.flap[data-coord]')];
    cellMap = new Map(flaps.map((flap) => [flap.dataset.coord, flap]));
    lockSideCells();
    log('initial page', startPage, initialCards.map((office) => office.display));
    refreshCurrentTimes();
    scheduleNext();

    const alignMinute = 60000 - (Date.now() % 60000) + 80;
    minuteTimer = window.setTimeout(function minuteTick() {
      refreshCurrentTimes();
      minuteTimer = window.setTimeout(minuteTick, 60000);
    }, alignMinute);
  }

  const readyTimer = window.setInterval(() => {
    const firstFlap = document.querySelector('.flap[data-coord]');
    const ready = document.querySelectorAll('.flap[data-coord]').length === 343
      && firstFlap
      && typeof firstFlap.update === 'function'
      && !document.body.classList.contains('launching');
    if (!ready) return;
    window.clearInterval(readyTimer);
    beginRandomMode();
  }, 100);
})();
