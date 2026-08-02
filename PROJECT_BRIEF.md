# Project brief

## Description

A lightweight 3840 × 804 split-flap world office wall with 49×7 and 42×6 layouts, built for NVIDIA Shield signage.

## Build brief

Purpose:
Create two production-ready split-flap wall prototypes for the 3840 × 804 Aurecon Melbourne video wall at 850 Collins Street, Docklands.

Layouts:
1. 49 columns × 7 rows. Seven physical wall sections. Each section is 540 × 672 px and contains 7 × 7 flaps. Flaps are 72 × 90 px with 6 px horizontal and 7 px vertical gaps.
2. 42 columns × 6 rows. Seven physical wall sections. Each section is 540 × 672 px and contains 6 × 6 flaps. Flaps are 85 × 107 px with 6 px horizontal and vertical gaps.

Shared composition:
- Fixed 3840 × 804 stage.
- Active board 3780 × 672, centred with 30 px side margins and 66 px top/bottom margins.
- Seven physical sections.
- Zone split of 2 sections left, 3 sections centre, 2 sections right.
- Centre is a permanent Melbourne hero using multiple flaps as a bitmap/mosaic display.
- Left and right zones show smaller single-character split flaps, one office per row, cycling through all current Aurecon offices.
- Side format: three-letter code plus local HH:MM:SS.
- Current Melbourne hero information initially uses MELBOURNE / AUSTRALIA / 17.4° SUNNY / SW22K HUM68 RAIN40 as replaceable data.
- Use IANA time zones and Intl.DateTimeFormat for office clocks.
- Include two entry pages or a selector for 49×7 and 42×6.

Macro clock systems:
- 49×7 centre is 21 × 7 cells: row 1 header, rows 2–6 a 2×5 bitmap HH:MM:SS exactly filling 21 columns using one-cell gaps, row 7 weather data.
- 42×6 centre is 18 × 6 cells: row 1 header, rows 2–5 a compact 2×4 bitmap HH:MM:SS fitting 18 columns, row 6 weather data.

Animation and performance:
- Reuse the existing premium split-flap visual treatment from Melbl8-Clock03-Split-flap: darker descending top flap, centre hinge, no heavy effects.
- Vanilla HTML, CSS and JavaScript only. No frameworks, canvas, WebGL or external runtime libraries.
- Animate only cells that change.
- Stagger office page changes and avoid flipping the full wall at once.
- Time updates once per second, office roster pages every 18 seconds, weather data less often.
- Must remain smooth on NVIDIA Shield.
- Add query controls such as ?layout=49x7, ?layout=42x6, ?noanim=1 and ?debug=1.

Deployment and privacy:
- GitHub Pages.
- Add noindex, nofollow, noarchive metadata and robots.txt disallow.
- Australian English.
- Include README with exact grid maths, office code/time-zone data, controls and Shield deployment notes.

Quality control:
- Validate exact integer pixel layout with no sub-pixels.
- Confirm all 7 section seams align at x = 30, 570, 1110, 1650, 2190, 2730, 3270 and 3810.
- Add a debug overlay that can show section boundaries and cell coordinates.
- Test both layouts at exact 3840 × 804 and scaled browser sizes.
