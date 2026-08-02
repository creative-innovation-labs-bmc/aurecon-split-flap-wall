(() => {
  'use strict';

  const STAGE_W = 3840;
  const STAGE_H = 804;
  const SECTION_COUNT = 7;
  const NORMAL_HALF_MS = 300;
  const FAST_HALF_MS = 95;
  const OFFICE_PAGE_MS = 18000;
  const HERO_CLOCK_MS = 15000;
  const HERO_LOCATION_MS = 5000;
  const FOOTER_MS = 6000;
  const COLON_PULSE_MS = 155;

  const LAYOUTS = {
    '49x7': {
      totalCols: 49,
      rows: 7,
      colsPerSection: 7,
      sideCols: 14,
      sideRows: 7,
      centreStart: 14,
      centreCols: 21,
      macroRowStart: 1,
      macroRows: 5
    },
    '42x6': {
      totalCols: 42,
      rows: 6,
      colsPerSection: 6,
      sideCols: 12,
      sideRows: 6,
      centreStart: 12,
      centreCols: 18,
      macroRowStart: 0,
      macroRows: 5
    }
  };

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

  const DIGITS_3X5 = {
    '0': ['111', '101', '101', '101', '111'],
    '1': ['010', '110', '010', '010', '111'],
    '2': ['111', '001', '111', '100', '111'],
    '3': ['111', '001', '111', '001', '111'],
    '4': ['101', '101', '111', '001', '001'],
    '5': ['111', '100', '111', '001', '111'],
    '6': ['111', '100', '111', '101', '111'],
    '7': ['111', '001', '010', '010', '010'],
    '8': ['111', '101', '111', '101', '111'],
    '9': ['111', '101', '111', '001', '111']
  };

  const LOCATION_PATTERNS = {
    '49x7': {
      M: ['1000001', '1100011', '1010101', '1001001', '1000001'],
      E: ['1111111', '1000000', '1111110', '1000000', '1111111'],
      L: ['1000000', '1000000', '1000000', '1000000', '1111111']
    },
    '42x6': {
      M: ['100001', '110011', '101101', '100001', '100001'],
      E: ['111111', '100000', '111110', '100000', '111111'],
      L: ['100000', '100000', '100000', '100000', '111111']
    }
  };

  const params = new URLSearchParams(window.location.search);
  const requestedLayout = params.get('layout');
  const layoutName = LAYOUTS[requestedLayout]
    ? requestedLayout
    : (document.body.dataset.layout || '49x7');
  const layout = LAYOUTS[layoutName];
  document.body.dataset.layout = layoutName;

  const noAnimation = params.get('noanim') === '1';
  const cycleOffices = params.get('cycle') !== '0';
  const forcedMode = params.get('mode');
  const heroAutoCycle = forcedMode !== 'clock' && forcedMode !== 'location';
  const fixedDate = parseFixedDate(params.get('testutc'));
  let heroMode = forcedMode === 'location' ? 'location' : 'clock';

  if (params.get('debug') === '1') document.body.classList.add('debug');

  const weather = {
    temp: sanitise(params.get('temp') || '17.4', 5),
    condition: sanitise(params.get('condition') || 'SUNNY', 7),
    wind: sanitise(params.get('wind') || 'SW22', 5),
    humidity: sanitise(params.get('hum') || '68', 2),
    rain: sanitise(params.get('rain') || '40', 2)
  };

  const viewport = document.getElementById('viewport');
  const stage = document.getElementById('stage');
  const board = document.getElementById('board');
  const cells = Array.from({ length: layout.rows }, () => Array(layout.totalCols));
  const officeSlots = [];
  const formatters = new Map();
  const heroColons = [];

  let officePage = 0;
  let footerPhase = 0;
  let lastSecond = -1;
  let colonTimer = 0;

  function parseFixedDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function now() {
    return fixedDate ? new Date(fixedDate.getTime()) : new Date();
  }

  function sanitise(value, maxLength) {
    return String(value ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9.°%-]/g, '')
      .slice(0, maxLength);
  }

  function fitStage() {
    const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    const scaledWidth = STAGE_W * scale;
    const scaledHeight = STAGE_H * scale;
    stage.style.left = `${Math.round((window.innerWidth - scaledWidth) / 2)}px`;
    stage.style.top = `${Math.round((window.innerHeight - scaledHeight) / 2)}px`;
    stage.style.transform = `scale(${scale})`;
  }

  function applyMacroFace(element, isMacro) {
    element.classList.toggle('macro-face', Boolean(isMacro));
  }

  function createFlap(row, col) {
    const flap = document.createElement('div');
    flap.className = 'flap';
    flap.dataset.value = ' ';
    flap.dataset.macro = '0';
    flap.dataset.coord = `${col + 1},${row + 1}`;
    flap.innerHTML = [
      '<div class="panel top"><span> </span></div>',
      '<div class="panel bottom"><span> </span></div>',
      '<div class="flip-half top-flip"><span> </span></div>',
      '<div class="flip-half bottom-flip"><span> </span></div>'
    ].join('');

    const faces = {
      top: flap.querySelector('.panel.top'),
      bottom: flap.querySelector('.panel.bottom'),
      topFlip: flap.querySelector('.top-flip'),
      bottomFlip: flap.querySelector('.bottom-flip')
    };
    const spans = {
      top: faces.top.querySelector('span'),
      bottom: faces.bottom.querySelector('span'),
      topFlip: faces.topFlip.querySelector('span'),
      bottomFlip: faces.bottomFlip.querySelector('span')
    };

    flap._delayTimer = 0;
    flap._timerA = 0;
    flap._timerB = 0;

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
      Object.values(spans).forEach((span) => { span.textContent = next; });
      Object.values(faces).forEach((face) => applyMacroFace(face, macro));
    };

    flap.update = (value, macro = false, delay = 0, halfMs = NORMAL_HALF_MS) => {
      const next = String(value ?? ' ').slice(0, 1) || ' ';
      const nextMacro = Boolean(macro);
      const current = flap.dataset.value || ' ';
      const currentMacro = flap.dataset.macro === '1';
      if (current === next && currentMacro === nextMacro) return;

      const run = () => {
        flap.cancel();
        const liveCurrent = flap.dataset.value || ' ';
        const liveMacro = flap.dataset.macro === '1';
        if (liveCurrent === next && liveMacro === nextMacro) return;

        if (noAnimation || halfMs <= 1) {
          flap.setStatic(next, nextMacro);
          return;
        }

        spans.top.textContent = liveCurrent;
        spans.bottom.textContent = liveCurrent;
        spans.topFlip.textContent = liveCurrent;
        spans.bottomFlip.textContent = next;
        applyMacroFace(faces.top, liveMacro);
        applyMacroFace(faces.bottom, liveMacro);
        applyMacroFace(faces.topFlip, liveMacro);
        applyMacroFace(faces.bottomFlip, nextMacro);

        flap.style.setProperty('--flip-half-ms', `${halfMs}ms`);
        flap.classList.remove('flipping');
        void flap.offsetWidth;
        flap.classList.add('flipping');

        flap._timerA = window.setTimeout(() => {
          spans.top.textContent = next;
          applyMacroFace(faces.top, nextMacro);
        }, halfMs);

        flap._timerB = window.setTimeout(() => {
          spans.bottom.textContent = next;
          spans.topFlip.textContent = next;
          spans.bottomFlip.textContent = next;
          applyMacroFace(faces.bottom, nextMacro);
          applyMacroFace(faces.topFlip, nextMacro);
          applyMacroFace(faces.bottomFlip, nextMacro);
          flap.dataset.value = next;
          flap.dataset.macro = nextMacro ? '1' : '0';
          flap.classList.remove('flipping');
          flap._timerA = 0;
          flap._timerB = 0;
        }, halfMs * 2 + 20);
      };

      if (delay > 0) {
        flap._delayTimer = window.setTimeout(() => {
          flap._delayTimer = 0;
          run();
        }, delay);
      } else {
        run();
      }
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

    [3, 4].forEach((boundary) => {
      const colon = document.createElement('div');
      colon.className = 'hero-colon';
      colon.style.left = `${boundary * 540}px`;
      colon.setAttribute('aria-hidden', 'true');
      board.appendChild(colon);
      heroColons.push(colon);
    });
  }

  function setCell(row, col, char = ' ', macro = false, delay = 0, halfMs = NORMAL_HALF_MS) {
    if (row < 0 || row >= layout.rows || col < 0 || col >= layout.totalCols) return;
    cells[row][col].update(char, macro, delay, halfMs);
  }

  function writeText(row, startCol, width, text, delayBase = 0, instant = false) {
    const value = String(text ?? '').slice(0, width).padEnd(width, ' ');
    for (let index = 0; index < width; index += 1) {
      const flap = cells[row][startCol + index];
      if (instant) flap.setStatic(value[index], false);
      else flap.update(value[index], false, delayBase + index * 7, NORMAL_HALF_MS);
    }
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
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        hourCycle: 'h23'
      }));
    }
    return formatters.get(timeZone);
  }

  function timeFor(timeZone, date = now()) {
    const parts = formatterFor(timeZone).formatToParts(date);
    const map = Object.fromEntries(
      parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
    );
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
    const pageOffices = Array.from(
      { length: capacity },
      (_, index) => OFFICES[(start + index) % OFFICES.length] || null
    );

    for (let row = 0; row < layout.sideRows; row += 1) {
      officeSlots[row] = { side: 'left', office: pageOffices[row] };
      officeSlots[layout.sideRows + row] = {
        side: 'right',
        office: pageOffices[layout.sideRows + row]
      };
    }
    renderOfficeRows(now(), animate);
  }

  function renderOfficeRows(date = now(), animate = true) {
    const rightStart = layout.totalCols - layout.sideCols;
    officeSlots.forEach((slot, index) => {
      const row = index % layout.sideRows;
      const startCol = slot.side === 'left' ? 0 : rightStart;
      const text = slot.office ? officeLine(slot.office, date) : ' '.repeat(layout.sideCols);
      const delay = animate ? row * 95 + (slot.side === 'right' ? 48 : 0) : 0;
      writeText(row, startCol, layout.sideCols, text, delay, !animate && noAnimation);
    });
  }

  function clearMacro(delayBase = 0, halfMs = NORMAL_HALF_MS) {
    for (let row = 0; row < layout.macroRows; row += 1) {
      for (let col = 0; col < layout.centreCols; col += 1) {
        setCell(
          layout.macroRowStart + row,
          layout.centreStart + col,
          ' ',
          false,
          delayBase + row * 8 + col * 4,
          halfMs
        );
      }
    }
  }

  function drawPattern(pattern, rowStart, colStart, delayBase = 0, halfMs = NORMAL_HALF_MS) {
    pattern.forEach((line, row) => {
      [...line].forEach((value, col) => {
        const on = value === '1';
        setCell(
          rowStart + row,
          colStart + col,
          ' ',
          on,
          delayBase + row * 10 + col * 6,
          halfMs
        );
      });
    });
  }

  function setColonsVisible(visible) {
    heroColons.forEach((colon) => colon.classList.toggle('is-hidden', !visible));
  }

  function pulseColons() {
    window.clearTimeout(colonTimer);
    heroColons.forEach((colon) => colon.classList.add('is-dim'));
    colonTimer = window.setTimeout(() => {
      heroColons.forEach((colon) => colon.classList.remove('is-dim'));
    }, COLON_PULSE_MS);
  }

  function renderClockMacro(date = now(), transition = false) {
    setColonsVisible(true);
    const digits = timeFor('Australia/Melbourne', date).replaceAll(':', '');
    const rowStart = layout.macroRowStart;
    const sectionCols = layout.colsPerSection;

    for (let group = 0; group < 3; group += 1) {
      const sectionStart = (2 + group) * sectionCols;
      const digitA = DIGITS_3X5[digits[group * 2]];
      const digitB = DIGITS_3X5[digits[group * 2 + 1]];

      if (layoutName === '49x7') {
        drawPattern(digitA, rowStart, sectionStart, transition ? group * 95 : 0, transition ? FAST_HALF_MS : NORMAL_HALF_MS);
        drawPattern(digitB, rowStart, sectionStart + 4, transition ? group * 95 + 35 : 0, transition ? FAST_HALF_MS : NORMAL_HALF_MS);
        for (let row = 0; row < 5; row += 1) {
          setCell(rowStart + row, sectionStart + 3, ' ', false, transition ? group * 95 + 25 : 0, transition ? FAST_HALF_MS : NORMAL_HALF_MS);
        }
      } else {
        drawPattern(digitA, rowStart, sectionStart, transition ? group * 95 : 0, transition ? FAST_HALF_MS : NORMAL_HALF_MS);
        drawPattern(digitB, rowStart, sectionStart + 3, transition ? group * 95 + 35 : 0, transition ? FAST_HALF_MS : NORMAL_HALF_MS);
      }
    }
  }

  function renderLocationMacro(transition = true) {
    setColonsVisible(false);
    const patterns = LOCATION_PATTERNS[layoutName];
    ['M', 'E', 'L'].forEach((letter, index) => {
      const sectionStart = (2 + index) * layout.colsPerSection;
      drawPattern(
        patterns[letter],
        layout.macroRowStart,
        sectionStart,
        transition ? index * 110 : 0,
        transition ? FAST_HALF_MS : NORMAL_HALF_MS
      );
    });
  }

  function metadataLineA() {
    return `MELBOURNE AU ${weather.temp}°`;
  }

  function metadataLineB() {
    return `${weather.condition} ${weather.wind} H${weather.humidity} R${weather.rain}`;
  }

  function renderMetadata(instant = false) {
    if (layoutName === '49x7') {
      writeText(0, layout.centreStart, layout.centreCols, centred(metadataLineA(), layout.centreCols), 0, instant);
      writeText(6, layout.centreStart, layout.centreCols, centred(metadataLineB(), layout.centreCols), 0, instant);
    } else {
      const text = footerPhase % 2 === 0 ? metadataLineA() : metadataLineB();
      writeText(5, layout.centreStart, layout.centreCols, centred(text, layout.centreCols), 0, instant);
    }
  }

  function setHeroMode(nextMode) {
    heroMode = nextMode;
    if (heroMode === 'location') renderLocationMacro(true);
    else renderClockMacro(now(), true);
  }

  function scheduleHeroCycle() {
    if (!heroAutoCycle || fixedDate) return;
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
    if (layoutName !== '42x6' || fixedDate) return;
    window.setInterval(() => {
      footerPhase += 1;
      renderMetadata(false);
    }, FOOTER_MS);
  }

  function tick() {
    const date = now();
    renderOfficeRows(date, false);
    if (heroMode === 'clock') renderClockMacro(date, false);

    const seconds = Number(timeFor('Australia/Melbourne', date).slice(-2));
    if (seconds !== lastSecond) {
      lastSecond = seconds;
      if (heroMode === 'clock') pulseColons();
    }

    if (!fixedDate) {
      window.setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
    }
  }

  function initialise() {
    fitStage();
    buildBoard();
    renderMetadata(noAnimation);
    assignOfficePage(0, !noAnimation);
    if (heroMode === 'location') renderLocationMacro(!noAnimation);
    else renderClockMacro(now(), !noAnimation);

    if (cycleOffices && !fixedDate) {
      window.setInterval(() => assignOfficePage(officePage + 1, true), OFFICE_PAGE_MS);
    }

    scheduleHeroCycle();
    scheduleFooterCycle();
    tick();
  }

  window.addEventListener('resize', fitStage, { passive: true });

  if (document.fonts && document.fonts.ready) {
    Promise.race([
      document.fonts.ready,
      new Promise((resolve) => window.setTimeout(resolve, 1500))
    ]).then(initialise);
  } else {
    window.setTimeout(initialise, 80);
  }
})();
