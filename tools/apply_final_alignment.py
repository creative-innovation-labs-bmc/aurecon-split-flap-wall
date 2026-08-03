#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "wall-live.js"
HTML_FILES = [ROOT / "49x7.html", ROOT / "49x7-live.html"]
README = ROOT / "README.md"

text = JS.read_text(encoding="utf-8")

replacements = {
    "const DIGIT_STARTS = [2, 7, 13, 18, 24, 29];":
        "const DIGIT_STARTS = [1, 6, 12, 17, 23, 28];",
    "const COLON_GAPS = [[11, 12], [22, 23]];":
        "const COLON_GAPS = [[10, 11], [21, 22]];",
    """    // Right-side five- and six-letter names use true centring. Seven-letter
    // names move one flap right to align with the inset country and time rows.
    if (isRight && clean.length === 7 && remaining > 0) {
""":
    """    // On the right, five- and seven-letter names move one flap right to
    // align visually with the inset country and time rows. Six-letter names
    // remain truly centred.
    if (isRight && (clean.length === 5 || clean.length === 7) && remaining > 0) {
""",
}

for old, new in replacements.items():
    if old not in text:
        if new not in text:
            raise RuntimeError(f"Expected production block not found: {old[:80]!r}")
    else:
        text = text.replace(old, new, 1)

# Assertions protect against accidental changes to the Melbourne metadata or side layout.
assert "const CENTRE_START = 8;" in text
assert "const CENTRE_COLS = 33;" in text
assert "const SIDE_COLS = 8;" in text
assert "const DIGIT_STARTS = [1, 6, 12, 17, 23, 28];" in text
assert "const COLON_GAPS = [[10, 11], [21, 22]];" in text
assert "clean.length === 5 || clean.length === 7" in text

JS.write_text(text, encoding="utf-8")

for path in HTML_FILES:
    html = path.read_text(encoding="utf-8")
    for old_version in ("v=7", "v=8", "v=9"):
        html = html.replace(f"wall-live.js?{old_version}", "wall-live.js?v=10")
    if "wall-live.js?v=10" not in html:
        raise RuntimeError(f"Cache bump failed for {path.name}")
    path.write_text(html, encoding="utf-8")

if README.exists():
    readme = README.read_text(encoding="utf-8")
    old_note = "On the right side, five- and six-character names are truly centred; seven-character names shift one flap right to align with the inset detail rows."
    new_note = "On the right side, five- and seven-character names shift one flap right; six-character names remain truly centred. The Melbourne HH:MM:SS macro group is offset one column left independently of its header and footer."
    if old_note in readme:
        readme = readme.replace(old_note, new_note, 1)
    elif new_note not in readme:
        readme += "\n\n" + new_note + "\n"
    README.write_text(readme, encoding="utf-8")

print("Applied final office-name and Melbourne-clock alignment patch")
