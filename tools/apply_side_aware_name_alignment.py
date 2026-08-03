#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "wall-live.js"
HTML_FILES = [ROOT / "49x7.html", ROOT / "49x7-live.html"]
README = ROOT / "README.md"

text = JS.read_text(encoding="utf-8")

old_function = '''  function centredOfficeName(text, width) {
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

new_function = '''  function centredOfficeName(text, width, isRight = false) {
    const clean = String(text ?? '').slice(0, width);
    const remaining = width - clean.length;
    let left = Math.floor(remaining / 2);
    // Left-side names use true centring. On the right, five- and six-letter
    // names shift one flap right to align with the inset country and time rows.
    if (isRight && clean.length >= 5 && clean.length <= 6 && remaining > 0) {
      left = Math.min(left + 1, remaining);
    }
    return `${' '.repeat(left)}${clean}${' '.repeat(remaining - left)}`;
  }
'''

if old_function in text:
    text = text.replace(old_function, new_function, 1)
elif new_function not in text:
    raise RuntimeError("Could not find centredOfficeName()")

old_call = "centredOfficeName(card.office.display, SIDE_COLS)"
new_call = "centredOfficeName(card.office.display, SIDE_COLS, card.isRight)"
if old_call in text:
    text = text.replace(old_call, new_call, 1)
elif new_call not in text:
    raise RuntimeError("Could not find office-name layout call")

JS.write_text(text, encoding="utf-8")

for path in HTML_FILES:
    html = path.read_text(encoding="utf-8")
    html = html.replace("wall-live.js?v=7", "wall-live.js?v=8")
    path.write_text(html, encoding="utf-8")

if README.exists():
    readme = README.read_text(encoding="utf-8")
    old = "Five- and six-character office names receive one extra blank flap on the left for visual centring."
    new = "Five- and six-character office names use true centring on the left; on the right they shift one flap inward to align with the inset country and time rows."
    if old in readme:
        readme = readme.replace(old, new, 1)
    elif new not in readme:
        marker = "On the right side, the country and time rows are shifted one cell inward for balanced spacing against the Melbourne zone."
        if marker in readme:
            readme = readme.replace(marker, marker + " " + new, 1)
    README.write_text(readme, encoding="utf-8")

# Roster and layout QC
roster = re.findall(r"display: '([^']+)'", text)
assert roster, "No office roster found"
assert all(1 <= len(name) <= 8 for name in roster), "Office name exceeds eight flaps"
assert len(roster) == len(set(roster)), "Duplicate office display names"

def centred(name: str, width: int, is_right: bool) -> str:
    clean = name[:width]
    remaining = width - len(clean)
    left = remaining // 2
    if is_right and 5 <= len(clean) <= 6 and remaining > 0:
        left = min(left + 1, remaining)
    return " " * left + clean + " " * (remaining - left)

assert centred("DARWIN", 8, False) == " DARWIN ", centred("DARWIN", 8, False)
assert centred("CAIRNS", 8, True) == "  CAIRNS", centred("CAIRNS", 8, True)
assert centred("JOHOR", 8, True) == "  JOHOR ", centred("JOHOR", 8, True)
assert centred("PERTH", 8, False) == " PERTH  ", centred("PERTH", 8, False)
assert centred("MACKAY", 8, False) == " MACKAY ", centred("MACKAY", 8, False)

# Check every four-office page: first two are left, last two are right.
for start in range(0, len(roster), 4):
    page = [roster[(start + offset) % len(roster)] for offset in range(4)]
    rendered = [
        centred(page[0], 8, False),
        centred(page[1], 8, False),
        centred(page[2], 8, True),
        centred(page[3], 8, True),
    ]
    assert all(len(value) == 8 for value in rendered)
    assert all(value.strip() for value in rendered)

print(f"Applied side-aware name alignment and checked {len(roster)} offices")
