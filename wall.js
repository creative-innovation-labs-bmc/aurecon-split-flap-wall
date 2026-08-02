(() => {
  'use strict';

  const STAGE_W = 3840;
  const STAGE_H = 804;
  const SECTION_COUNT = 7;
  const NORMAL_HALF_MS = 145;
  const FAST_HALF_MS = 88;
  const OFFICE_PAGE_MS = 18000;
  const HERO_CLOCK_MS = 15000;
  const HERO_LOCATION_MS = 5000;
  const FOOTER_MS = 6000;
  const MACRO_MARK = '●';

  const LAYOUTS = {
    '49x7': { totalCols: 49, rows: 7, colsPerSection: 7, sideCols: 14, centreCols: 21, sideRows: 7 },
    '42x6': { totalCols: 42, rows: 6, colsPerSection: 6, sideCols: 12, centreCols: 18, sideRows: 6 }
  };

  // Current office list from Aurecon's public locations page, excluding Melbourne,
  // which remains the permanent hero city in the centre.
  const OFFICES = [
    { code: 'ADL', name: 'Adelaide', tz: 'Australia/Adelaide' },
    { code: 'BNE', name: 'Brisbane', tz: 'Australia/Brisbane' },
    { code: 'CNS', name: 'Cairns', tz: 'Australia/Brisbane' },
    { code: 'CBR', name: 'Canberra', tz: 'Australia/Sydney' },
    { code: 'DRW', name: 'Darwin', tz: 'Australia/Darwin' },
    { code: 'GLD', name: 'Gladstone', tz: 'Australia/Brisbane' },
    { code: 'GCO', name: 'Gold Coast', tz: 'Australia/Brisbane' },
    { code: 'MKY', name: 'Mackay', tz: 'Australia/Brisbane' },
    { code: 'MCH', name: 'Maroochydore', tz: 'Australia/Brisbane' },
    { code: 'NCL', name: 'Newcastle', tz: 'Australia/Sydney' },
    { code: 'PER', name: 'Perth', tz: 'Australia/Perth' },
    { code: 'SYD', name: 'Sydney', tz: 'Australia/Sydney' },
    { code: 'TWB', name: 'Toowoomba', tz: 'Australia/Brisbane' },
    { code: 'TSV', name: 'Townsville', tz: 'Australia/Brisbane' },
    { code: 'BJN', name: 'Beijing', tz: 'Asia/Shanghai' },
    { code: 'SHA', name: 'Shanghai', tz: 'Asia/Shanghai' },
    { code: 'HKG', name: 'Hong Kong', tz: 'Asia/Hong_Kong' },
    { code: 'JKT', name: 'Jakarta', tz: 'Asia/Jakarta' },
    { code: 'MAC', name: 'Macau', tz: 'Asia/Macau' },
    { code: 'JHB', name: 'Johor Bahru', tz: 'Asia/Kuala_Lumpur' },
    { code: 'KUL', name: 'Petaling Jaya', tz: 'Asia/Kuala_Lumpur' },
    { code: 'AKL', name: 'Auckland', tz: 'Pacific/Auckland' },
    { code: 'CHC', name: 'Christchurch', tz: 'Pacific/Auckland' },
    { code: 'HAM', name: 'Hamilton', tz: 'Pacific/Auckland' },
    { code: 'TRG', name: 'Tauranga', tz: 'Pacific/Auckland' },
    { code: 'WLG', name: 'Wellington', tz: 'Pacific/Auckland' },
    { code: 'MNL', name: 'Manila', tz: 'Asia/Manila' },
    { code: 'SGP', name: 'Singapore', tz: 'Asia/Singapore' },
    { code: 'BKK', name: 'Bangkok', tz: 'Asia/Bangkok' },
    { code: 'HCM', name: 'Ho Chi Minh City', tz: 'Asia/Ho_Chi_Minh' }
  ];

  const DIGIT_SEGMENTS = {
    '0': 'abcdef',
    '1': 'bc',
    '2': 'abged',
    '3': 'abgcd',
    '4': 'fgbc',
    '5': 'afgcd',
    '6': 'afgecd',
    '7': 'abc',
    '8': 'abcdefg',
    '9': 'abfgcd'
  };

  const LETTERS_5X5 = {
    M: ['10001', '11011', '10101', '10001', '10001'],
    E: ['11111', '10000', '11110', '10000', '11111'],
    L: ['10000', '10000', '10000', '10000', '11111']
  };

  const LETTERS_6X5 = {
    M: ['100001', '110011', '101101', '100001', '100001'],
    E: ['111111', '100000', '111110', '100000', '111111'],
    L: ['100000', '100000', '100000', '100000', '111111']
  };

  const params = new URLSearchParams(window.location.search);
  const requestedLayout = params.get('layout');
  const layoutName = LAYOUTS[requestedLayout] ? requestedLayout : (document.body.dataset.layout || '49x7');
  const layout = LAYOUTS[layoutName];
  document.body.dataset.layout = layoutName;
  if (params.get('debug') === '1') document.body.classList.add('debug');

  const noAnimation = params.get('noanim') === '1';
  const cycleOffices = params.get('cycle') !== '0';
  const forcedMode = params.get('mode');
  const heroAutoCycle = forcedMode !== 'clock' && forcedMode !== 'location';
  let heroMode = forcedMode === 'location' ? 'location' : 'clock';

  const weather = {
    temp: sanitise(params.get('temp') || '17.4', 5),
    condition: sanitise(params.get('condition') || 'SUNNY', 7),
    wind: sanitise(params.get('wind') || 'SW22K', 5),
    humidity: sanitise(params.get('hum') || '68', 2),
    rain: sanitise(params.get('rain') || '40', 2)
  };

  const viewport = document.getElementById('viewport');
  const stage = document.getElementById('stage');
  const board = document.getElementById('board');
  const cells = Array.from({ length: layout.rows }, () => Array(layout.totalCols));
  const officeRows = [];
  const formatters = new Map();
  let officePage = 0;
  let footerPhase = 0;

  function sanitise(value, maxLength) {
    return String(value ?? '').toUpperCase().replace(/[^A-Z0-9.°%-]/g, '').slice(0, maxLength);
  }

  function fitStage() {
    const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    stage.style.transform = `scale(${scale})`;
    viewport.style.width = `${window.innerWidth}px`;
    viewport.style.height = `${window.innerHeight}px`;
  }

  function createFlap(row, col) {
    const flap = document.createElement('div');
    flap.className = 'flap';
    flap.dataset.value = ' ';
    flap.dataset.macro = '0';
    flap.dataset.coord = `${col + 1},${row + 1}`;
    flap._delayTimer = 0;
    flap._timerA = 0;
    flap._timerB = 0;
    flap.innerHTML = '<div class="panel top"><span> </span></div><div class="panel bottom"><span> </span></div><div class="flip-half top-flip"><span> </span></div><div class="flip-half bottom-flip"><span> </span></div>';

    const spans = {
      top: flap.querySelector('.panel.top span'),
      bottom: flap.querySelector('.panel.bottom span'),
      topFlip: flap.querySelector('.top-flip span'),
      bottomFlip: flap.querySelector('.bottom-flip span')
    };

    flap.cancel = () => {
      window.clearTimeout(flap._delayTimer);
      window.clearTimeout(flap._timerA);
      window.clearTimeout(flap._timerB);
      flap.classList.remove('flipping');
      flap._delayTimer = 0;
      flap._timerA = 0;
      flap._timerB = 0;
    };

    flap.setStatic = (value, macro = false) => {
      const next = String(value ?? ' ').slice(0, 1) || ' ';
      flap.cancel();
      flap.dataset.value = next;
      flap.dataset.macro = macro ? '1' : '0';
      flap.classList.toggle('macro-on', macro && next !== ' ');
      spans.top.textContent = next;
      spans.bottom.textContent = next;
      spans.topFlip.textContent = next;
      spans.bottomFlip.textContent = next;
    };

    flap.update = (value, macro = false, delay = 0, halfMs = NORMAL_HALF_MS) => {
      const next = String(value ?? ' ').slice(0, 1) || ' ';
      const nextMacro = macro && next !== ' ';
      const current = flap.dataset.value || ' ';
      const currentMacro = flap.dataset.macro === '1';
      if (current === next && currentMacro === nextMacro) return;

      const run = () => {
        flap.cancel();
        const liveCurrent = flap.dataset.value || ' ';
        const liveCurrentMacro = flap.dataset.macro === '1';
        if (liveCurrent === next && liveCurrentMacro === nextMacro) return;
        if (noAnimation || halfMs <= 1) {
          flap.setStatic(next, nextMacro);
          return;
        }

        spans.topFlip.textContent = liveCurrent;
        spans.bottomFlip.textContent = next;
        flap.style.setProperty('--flip-half-ms', `${halfMs}ms`);
        flap.classList.toggle('macro-on', nextMacro);
        flap.classList.remove('flipping');
        void flap.offsetWidth;
        flap.classList.add('flipping');

        flap._timerA = window.setTimeout(() => {
          spans.top.textContent = next;
        }, halfMs);

        flap._timerB = window.setTimeout(() => {
          spans.bottom.textContent = next;
          spans.topFlip.textContent = next;
          spans.bottomFlip.textContent = next;
          flap.dataset.value = next;
          flap.dataset.macro = nextMacro ? '1' : '0';
          flap.classList.remove('flipping');
          flap._timerA = 0;
          flap._timerB = 0;
        }, halfMs * 2 + 18);
      };

      if (delay > 0) flap._delayTimer = window.setTimeout(() => { flap._delayTimer = 0; run(); }, delay); else run();
    };

    return flap;
  }

  function buildBoard() {
    for (let sectionIndex = 0; sectionIndex < SECTION_COUNT; sectionIndex += 1) {
      const section = document.createElement('section');
      section.className = 'section';
      section.dataset.section = `SECTION ${sectionIndex + 1}`;
      section.setAttribute('aria-hidden', 'true');

      for (let row = 0; row < layout.rows; row += 1) {
        for (let localCol = 0; localCol < layout.colsPerSection; localCol += 1) {
          const globalCol = sectionIndex * layout.colsPerSection + localCol;
          const flap = createFlap(row, globalCol);
          cells[row][globalCol] = flap;
          section.appendChild(flap);
        }
      }
      board.appendChild(section);
    }
  }

  function setCell(row, col, char, macro = false, delay = 0, halfMs = NORMAL_HALF_MS) {
    if (row < 0 || row >= layout.rows || col < 0 || col >= layout.totalCols) return;
    cells[row][col].update(char, macro, delay, halfMs);
  }

  function writeText(row, startCol, width, text, delayBase = 0) {
    const value = String(text ?? '').slice(0, width).padEnd(width, ' ');
    for (let i = 0; i < width; i += 1) setCell(row, startCol + i, value[i], false, delayBase + i * 7);
  }

  function centred(text, width) {
    const clean = String(text ?? '').slice(0, width);
    const remaining = width - clean.length;
    const left = Math.floor(remaining / 2);
    return `${' '.repeat(left)}${clean}${' '.repeat(remaining - left)}`;
  }

  function formatterFor(timeZone) {
    if (!formatters.has(timeZone)) {
      formatters.set(timeZone, new Intl.DateTimeFormat('en-AU', {
        timeZone,
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, hourCycle: 'h23'
      }));
    }
    return formatters.get(timeZone);
  }

  function timeFor(timeZone, date = new Date()) {
    const parts = formatterFor(timeZone).formatToParts(date);
    const map = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${map.hour}:${map.minute}:${map.second}`;
  }

  function officeLine(office, date) {
    return centred(`${office.code} ${timeFor(office.tz, date)}`, layout.sideCols);
  }

  function assignOfficePage(page, animate = true) {
    const capacity = layout.sideRows * 2;
    const pageCount = Math.ceil(OFFICES.length / capacity);
    officePage = ((page % pageCount) + pageCount) % pageCount;
    const start = officePage * capacity;
    const slots = Array.from({ length: capacity }, (_, index) => OFFICES[start + index] || null);

    for (let row = 0; row < layout.sideRows; row += 1) {
      officeRows[row] = { side: 'left', office: slots[row] };
      officeRows[layout.sideRows + row] = { side: 'right', office: slots[layout.sideRows + row] };
    }
    renderOfficeRows(new Date(), animate);
  }

  function renderOfficeRows(date = new Date(), animate = true) {
    const rightStart = layout.totalCols - layout.sideCols;
    officeRows.forEach((slot, index) => {
      const row = index % layout.sideRows;
      const startCol = slot.side === 'left' ? 0 : rightStart;
      const text = slot.office ? officeLine(slot.office, date) : ' '.repeat(layout.sideCols);
      const rowDelay = animate ? row * 85 + (slot.side === 'right' ? 45 : 0) : 0;
      writeText(row, startCol, layout.sideCols, text, rowDelay);
    });
  }

  function sevenSegmentMatrix(digit) {
    const grid = Array.from({ length: 5 }, () => [0, 0]);
    const active = DIGIT_SEGMENTS[digit] || '';
    const segments = {
      a: [[0, 0], [0, 1]], b: [[1, 1]], c: [[3, 1]],
      d: [[4, 0], [4, 1]], e: [[3, 0]], f: [[1, 0]], g: [[2, 0], [2, 1]]
    };
    for (const segment of active) {
      for (const [row, col] of segments[segment]) grid[row][col] = 1;
    }
    return grid;
  }

  function clockColumns() {
    if (layoutName === '49x7') {
      const widths = [2, 2, 1, 2, 2, 1, 2, 2];
      const starts = [];
      let cursor = 0;
      widths.forEach((width, index) => {
        starts.push(cursor);
        cursor += width;
        if (index < widths.length - 1) cursor += 1;
      });
      return starts;
    }
    return [1, 4, 6, 7, 10, 12, 13, 16];
  }

  function renderClockMacro(date = new Date(), modeTransition = false) {
    const centreStart = layout.sideCols;
    const macroRowStart = layoutName === '49x7' ? 1 : 0;
    const starts = clockColumns();
    const time = timeFor('Australia/Melbourne', date);
    const symbols = [time[0], time[1], ':', time[3], time[4], ':', time[6], time[7]];
    const target = Array.from({ length: 5 }, () => Array(layout.centreCols).fill(0));

    symbols.forEach((symbol, index) => {
      const start = starts[index];
      if (symbol === ':') {
        target[1][start] = 1;
        target[3][start] = 1;
      } else {
        const matrix = sevenSegmentMatrix(symbol);
        for (let row = 0; row < 5; row += 1) {
          for (let col = 0; col < 2; col += 1) target[row][start + col] = matrix[row][col];
        }
      }
    });

    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < layout.centreCols; col += 1) {
        const on = target[row][col] === 1;
        const delay = modeTransition ? col * 12 + row * 7 : 0;
        setCell(macroRowStart + row, centreStart + col, on ? MACRO_MARK : ' ', on, delay, modeTransition ? FAST_HALF_MS : NORMAL_HALF_MS);
      }
    }
  }

  function renderLocationMacro() {
    const centreSectionStart = 2;
    const macroRowStart = layoutName === '49x7' ? 1 : 0;
    ['M', 'E', 'L'].forEach((letter, letterIndex) => {
      const pattern = layoutName === '42x6' ? LETTERS_6X5[letter] : LETTERS_5X5[letter];
      const patternWidth = pattern[0].length;
      const sectionGlobalStart = (centreSectionStart + letterIndex) * layout.colsPerSection;
      const xOffset = Math.floor((layout.colsPerSection - patternWidth) / 2);
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < layout.colsPerSection; col += 1) {
          const patternCol = col - xOffset;
          const on = patternCol >= 0 && patternCol < patternWidth && pattern[row][patternCol] === '1';
          const delay = letterIndex * 95 + row * 20 + col * 9;
          setCell(macroRowStart + row, sectionGlobalStart + col, on ? MACRO_MARK : ' ', on, delay, FAST_HALF_MS);
        }
      }
    });
  }

  function renderMetadata() {
    const centreStart = layout.sideCols;
    if (layoutName === '49x7') {
      writeText(0, centreStart, layout.centreCols, centred(`MELBOURNE ${weather.temp}° ${weather.condition}`, layout.centreCols));
      writeText(6, centreStart, layout.centreCols, centred(`AU ${weather.wind} HUM${weather.humidity} RAIN${weather.rain}`, layout.centreCols));
    } else {
      const footerA = centred(`MELBOURNE AU ${weather.temp}°`, layout.centreCols);
      const footerB = centred(`${weather.condition} ${weather.wind.replace('K', '')} H${weather.humidity} R${weather.rain}`, layout.centreCols);
      writeText(5, centreStart, layout.centreCols, footerPhase % 2 === 0 ? footerA : footerB);
    }
  }

  function setHeroMode(nextMode) {
    heroMode = nextMode;
    if (heroMode === 'location') renderLocationMacro();
    else renderClockMacro(new Date(), true);
  }

  function scheduleHeroCycle() {
    if (!heroAutoCycle) return;
    const next = () => {
      if (heroMode === 'clock') {
        setHeroMode('location');
        window.setTimeout(next, HERO_LOCATION_MS);
      } else {
        setHeroMode('clock');
        window.setTimeout(next, HERO_CLOCK_MS);
      }
    };
    window.setTimeout(next, HERO_CLOCK_MS);
  }

  function scheduleFooterCycle() {
    if (layoutName !== '42x6') return;
    window.setInterval(() => {
      footerPhase += 1;
      renderMetadata();
    }, FOOTER_MS);
  }

  function tick() {
    const now = new Date();
    renderOfficeRows(now, false);
    if (heroMode === 'clock') renderClockMacro(now, false);
    window.setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
  }

  function initialise() {
    fitStage();
    buildBoard();
    renderMetadata();
    assignOfficePage(0, false);
    if (heroMode === 'location') renderLocationMacro(); else renderClockMacro(new Date(), true);
    if (cycleOffices) window.setInterval(() => assignOfficePage(officePage + 1, true), OFFICE_PAGE_MS);
    scheduleHeroCycle();
    scheduleFooterCycle();
    tick();
  }

  window.addEventListener('resize', fitStage, { passive: true });
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(resolve => window.setTimeout(resolve, 1500))]).then(initialise);
  } else {
    window.setTimeout(initialise, 80);
  }
})();
