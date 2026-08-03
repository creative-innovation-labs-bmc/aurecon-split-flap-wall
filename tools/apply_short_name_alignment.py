#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "wall-live.js"
HTML_FILES = [ROOT / "49x7.html", ROOT / "49x7-live.html"]
README = ROOT / "README.md"

text = JS.read_text(encoding="utf-8")

centred_block = '''  function centred(text, width) {
    const clean = String(text ?? '').slice(0, width);
    const remaining = width - clean.length;
    const left = Math.floor(remaining / 2);
    return `${' '.repeat(left)}${clean}${' '.repeat(remaining - left)}`;
  }
'''

short_name_block = centred_block + '''
  function centredOfficeName(text, width) {
    const clean = String(text ?? '').slice(0, width);
    const remaining = width - clean.length;
    let left = Math.floor(remaining / 2);
    // Five- and six-character office names need one extra flap on the left
    // to align visually with the country and time rows.
    if (clean.length >= 5 && clean.length <= 6 && remaining > 0) {
      left = Math.min(left + 1, remaining);
    }
    return `${' '.repeat(left)}${clean}${' '.repeat(remaining - left)}`;
  }
'''

if "function centredOfficeName" not in text:
    if centred_block not in text:
        raise RuntimeError("Could not find centred() function")
    text = text.replace(centred_block, short_name_block, 1)

old_line = "{ startCol: card.startCol, width: SIDE_COLS, text: centred(card.office.display, SIDE_COLS) },"
new_line = "{ startCol: card.startCol, width: SIDE_COLS, text: centredOfficeName(card.office.display, SIDE_COLS) },"
if old_line in text:
    text = text.replace(old_line, new_line, 1)
elif new_line not in text:
    raise RuntimeError("Could not find office-name layout line")

JS.write_text(text, encoding="utf-8")

for path in HTML_FILES:
    html = path.read_text(encoding="utf-8")
    html = html.replace("wall-live.js?v=6", "wall-live.js?v=7")
    path.write_text(html, encoding="utf-8")

if README.exists():
    readme = README.read_text(encoding="utf-8")
    marker = "On the right side, the country and time rows are shifted one cell inward for balanced spacing against the Melbourne zone."
    addition = marker + " Five- and six-character office names receive one extra blank flap on the left for visual centring."
    if marker in readme and addition not in readme:
        readme = readme.replace(marker, addition, 1)
        README.write_text(readme, encoding="utf-8")

print("Applied short office-name alignment rule and cache bump")
