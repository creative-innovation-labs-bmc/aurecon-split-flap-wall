# Aurecon split-flap wall

Split-flap wall prototypes for the 3840 × 804 display at Aurecon Centre, 850 Collins Street, Docklands, Melbourne.

## Current 49 × 7 rebuild

Two 49 × 7 options maximise the Melbourne pixel clock:

- `49x7-codes.html` uses narrow airport-code cards and gives Melbourne **39 columns**.
- `49x7-cities.html` uses short city-name cards and gives Melbourne **35 columns**.
- `49x7.html` points to the recommended airport-code version.
- `42x6.html` remains available as the earlier comparison.

All versions use plain HTML, CSS and JavaScript. There is no framework, canvas, WebGL or external runtime library.

## Exact shared grid

| Item | Value |
|---|---:|
| Stage | 3840 × 804 px |
| Active board | 3780 × 672 px |
| Side margins | 30 px |
| Top/bottom margins | 66 px |
| Grid | 49 columns × 7 rows |
| Physical sections | 7 |
| Each section | 540 × 672 px |
| Single flap | 72 × 90 px |
| Horizontal gap | 6 px |
| Vertical gap | 7 px |
| Total flaps | 343 |

The physical section maths remains exact:

```text
7 × 72 + 6 × 6 = 540 px
7 × 90 + 6 × 7 = 672 px
```

## Option A: airport-code cards

```text
5 columns | 39-column Melbourne hero | 5 columns
```

Each side shows two stacked cards:

```text
SYD
AUS
14:25

PER
AUS
12:25
```

The 39-column clock fit is exact:

```text
5 + gap + 5 + gap + colon + gap + 5 + gap + 5 + gap + colon + gap + 5 + gap + 5 = 39
```

This is the recommended version because the side information stays legible while the Melbourne clock gets the most flap area.

## Option B: city-name cards

```text
7 columns | 35-column Melbourne hero | 7 columns
```

Each side shows two stacked cards:

```text
SYDNEY
AUS
14:25

PERTH
AUS
12:25
```

Long city names use curated seven-character display forms such as `BRISBNE`, `AUCKLND` and `SINGAPR`.

The 35-column clock fit is exact:

```text
11-column HH + 1-column colon + 11-column MM + 1-column colon + 11-column SS = 35
```

Each pair uses two five-column digits with one internal gap.

## Melbourne hero

The centre uses:

```text
MELBOURNE AUSTRALIA 17.4° SUNNY
[ five-row, five-column pixel HH:MM:SS ]
WIND SW22KMH HUMIDITY 68% RAIN 40%
```

The large digits are built from complete split-flap faces. Only changed cells animate. The green colon dots follow the treatment used in the existing Melbourne split-flap clock.

## Side office cycling

Four offices are visible at once:

- two on the left
- two on the right
- three rows per office: name/code, country, local HH:MM
- one blank separator row between the two cards

Pages rotate every 14 seconds. Cards are staggered so the entire side wall does not flip simultaneously. Side times update only when the minute changes.

## Matched flap treatment

The 49 × 7 rebuild matches `Melbl8-Clock03-Split-flap`:

| Element | Value |
|---|---|
| Font | `MP-B.ttf` |
| Top flap | `#3f3f3c` |
| Bottom flap | `#232322` |
| Hinge | `rgba(0,0,0,0.86)` |
| Perspective | 1600 px |
| Half-flip duration | 300 ms |
| Moving top flap | Darkens during descent |
| Colon | Aurecon green dots, pulsed each second |

## URL controls

| Parameter | Effect |
|---|---|
| `?debug=1` | Shows section, cell and content-zone guides |
| `?noanim=1` | Changes cells instantly |
| `?cycle=0` | Holds the first four offices |
| `?temp=18.2` | Overrides temperature |
| `?condition=CLOUDY` | Overrides condition |
| `?wind=SW22KMH` | Overrides wind |
| `?hum=68` | Overrides humidity |
| `?rain=40` | Overrides rain percentage |
| `?testutc=2026-08-03T03:24:56Z` | Freezes clocks for repeatable QC |

## Visual QC

Both new 49 × 7 pages were rendered at 3840 × 804.

Checks passed:

- exactly 343 flaps
- board bounds x 30, y 66, width 3780, height 672
- two centre colon overlays
- two permanent content-zone dividers
- airport-code centre width 39 columns
- city-name centre width 35 columns
- all six five-column digits fit without clipping
- two stacked office cards fit on each side
- scaled 1920 × 500 display remains centred
- no JavaScript page errors were detected

The local QC environment cannot load the cross-project MP-B font URL, so local screenshots use the narrow fallback. The deployed GitHub Pages versions load MP-B from the existing split-flap project on the same domain.

## NVIDIA Shield notes

- Use the direct page URL in signage software.
- The internal stage remains 3840 × 804 and scales uniformly.
- Only changed cells animate.
- Side clocks use HH:MM rather than seconds to reduce unnecessary updates.
- No canvas, WebGL, particles or continuous 60 fps loop is used.
- `?noanim=1` remains available for diagnostics.

## Search indexing

All pages include `noindex`, `nofollow` and `noarchive`. `robots.txt` also disallows crawling. This reduces discoverability but is not access control.
