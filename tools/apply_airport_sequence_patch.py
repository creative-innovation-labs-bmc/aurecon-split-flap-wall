#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "wall-live.js"
CSS = ROOT / "wall-live.css"
README = ROOT / "README.md"
HTMLS = [ROOT / "49x7.html", ROOT / "49x7-live.html"]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing expected block: {label}")
    return text.replace(old, new, 1)


js = JS.read_text(encoding="utf-8")
if "LAUNCH_CELL_STAGGER_MS" not in js:
    js = replace_once(
        js,
        "  const CARD_STAGGER_MS = 320;\n  const LINE_STAGGER_MS = 150;\n  const PAGE_CLEAR_MS = 170;",
        "  const OFFICE_CHAR_STAGGER_MS = 46;\n  const OFFICE_LINE_STEP_MS = 520;\n  const CARD_STAGGER_MS = 1540;\n  const LAUNCH_CELL_STAGGER_MS = 20;\n  const LAUNCH_ROW_STEP_MS = 1120;\n  const WEATHER_BOOT_TIMEOUT_MS = 1800;",
        "animation constants",
    )

    js = replace_once(
        js,
        """  function writeText(row, startCol, width, text, delayBase = 0, instant = false) {
    const value = String(text ?? '').slice(0, width).padEnd(width, ' ');
    for (let index = 0; index < width; index += 1) {
      const flap = cells[row][startCol + index];
      if (instant) flap.setStatic(value[index], false);
      else flap.update(value[index], false, delayBase + index * 9, NORMAL_HALF_MS);
    }
  }
""",
        """  function writeText(row, startCol, width, text, delayBase = 0, instant = false, charStaggerMs = 9) {
    const value = String(text ?? '').slice(0, width).padEnd(width, ' ');
    for (let index = 0; index < width; index += 1) {
      const flap = cells[row][startCol + index];
      if (instant) flap.setStatic(value[index], false);
      else flap.update(value[index], false, delayBase + index * charStaggerMs, NORMAL_HALF_MS);
    }
  }

  function launchDelay(row, col) {
    return row * LAUNCH_ROW_STEP_MS + col * LAUNCH_CELL_STAGGER_MS;
  }
""",
        "writeText",
    )

    js = js.replace(
        """  function clearLine(row, startCol, width, delayBase = 0, instant = false) {
    writeText(row, startCol, width, ' '.repeat(width), delayBase, instant);
  }

""",
        "",
        1,
    )

    start = js.index("  function renderOfficeCards(date = now(), animate = true) {")
    end = js.index("\n\n  function drawPattern", start)
    office_block = """  function renderOfficeCards(date = now(), mode = 'steady') {
    const offices = visiblePageOffices(officePage);
    const rightStart = TOTAL_COLS - SIDE_COLS;
    const cards = [
      { office: offices[0], startCol: 0, startRow: 0, order: 0 },
      { office: offices[1], startCol: 0, startRow: 4, order: 1 },
      { office: offices[2], startCol: rightStart, startRow: 0, order: 2 },
      { office: offices[3], startCol: rightStart, startRow: 4, order: 3 }
    ];

    cards.forEach((card) => {
      const timeLayout = officeTimeLayout(card.office.tz, date);
      const lines = [
        centred(card.office.display, SIDE_COLS),
        centred(card.office.country, SIDE_COLS),
        timeLayout.text
      ];

      lines.forEach((line, lineIndex) => {
        let delayBase = 0;
        let charStagger = 12;
        if (mode === 'launch') {
          delayBase = launchDelay(card.startRow + lineIndex, card.startCol);
          charStagger = LAUNCH_CELL_STAGGER_MS;
        } else if (mode === 'page') {
          delayBase = card.order * CARD_STAGGER_MS + lineIndex * OFFICE_LINE_STEP_MS;
          charStagger = OFFICE_CHAR_STAGGER_MS;
        } else if (mode === 'minute') {
          delayBase = card.order * 80;
          charStagger = 18;
        }
        writeText(
          card.startRow + lineIndex,
          card.startCol,
          SIDE_COLS,
          line,
          delayBase,
          noAnimation,
          charStagger
        );
      });
    });

    ensureOfficeMiniColons();
  }
"""
    js = js[:start] + office_block + js[end:]

    start = js.index("  function drawPattern(pattern, rowStart, colStart, delayBase = 0, halfMs = NORMAL_HALF_MS) {")
    end = js.index("\n\n  function pulseColons", start)
    clock_block = """  function drawPattern(pattern, rowStart, colStart, mode = 'steady', delayBase = 0, halfMs = NORMAL_HALF_MS) {
    pattern.forEach((line, row) => {
      [...line].forEach((value, col) => {
        const globalRow = rowStart + row;
        const globalCol = colStart + col;
        const delay = mode === 'launch'
          ? launchDelay(globalRow, globalCol)
          : delayBase + row * 8 + col * 5;
        setCell(globalRow, globalCol, ' ', value === '1', delay, halfMs);
      });
    });
  }

  function renderClock(date = now(), mode = 'steady') {
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
"""
    js = js[:start] + clock_block + js[end:]

    start = js.index("  function renderMetadata(instant = false) {")
    end = js.index("\n\n  async function loadWeather", start)
    metadata_block = """  function renderMetadata(mode = 'steady') {
    const temp = sanitise(weather.temp, 5, '--.-');
    const condition = sanitise(weather.condition, 7, 'LIVE');
    const windDir = sanitise(weather.windDir, 4, '--');
    const windSpeed = sanitise(weather.windSpeed, 3, '--');
    const humidity = sanitise(weather.humidity, 3, '--');
    const rain = sanitise(normaliseRain(weather.rain), 4, '--');

    const header = centred(`MELBOURNE AUSTRALIA ${temp}° ${condition}`, CENTRE_COLS);
    const footerOptions = [
      `WIND ${windDir} ${windSpeed}KMH HUM ${humidity}% RAIN ${rain}MM`,
      `WIND ${windDir}${windSpeed}K HUM${humidity}% RAIN${rain}MM`,
      `${windDir}${windSpeed}K H${humidity}% R${rain}MM`
    ];
    const footerText = footerOptions.find((candidate) => candidate.length <= CENTRE_COLS) || footerOptions.at(-1);
    const footer = centred(footerText, CENTRE_COLS);

    const isLaunch = mode === 'launch';
    writeText(
      0, CENTRE_START, CENTRE_COLS, header,
      isLaunch ? launchDelay(0, CENTRE_START) : 0,
      noAnimation,
      isLaunch ? LAUNCH_CELL_STAGGER_MS : 9
    );
    writeText(
      6, CENTRE_START, CENTRE_COLS, footer,
      isLaunch ? launchDelay(6, CENTRE_START) : 0,
      noAnimation,
      isLaunch ? LAUNCH_CELL_STAGGER_MS : 9
    );
  }
"""
    js = js[:start] + metadata_block + js[end:]

    js = replace_once(js, "  async function loadWeather() {", "  async function loadWeather(render = true) {", "loadWeather signature")
    js = replace_once(
        js,
        """    if (params.has('temp')) {
      renderMetadata(false);
      return;
    }
""",
        """    if (params.has('temp')) {
      if (render) renderMetadata('steady');
      return;
    }
""",
        "weather override",
    )
    weather_start = js.index("  async function loadWeather(render = true) {")
    weather_end = js.index("\n\n  function tick", weather_start)
    weather_text = js[weather_start:weather_end].replace("    renderMetadata(false);", "    if (render) renderMetadata('steady');")
    js = js[:weather_start] + weather_text + js[weather_end:]

    js = js.replace("    renderClock(date, false);", "    renderClock(date, 'steady');", 1)
    js = js.replace("      renderOfficeCards(date, false);", "      renderOfficeCards(date, 'minute');", 1)

    start = js.index("  function initialise() {")
    end = js.index("\n\n  window.addEventListener", start)
    init_block = """  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function startRuntime() {
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
    if (!fixedDate) {
      window.setInterval(() => loadWeather(true), WEATHER_REFRESH_MS);
      tick();
    }
  }

  async function initialise() {
    fitStage();
    buildBoard();
    document.body.classList.add('launching');

    await Promise.race([loadWeather(false), delay(WEATHER_BOOT_TIMEOUT_MS)]);
    const date = now();
    renderMetadata('launch');
    renderOfficeCards(date, 'launch');
    renderClock(date, 'launch');

    const launchEnd = launchDelay(TOTAL_ROWS - 1, TOTAL_COLS - 1) + NORMAL_HALF_MS * 2 + 160;
    window.setTimeout(() => {
      startRuntime();
      loadWeather(true);
    }, noAnimation ? 20 : launchEnd);
  }
"""
    js = js[:start] + init_block + js[end:]
    JS.write_text(js, encoding="utf-8")

css = CSS.read_text(encoding="utf-8")
if "body.launching .colon-half" not in css:
    css = replace_once(css, "  height: 50%;\n  overflow: hidden;", "  height: calc(50% + 1px);\n  overflow: hidden;", "panel overlap")
    css = replace_once(css, "  height: 200%;\n  display: flex;", "  height: var(--flap-h);\n  display: flex;", "glyph height")
    css = replace_once(css, ".panel.bottom span, .flip-half.bottom-flip span { top: -100%; }", ".panel.bottom span, .flip-half.bottom-flip span { top: -45px; }", "bottom glyph position")
    css = replace_once(css, "  top: calc(50% - 2px);\n  height: 4px;", "  top: calc(50% - 1px);\n  height: 2px;", "hinge size")
    mini_start = css.index("\n.mini-colon {")
    css = css[:mini_start] + """

.mini-colon {
  position: absolute;
  z-index: 24;
  inset: 0;
  pointer-events: none;
}
.mini-colon::before,
.mini-colon::after {
  content: "";
  position: absolute;
  left: 50%;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: var(--aurecon-green);
  box-shadow: 0 0 8px rgba(137,201,37,0.62), 0 0 16px rgba(137,201,37,0.24);
  opacity: 1;
  transition: opacity 90ms linear;
}
.mini-colon::before { top: 29%; }
.mini-colon::after { top: 67%; }
body.colon-dim .mini-colon::before,
body.colon-dim .mini-colon::after { opacity: 0.12; }
body.launching .colon-half,
body.launching .mini-colon::before,
body.launching .mini-colon::after { opacity: 0; }
"""
    CSS.write_text(css, encoding="utf-8")

for path in HTMLS:
    html = path.read_text(encoding="utf-8")
    html = html.replace("wall-live.css?v=3", "wall-live.css?v=4").replace("wall-live.js?v=3", "wall-live.js?v=4")
    path.write_text(html, encoding="utf-8")

readme = README.read_text(encoding="utf-8")
old = "Office pages rotate every 14 seconds. Local office times update each minute. Melbourne remains permanently in the centre. The office name, country and time lines now cascade in separately, and the four cards are staggered across the wall on first load and every page change."
new = "Office pages rotate every 14 seconds. Local office times update each minute. Melbourne remains permanently in the centre.\n\nOn first load, the wall builds from left to right one flap at a time, then advances to the next row. Office page changes never clear the side panels. Each card flips directly from the old office to the new one in this order: top-left, bottom-left, top-right, bottom-right. Within each card, the city, country and time lines build sequentially from left to right."
if old in readme:
    readme = readme.replace(old, new)
readme = readme.replace(
    "- Aurecon green `#89C925` split-circle hero colons and blinking mini office-time colons",
    "- Aurecon green `#89C925` split-circle hero colons and two-dot blinking mini office-time colons\n- 1 px overlap between top and bottom text halves, with a reduced 2 px hinge for legibility",
)
README.write_text(readme, encoding="utf-8")
print("Airport sequence patch applied")
