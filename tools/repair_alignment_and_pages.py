#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "wall-live.js"
HTML_FILES = [ROOT / "49x7.html", ROOT / "49x7-live.html"]
README = ROOT / "README.md"

text = JS.read_text(encoding="utf-8")
old = '''  function centredOfficeName(text, width, isRight = false) {
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
new = '''  function centredOfficeName(text, width, isRight = false) {
    const clean = String(text ?? '').slice(0, width);
    const remaining = width - clean.length;
    let left = Math.floor(remaining / 2);
    // Right-side five- and six-letter names use true centring. Seven-letter
    // names move one flap right to align with the inset country and time rows.
    if (isRight && clean.length === 7 && remaining > 0) {
      left = Math.min(left + 1, remaining);
    }
    return `${' '.repeat(left)}${clean}${' '.repeat(remaining - left)}`;
  }
'''
if old not in text:
    if new not in text:
        raise RuntimeError("Could not find the current office-name alignment function")
else:
    text = text.replace(old, new, 1)
JS.write_text(text, encoding="utf-8")

for path in HTML_FILES:
    html = path.read_text(encoding="utf-8")
    html = html.replace("wall-live.js?v=8", "wall-live.js?v=9")
    html = html.replace("wall-live.js?v=7", "wall-live.js?v=9")
    path.write_text(html, encoding="utf-8")

(ROOT / ".nojekyll").write_text("", encoding="utf-8")

if README.exists():
    readme = README.read_text(encoding="utf-8")
    old_note = "Five- and six-character office names receive one extra blank flap on the left for visual centring."
    new_note = "On the right side, five- and six-character names are truly centred; seven-character names shift one flap right to align with the inset detail rows."
    if old_note in readme:
        readme = readme.replace(old_note, new_note, 1)
    elif new_note not in readme:
        marker = "On the right side, the country and time rows are shifted one cell inward for balanced spacing against the Melbourne zone."
        readme = readme.replace(marker, marker + " " + new_note, 1)
    README.write_text(readme, encoding="utf-8")

print("Applied corrected right-side alignment, cache v9 and .nojekyll")
