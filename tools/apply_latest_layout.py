#!/usr/bin/env python3
"""Apply the approved 8/33/8 live-wall patch to the production files."""
from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
JS = ROOT / "wall-live.js"
CSS = ROOT / "wall-live.css"
README = ROOT / "README.md"
INDEX = ROOT / "index.html"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise RuntimeError(f"Could not find expected {label}")
    return text.replace(old, new, 1)


def patch_js() -> None:
    text = JS.read_text(encoding="utf-8")

    text = replace_once(
        text,
        "  const SIDE_COLS = 7;\n  const CENTRE_START = 7;\n  const CENTRE_COLS = 35;",
        "  const SIDE_COLS = 8;\n  const CENTRE_START = 8;\n  const CENTRE_COLS = 33;",
        "zone constants",
    )

    if "const CARD_STAGGER_MS" not in text:
        text = replace_once(
            text,
            "  const COLON_PULSE_MS = 160;",
            "  const COLON_PULSE_MS = 160;\n  const CARD_STAGGER_MS = 320;\n  const LINE_STAGGER_MS = 150;\n  const PAGE_CLEAR_MS = 170;",
            "animation constants",
        )

    offices = """  const OFFICE_NAMES = [
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
  ];"""
    text, count = re.subn(
        r"  const OFFICE_NAMES = \[.*?\n  \];",
        offices,
        text,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise RuntimeError("Could not replace office list")

    text = re.sub(
        r"  // 35 centre columns\..*?\n  const DIGIT_STARTS = \[[^\]]+\];\n  const COLON_GAPS = \[[^;]+\];",
        "  // 33 centre columns. Clock is 31 columns: 9 + 2 + 9 + 2 + 9, with 1-column margins.\n  const DIGIT_STARTS = [1, 6, 12, 17, 23, 28];\n  const COLON_GAPS = [[10, 11], [21, 22]];",
        text,
        count=1,
    )

    text = text.replace(
        "stage.dataset.debug = '49×7 | 7 / 35 / 7 | 4×5 clock | BOM Melbourne Olympic Park';",
        "stage.dataset.debug = '49×7 | 8 / 33 / 8 | 4×5 clock | BOM Melbourne Olympic Park';",
    )

    if "function officeTimeLayout" not in text:
        marker = """  function shortTimeFor(timeZone, date = now()) {
    const part = timeParts(timeZone, date);
    return `${part.hour}:${part.minute}`;
  }
"""
        addition = marker + """
  function officeTimeLayout(timeZone, date = now()) {
    const part = timeParts(timeZone, date);
    return {
      text: ` ${part.hour} ${part.minute}  `,
      colonLocalCol: 3
    };
  }

  function clearLine(row, startCol, width, delayBase = 0, instant = false) {
    writeText(row, startCol, width, ' '.repeat(width), delayBase, instant);
  }
"""
        text = replace_once(text, marker, addition, "office time helper")

    if "function addMiniColon" not in text:
        marker = """  function renderOfficeCards(date = now(), animate = true) {
"""
        addition = """  function addMiniColon(targetCell) {
    if (!targetCell || targetCell.querySelector('.mini-colon')) return;
    const colon = document.createElement('span');
    colon.className = 'mini-colon';
    targetCell.appendChild(colon);
  }

  function ensureOfficeMiniColons() {
    const rightStart = TOTAL_COLS - SIDE_COLS;
    const positions = [
      [2, 3], [6, 3],
      [2, rightStart + 3], [6, rightStart + 3]
    ];
    positions.forEach(([row, col]) => addMiniColon(cells[row][col]));
  }

""" + marker
        text = replace_once(text, marker, addition, "mini-colon helpers")

    office_renderer = """  function renderOfficeCards(date = now(), animate = true) {
    const offices = visiblePageOffices(officePage);
    const rightStart = TOTAL_COLS - SIDE_COLS;
    const cards = [
      { office: offices[0], startCol: 0, startRow: 0, delay: 0 },
      { office: offices[1], startCol: 0, startRow: 4, delay: CARD_STAGGER_MS },
      { office: offices[2], startCol: rightStart, startRow: 0, delay: CARD_STAGGER_MS * 2 },
      { office: offices[3], startCol: rightStart, startRow: 4, delay: CARD_STAGGER_MS * 3 }
    ];

    cards.forEach((card) => {
      const timeLayout = officeTimeLayout(card.office.tz, date);
      const lines = [
        centred(card.office.display, SIDE_COLS),
        centred(card.office.country, SIDE_COLS),
        timeLayout.text
      ];
      if (animate) {
        for (let lineIndex = 0; lineIndex < 3; lineIndex += 1) {
          clearLine(card.startRow + lineIndex, card.startCol, SIDE_COLS, card.delay + lineIndex * LINE_STAGGER_MS, false);
          writeText(
            card.startRow + lineIndex,
            card.startCol,
            SIDE_COLS,
            lines[lineIndex],
            card.delay + lineIndex * LINE_STAGGER_MS + PAGE_CLEAR_MS,
            false
          );
        }
      } else {
        lines.forEach((line, lineIndex) => {
          writeText(card.startRow + lineIndex, card.startCol, SIDE_COLS, line, 0, noAnimation);
        });
      }
    });

    clearLine(3, 0, SIDE_COLS, 0, !animate && noAnimation);
    clearLine(3, rightStart, SIDE_COLS, 0, !animate && noAnimation);
    ensureOfficeMiniColons();
  }
"""
    text, count = re.subn(
        r"  function renderOfficeCards\(date = now\(\), animate = true\) \{.*?\n  \}\n\n  function drawPattern",
        office_renderer + "\n  function drawPattern",
        text,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise RuntimeError("Could not replace office renderer")

    old_footer = """    const header = centred(`MELBOURNE AUSTRALIA ${temp}° ${condition}`, CENTRE_COLS);
    const footer = centred(`WIND ${windDir}${windSpeed}K HUM ${humidity}% RAIN ${rain}MM`, CENTRE_COLS);
    writeText(0, CENTRE_START, CENTRE_COLS, header, 0, instant);
    writeText(6, CENTRE_START, CENTRE_COLS, footer, 0, instant);
"""
    new_footer = """    const header = centred(`MELBOURNE AUSTRALIA ${temp}° ${condition}`, CENTRE_COLS);
    const footerOptions = [
      `WIND ${windDir} ${windSpeed}KMH HUM ${humidity}% RAIN ${rain}MM`,
      `WIND ${windDir}${windSpeed}K HUM${humidity}% RAIN${rain}MM`,
      `${windDir}${windSpeed}K H${humidity}% R${rain}MM`
    ];
    const footerText = footerOptions.find((candidate) => candidate.length <= CENTRE_COLS) || footerOptions.at(-1);
    const footer = centred(footerText, CENTRE_COLS);
    writeText(0, CENTRE_START, CENTRE_COLS, header, 0, instant);
    writeText(6, CENTRE_START, CENTRE_COLS, footer, 0, instant);
"""
    text = replace_once(text, old_footer, new_footer, "weather footer")

    JS.write_text(text, encoding="utf-8")


def patch_css() -> None:
    text = CSS.read_text(encoding="utf-8")
    if ".mini-colon" not in text:
        text += """

.mini-colon {
  position: absolute;
  z-index: 22;
  left: 50%;
  top: calc(50% - 2px);
  width: 8px;
  height: 28px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.mini-colon::before,
.mini-colon::after {
  content: "";
  position: absolute;
  left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transform: translateX(-50%);
  background: var(--aurecon-green);
  box-shadow: 0 0 8px rgba(137,201,37,0.55), 0 0 16px rgba(137,201,37,0.22);
  opacity: 1;
  transition: opacity 90ms linear;
}
.mini-colon::before { top: 7px; }
.mini-colon::after { bottom: 7px; }
body.colon-dim .mini-colon::before,
body.colon-dim .mini-colon::after { opacity: 0.12; }
"""
    CSS.write_text(text, encoding="utf-8")


def patch_docs() -> None:
    text = README.read_text(encoding="utf-8")
    text = text.replace("7 columns | 35-column Melbourne hero | 7 columns", "8 columns | 33-column Melbourne hero | 8 columns")
    text = text.replace("- longer seven-character office names", "- wider eight-column office names")
    text = text.replace(
        "The centre has 35 columns. The active clock occupies 31 columns and is centred with two blank columns on each side:",
        "The centre has 33 columns. The active clock occupies 31 columns and is centred with one blank column on each side:",
    )
    text = text.replace("2 margin\n9 columns HH", "1 margin\n9 columns HH")
    text = text.replace("9 columns SS  = 4 + 1 + 4\n2 margin", "9 columns SS  = 4 + 1 + 4\n1 margin")
    line = "Office pages rotate every 14 seconds. Local office times update each minute. Melbourne remains permanently in the centre."
    expanded = line + " The office name, country and time lines cascade in separately, and the four cards are staggered across the wall on first load and every page change."
    text = text.replace(line, expanded)
    text = text.replace(
        "- Aurecon green `#89C925` split-circle colons",
        "- Aurecon green `#89C925` split-circle hero colons and blinking mini office-time colons",
    )
    README.write_text(text, encoding="utf-8")

    index = INDEX.read_text(encoding="utf-8")
    index = index.replace("Seven columns per side, 35 columns for Melbourne", "Eight columns per side, 33 columns for Melbourne")
    INDEX.write_text(index, encoding="utf-8")


def main() -> None:
    patch_js()
    patch_css()
    patch_docs()
    print("Applied approved 8/33/8 split-flap wall patch")


if __name__ == "__main__":
    main()
