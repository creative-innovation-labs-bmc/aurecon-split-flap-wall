(() => {
  'use strict';

  const STAGE_W = 3840;
  const STAGE_H = 804;
  const TOTAL_COLS = 49;
  const TOTAL_ROWS = 7;
  const COLS_PER_SECTION = 7;
  const SECTION_COUNT = 7;
  const FLAP_W = 72;
  const GAP_X = 6;
  const SECTION_W = 540;
  const NORMAL_HALF_MS = 300;
  const FAST_HALF_MS = 105;
  const OFFICE_PAGE_MS = 14000;
  const COLON_PULSE_MS = 155;

  const VARIANTS = {
    codes: {
      sideCols: 5,
      centreStart: 5,
      centreCols: 39,
      label: 'airport codes',
      cardName: (office) => office.code
    },
    cities: {
      sideCols: 7,
      centreStart: 7,
      centreCols: 35,
      label: 'city names',
      cardName: (office) => office.display
    }
  };

  const OFFICES = [
    { code: 'ADL', display: 'ADELAID', country: 'AUS', tz: 'Australia/Adelaide' },
    { code: 'BNE', display: 'BRISBNE', country: 'AUS', tz: 'Australia/Brisbane' },
    { code: 'CNS', display: 'CAIRNS', country: 'AUS', tz: 'Australia/Brisbane' },
    { code: 'CBR', display: 'CANBRRA', country: 'AUS', tz: 'Australia/Sydney' },
    { code: 'DRW', display: 'DARWIN', country: 'AUS', tz: 'Australia/Darwin' },
    { code: 'GLD', display: 'GLADSTN', country: 'AUS', tz: 'Australia/Brisbane' },
    { code: 'GCO', display: 'GOLD CST', country: 'AUS', tz: 'Australia/Brisbane' },
    { code: 'MKY', display: 'MACKAY', country: 'AUS', tz: 'Australia/Brisbane' },
    { code: 'MCH', display: 'MAROOCH', country: 'AUS', tz: 'Australia/Brisbane' },
    { code: 'NCL', display: 'NEWCSTL', country: 'AUS', tz: 'Australia/Sydney' },
    { code: 'PER', display: 'PERTH', country: 'AUS', tz: 'Australia/Perth' },
    { code: 'SYD', display: 'SYDNEY', country: 'AUS', tz: 'Australia/Sydney' },
    { code: 'TWB', display: 'TOOWMBA', country: 'AUS', tz: 'Australia/Brisbane' },
    { code: 'TSV', display: 'TOWNSVL', country: 'AUS', tz: 'Australia/Brisbane' },
    { code: 'BJN', display: 'BEIJING', country: 'CHN', tz: 'Asia/Shanghai' },
    { code: 'SHA', display: 'SHANGHI', country: 'CHN', tz: 'Asia/Shanghai' },
    { code: 'HKG', display: 'HONGKNG', country: 'HKG', tz: 'Asia/Hong_Kong' },
    { code: 'JKT', display: 'JAKARTA', country: 'IDN', tz: 'Asia/Jakarta' },
    { code: 'MAC', display: 'MACAU', country: 'MAC', tz: 'Asia/Macau' },
    { code: 'JHB', display: 'JOHOR', country: 'MYS', tz: 'Asia/Kuala_Lumpur' },
    { code: 'KUL', display: 'PETALNG', country: 'MYS', tz: 'Asia/Kuala_Lumpur' },
    { code: 'AKL', display: 'AUCKLND', country: 'NZL', tz: 'Pacific/Auckland' },
    { code: 'CHC', display: 'CHRISTC', country: 'NZL', tz: 'Pacific/Auckland' },
    { code: 'HAM', display: 'HAMILTN', country: 'NZL', tz: 'Pacific/Auckland' },
    { code: 'TRG', display: 'TAURANG', country: 'NZL', tz: 'Pacific/Auckland' },
    { code: 'WLG', display: 'WELLNGT', country: 'NZL', tz: 'Pacific/Auckland' },
    { code: 'MNL', display: 'MANILA', country: 'PHL', tz: 'Asia/Manila' },
    { code: 'SGP', display: 'SINGAPR', country: 'SGP', tz: 'Asia/Singapore' },
    { code: 'BKK', display: 'BANGKOK', country: 'THA', tz: 'Asia/Bangkok' },
    { code: 'HCM', display: 'HOCHIMN', country: 'VNM', tz: 'Asia/Ho_Chi_Minh' }
  ];

  const DIGITS_5X5 = {
    '0': ['11111', '10001', '10001', '10001', '11111'],
    '1': ['00100', '01100', '00100', '00100', '01110'],
    '2': ['11111', '00001', '11111', '10000', '11111'],
    '3': ['11111', '00001', '11111', '00001', '11111'],
    '4': ['10001', '10001', '11111', '00001', '00001'],
    '5': ['11111', '10000', '11111', '00001', '11111'],
    '6': ['11111', '10000', '11111', '10001', '11111'],
    '7': ['11111', '00001', '00010', '00100', '00100'],
    '8': ['11111', '10001', '11111', '10001', '11111'],
    '9': ['11111', '10001', '11111', '00001', '11111']
  };

  const params = new URLSearchParams(window.location.search);
  const requestedVariant = params.get('variant');
  const pageVariant = document.body.dataset.variant || 'codes';
  const variantName = VARIANTS[requestedVariant] ? requestedVariant : pageVariant;
  const variant = VARIANTS[variantName] || VARIANTS.codes;
  document.body.dataset.variant = variantName;

  const noAnimation = params.get('noanim') === '1';
  const cycleOffices = params.get('cycle') !== '0';
  const fixedDate = parseFixedDate(params.get('testutc'));
  if (params.get('debug') === '1') document.body.classList.add('debug');

  const weather = {
    temp: sanitise(params.get('temp') || '17.4', 5),
    condition: sanitise(params.get('condition') || 'SUNNY', 8),
    wind: sanitise(params.get('wind') || 'SW22KMH', 7),
    humidity: sanitise(params.get('hum') || '68', 2),
    rain: sanitise(params.get('rain') || '40', 2)
  };

  const stage = document.getElementById('stage');
  const board = document.getElementById('board');
  const cells = Array.from({ length: TOTAL_ROWS }, () => Array(TOTAL_COLS));
  const formatters = new Map();
  const heroColons = [];
  let officePage = 0;
  let lastSecond = -1;
  let lastMinuteKey = '';
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

  function globalCellX(col) {
    const section = Math.floor(col / COLS_PER_SECTION);
    const local = col % COLS_PER_SECTION;
    return section * SECTION_W + local * (FLAP_W + GAP_X);
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
          Object.values(spans).forEach((span) => { span.textContent = next; });
          Object.values(faces).forEach((face) => applyMacroFace(face, nextMacro));
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

      for (let row = 0; row < TOTAL_ROWS; row += 1) {
        for (let localCol = 0; localCol < COLS_PER_SECTION; localCol += 1) {
          const globalCol = sectionIndex * COLS_PER_SECTION + localCol;
          const flap = createFlap(row, globalCol);
          cells[row][globalCol] = flap;
          section.appendChild(flap);
        }
      }
      board.appendChild(section);
    }

    const colonLocalCols = variantName === 'codes' ? [12, 26] : [11, 23];
    colonLocalCols.forEach((localCol) => {
      const globalCol = variant.centreStart + localCol;
      const colon = document.createElement('div');
      colon.className = 'hero-colon';
      colon.style.left = `${globalCellX(globalCol) + FLAP_W / 2}px`;
      colon.setAttribute('aria-hidden', 'true');
      board.appendChild(colon);
      heroColons.push(colon);
    });

    [variant.centreStart, variant.centreStart + variant.centreCols].forEach((col) => {
      const guide = document.createElement('div');
      guide.className = 'zone-divider';
      guide.style.left = `${globalCellX(col)}px`;
      board.appendChild(guide);
    });

    stage.dataset.debug = `49×7 ${variant.label} | side ${variant.sideCols} / centre ${variant.centreCols} / side ${variant.sideCols} | active 3780×672`;
  }

  function setCell(row, col, char = ' ', macro = false, delay = 0, halfMs = NORMAL_HALF_MS) {
    if (row < 0 || row >= TOTAL_ROWS || col < 0 || col >= TOTAL_COLS) return;
    cells[row][col].update(char, macro, delay, halfMs);
  }

  function writeText(row, startCol, width, text, delayBase = 0, instant = false) {
    const value = String(text ?? '').slice(0, width).padEnd(width, ' ');
    for (let index = 0; index < width; index += 1) {
      const flap = cells[row][startCol + index];
      if (instant) flap.setStatic(value[index], false);
      else flap.update(value[index], false, delayBase + index * 9, NORMAL_HALF_MS);
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

  function timeParts(timeZone, date = now()) {
    const parts = formatterFor(timeZone).formatToParts(date);
    return Object.fromEntries(
      parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
    );
  }

  function fullTimeFor(timeZone, date = now()) {
    const part = timeParts(timeZone, date);
    return `${part.hour}:${part.minute}:${part.second}`;
  }

  function shortTimeFor(timeZone, date = now()) {
    const part = timeParts(timeZone, date);
    return `${part.hour}:${part.minute}`;
  }

  function cardLines(office, date) {
    return [
      centred(variant.cardName(office), variant.sideCols),
      centred(office.country, variant.sideCols),
      centred(shortTimeFor(office.tz, date), variant.sideCols)
    ];
  }

  function visiblePageOffices(page) {
    const capacity = 4;
    const pageCount = Math.ceil(OFFICES.length / capacity);
    officePage = ((page % pageCount) + pageCount) % pageCount;
    const start = officePage * capacity;
    return Array.from({ length: capacity }, (_, index) => OFFICES[(start + index) % OFFICES.length]);
  }

  function renderOfficeCards(date = now(), animate = true) {
    const offices = visiblePageOffices(officePage);
    const rightStart = TOTAL_COLS - variant.sideCols;
    const cards = [
      { office: offices[0], startCol: 0, startRow: 0, delay: 0 },
      { office: offices[1], startCol: 0, startRow: 4, delay: 260 },
      { office: offices[2], startCol: rightStart, startRow: 0, delay: 520 },
      { office: offices[3], startCol: rightStart, startRow: 4, delay: 780 }
    ];

    cards.forEach((card) => {
      const lines = cardLines(card.office, date);
      lines.forEach((line, lineIndex) => {
        writeText(
          card.startRow + lineIndex,
          card.startCol,
          variant.sideCols,
          line,
          animate ? card.delay + lineIndex * 110 : 0,
          !animate && noAnimation
        );
      });
    });

    writeText(3, 0, variant.sideCols, ' '.repeat(variant.sideCols), 0, !animate && noAnimation);
    writeText(3, rightStart, variant.sideCols, ' '.repeat(variant.sideCols), 0, !animate && noAnimation);
  }

  function drawPattern(pattern, rowStart, colStart, delayBase = 0, halfMs = NORMAL_HALF_MS) {
    pattern.forEach((line, row) => {
      [...line].forEach((value, col) => {
        const on = value === '1';
        setCell(rowStart + row, colStart + col, ' ', on, delayBase + row * 8 + col * 5, halfMs);
      });
    });
  }

  function clockStarts() {
    if (variantName === 'codes') {
      return [0, 6, 12, 14, 20, 26, 28, 34];
    }
    return [0, 6, 11, 12, 18, 23, 24, 30];
  }

  function renderClock(date = now(), transition = false) {
    const time = fullTimeFor('Australia/Melbourne', date);
    const symbols = [time[0], time[1], ':', time[3], time[4], ':', time[6], time[7]];
    const starts = clockStarts();

    symbols.forEach((symbol, index) => {
      if (symbol === ':') return;
      drawPattern(
        DIGITS_5X5[symbol],
        1,
        variant.centreStart + starts[index],
        transition ? index * 70 : 0,
        transition ? FAST_HALF_MS : NORMAL_HALF_MS
      );
    });
  }

  function pulseColons() {
    window.clearTimeout(colonTimer);
    heroColons.forEach((colon) => colon.classList.add('is-dim'));
    colonTimer = window.setTimeout(() => {
      heroColons.forEach((colon) => colon.classList.remove('is-dim'));
    }, COLON_PULSE_MS);
  }

  function renderMetadata(instant = false) {
    const header = `MELBOURNE AUSTRALIA ${weather.temp}° ${weather.condition}`;
    const footer = variantName === 'codes'
      ? `WIND ${weather.wind} HUMIDITY ${weather.humidity}% RAIN ${weather.rain}%`
      : `WIND ${weather.wind} HUMID ${weather.humidity}% RAIN ${weather.rain}%`;

    writeText(0, variant.centreStart, variant.centreCols, centred(header, variant.centreCols), 0, instant);
    writeText(6, variant.centreStart, variant.centreCols, centred(footer, variant.centreCols), 0, instant);
  }

  function tick() {
    const date = now();
    renderClock(date, false);

    const time = fullTimeFor('Australia/Melbourne', date);
    const second = Number(time.slice(-2));
    if (second !== lastSecond) {
      lastSecond = second;
      pulseColons();
    }

    const minuteKey = time.slice(0, 5);
    if (minuteKey !== lastMinuteKey) {
      lastMinuteKey = minuteKey;
      renderOfficeCards(date, false);
    }

    if (!fixedDate) {
      window.setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
    }
  }

  function initialise() {
    fitStage();
    buildBoard();
    renderMetadata(noAnimation);
    renderOfficeCards(now(), !noAnimation);
    renderClock(now(), !noAnimation);

    if (cycleOffices && !fixedDate) {
      window.setInterval(() => {
        officePage += 1;
        renderOfficeCards(now(), true);
      }, OFFICE_PAGE_MS);
    }

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
