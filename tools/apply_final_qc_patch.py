#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_required(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Required block not found: {label}")
    return text.replace(old, new, 1)


# JavaScript: shift right-side detail rows, move mini-colons, and add Shield mode.
js_path = ROOT / "wall-live.js"
js = js_path.read_text(encoding="utf-8")

js = replace_required(
    js,
    """  const params = new URLSearchParams(window.location.search);\n  const noAnimation = params.get('noanim') === '1';\n  const cycleOffices = params.get('cycle') !== '0';\n  const fixedDate = parseFixedDate(params.get('testutc'));\n  if (params.get('debug') === '1') document.body.classList.add('debug');\n""",
    """  const params = new URLSearchParams(window.location.search);\n  const noAnimation = params.get('noanim') === '1';\n  const cycleOffices = params.get('cycle') !== '0';\n  const fixedDate = parseFixedDate(params.get('testutc'));\n  const shieldMode = params.get('shield') === '1'\n    || (params.get('shield') !== '0' && /Android|SHIELD|Enplug/i.test(navigator.userAgent));\n  if (params.get('debug') === '1') document.body.classList.add('debug');\n  if (shieldMode) document.body.classList.add('shield-mode');\n""",
    "Shield mode",
)

js = replace_required(
    js,
    """  function officeTimeLayout(timeZone, date = now()) {\n    const part = timeParts(timeZone, date);\n    return {\n      text: ` ${part.hour} ${part.minute}  `,\n      colonLocalCol: 3\n    };\n  }\n""",
    """  function officeTimeLayout(timeZone, width = SIDE_COLS, date = now()) {\n    const part = timeParts(timeZone, date);\n    const text = width === SIDE_COLS - 1\n      ? ` ${part.hour} ${part.minute} `\n      : ` ${part.hour} ${part.minute}  `;\n    return {\n      text,\n      colonLocalCol: 3\n    };\n  }\n""",
    "width-aware office time",
)

js = replace_required(
    js,
    """  function ensureOfficeMiniColons() {\n    const rightStart = TOTAL_COLS - SIDE_COLS;\n    const positions = [\n      [2, 3], [6, 3],\n      [2, rightStart + 3], [6, rightStart + 3]\n    ];\n    positions.forEach(([row, col]) => addMiniColon(cells[row][col]));\n  }\n""",
    """  function ensureOfficeMiniColons() {\n    const rightStart = TOTAL_COLS - SIDE_COLS;\n    const positions = [\n      [2, 3], [6, 3],\n      [2, rightStart + 4], [6, rightStart + 4]\n    ];\n    positions.forEach(([row, col]) => addMiniColon(cells[row][col]));\n  }\n""",
    "right mini-colon alignment",
)

js = replace_required(
    js,
    """    const cards = [\n      { office: offices[0], startCol: 0, startRow: 0, order: 0 },\n      { office: offices[1], startCol: 0, startRow: 4, order: 1 },\n      { office: offices[2], startCol: rightStart, startRow: 0, order: 2 },\n      { office: offices[3], startCol: rightStart, startRow: 4, order: 3 }\n    ];\n\n    cards.forEach((card) => {\n      const timeLayout = officeTimeLayout(card.office.tz, date);\n      const lines = [\n        centred(card.office.display, SIDE_COLS),\n        centred(card.office.country, SIDE_COLS),\n        timeLayout.text\n      ];\n\n      lines.forEach((line, lineIndex) => {\n""",
    """    const cards = [\n      { office: offices[0], startCol: 0, startRow: 0, order: 0, isRight: false },\n      { office: offices[1], startCol: 0, startRow: 4, order: 1, isRight: false },\n      { office: offices[2], startCol: rightStart, startRow: 0, order: 2, isRight: true },\n      { office: offices[3], startCol: rightStart, startRow: 4, order: 3, isRight: true }\n    ];\n\n    cards.forEach((card) => {\n      const detailStartCol = card.isRight ? card.startCol + 1 : card.startCol;\n      const detailWidth = card.isRight ? SIDE_COLS - 1 : SIDE_COLS;\n      const timeLayout = officeTimeLayout(card.office.tz, detailWidth, date);\n      const lines = [\n        { startCol: card.startCol, width: SIDE_COLS, text: centred(card.office.display, SIDE_COLS) },\n        { startCol: detailStartCol, width: detailWidth, text: centred(card.office.country, detailWidth) },\n        { startCol: detailStartCol, width: detailWidth, text: timeLayout.text }\n      ];\n\n      lines.forEach((line, lineIndex) => {\n""",
    "right detail row geometry",
)

js = replace_required(
    js,
    """          delayBase = launchDelay(card.startRow + lineIndex, card.startCol);\n""",
    """          delayBase = launchDelay(card.startRow + lineIndex, line.startCol);\n""",
    "launch geometry",
)

js = replace_required(
    js,
    """        writeText(\n          card.startRow + lineIndex,\n          card.startCol,\n          SIDE_COLS,\n          line,\n          delayBase,\n          noAnimation,\n          charStagger\n        );\n""",
    """        writeText(\n          card.startRow + lineIndex,\n          line.startCol,\n          line.width,\n          line.text,\n          delayBase,\n          noAnimation,\n          charStagger\n        );\n""",
    "right detail row output",
)
js_path.write_text(js, encoding="utf-8")

# CSS: Android WebView profile keeps the motion but lowers costly filter/shadow work.
css_path = ROOT / "wall-live.css"
css = css_path.read_text(encoding="utf-8")
if "flipTopShield" not in css:
    css += """

/* Android/NVIDIA Shield optimisation: retain the same flap motion while
   avoiding the most expensive blur/filter work in Android WebView. */
.flap.flipping .flip-half { will-change: transform; }
body.shield-mode .flap.flipping .top-flip {
  animation-name: flipTopShield;
  box-shadow: 0 10px 10px rgba(0,0,0,0.18);
}
body.shield-mode .flap.flipping .bottom-flip {
  animation-name: flipBottomShield;
  box-shadow: 0 -8px 8px rgba(0,0,0,0.16);
}
body.shield-mode .panel span,
body.shield-mode .flip-half span { text-rendering: auto; }
body.shield-mode .colon-half {
  box-shadow: 0 0 7px rgba(137,201,37,0.40), 0 0 12px rgba(137,201,37,0.14);
}
body.shield-mode .mini-colon::before,
body.shield-mode .mini-colon::after {
  box-shadow: 0 0 6px rgba(137,201,37,0.48), 0 0 10px rgba(137,201,37,0.16);
}
@keyframes flipTopShield {
  from { transform: rotateX(0deg); }
  to { transform: rotateX(-90deg); }
}
@keyframes flipBottomShield {
  from { transform: rotateX(90deg); }
  to { transform: rotateX(0deg); }
}
"""
css_path.write_text(css, encoding="utf-8")

# Live HTML: indexing controls, CSP and cache-busting.
csp = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self' https://api.open-meteo.com; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; media-src 'none'; worker-src 'none'"
for name in ("49x7.html", "49x7-live.html"):
    path = ROOT / name
    html = path.read_text(encoding="utf-8")
    if "Content-Security-Policy" not in html:
        html = html.replace(
            '  <meta name="referrer" content="no-referrer">',
            f'  <meta name="referrer" content="no-referrer">\n  <meta http-equiv="Content-Security-Policy" content="{csp}">\n  <meta name="format-detection" content="telephone=no">',
        )
    html = html.replace("wall-live.css?v=4", "wall-live.css?v=6")
    html = html.replace("wall-live.js?v=4", "wall-live.js?v=6")
    path.write_text(html, encoding="utf-8")

# Documentation.
readme_path = ROOT / "README.md"
readme = readme_path.read_text(encoding="utf-8")
readme = readme.replace(
    "The office name, country and time lines cascade in separately, and the four cards are staggered across the wall on first load and every page change.",
    "The office name, country and time lines cascade in separately, and the four cards are staggered across the wall on first load and every page change. On the right side, the country and time rows are shifted one cell inward for balanced spacing against the Melbourne zone.",
)
readme = readme.replace(
    "- no continuous 60 fps loop\n- only changed cells animate",
    "- no continuous 60 fps loop\n- only changed cells animate\n- automatic Android/NVIDIA Shield mode removes expensive animated filters and reduces shadow blur while retaining the flap motion\n- launch and office changes are deliberately sequenced so the peak number of simultaneous flips stays limited",
)
readme = readme.replace(
    "| `?rain=0.0` | Overrides rain since 9 am |",
    "| `?rain=0.0` | Overrides rain since 9 am |\n| `?shield=1` | Forces the Android/NVIDIA Shield performance profile |\n| `?shield=0` | Disables automatic Shield performance mode for comparison |",
)
readme = readme.replace(
    "All pages include `noindex`, `nofollow` and `noarchive`. This reduces discoverability but is not access control.",
    "All pages include `noindex`, `nofollow` and `noarchive`, and the root `robots.txt` disallows all crawling. The live pages also use a restrictive Content Security Policy and send no referrer. This prevents normal search indexing and limits browser capabilities, but GitHub Pages remains a public host and this is not password-based access control.",
)
readme_path.write_text(readme, encoding="utf-8")
