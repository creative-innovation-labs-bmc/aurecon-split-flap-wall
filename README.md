# Aurecon split-flap wall

Two exact-pixel split-flap wall prototypes for the 3840 × 804 video wall at Aurecon Centre, 850 Collins Street, Docklands, Melbourne.

- **49 × 7:** `49x7.html`
- **42 × 6:** `42x6.html`
- Selector and notes: `index.html`

The site uses plain HTML, CSS and JavaScript. There is no framework, canvas, WebGL or external runtime library.

## Resolved composition

The seven physical display sections use a fixed **2 / 3 / 2** structure:

| Physical sections | Content |
|---|---|
| 1–2 | Rotating office clocks on the left |
| 3 | Melbourne hour pair or giant `M` |
| 4 | Melbourne minute pair or giant `E` |
| 5 | Melbourne second pair or giant `L` |
| 6–7 | Rotating office clocks on the right |

The side rows use one split flap per character. The three centre sections use whole flap faces as bitmap pixels, so the large clock and `MEL` are physically built from the flap grid rather than drawn as an overlay.

Green colon dots sit on the physical seams between centre sections 3–4 and 4–5. They pulse once per second in clock mode and disappear in `MEL` mode.

The centre normally cycles between:

1. large `HH:MM:SS` for 15 seconds
2. giant `MEL` for 5 seconds

Use `?mode=clock` or `?mode=location` to lock the centre mode.

## Exact pixel maths

### Shared canvas

| Item | Value |
|---|---:|
| Stage | 3840 × 804 px |
| Active board | 3780 × 672 px |
| Left/right margin | 30 px |
| Top/bottom margin | 66 px |
| Physical sections | 7 |
| Each section | 540 × 672 px |
| Seam positions | 30, 570, 1110, 1650, 2190, 2730, 3270, 3810 |

### 49 × 7

| Item | Value |
|---|---:|
| Grid | 49 columns × 7 rows |
| Grid per physical section | 7 × 7 |
| Single flap | 72 × 90 px |
| Horizontal gap | 6 px |
| Vertical gap | 7 px |
| Section width check | 7×72 + 6×6 = 540 |
| Section height check | 7×90 + 6×7 = 672 |
| Total flaps | 343 |
| Side capacity | 7 offices per side, 14 per page |
| Centre | 21 × 7 cells |

Each centre section fits two 3-column digits with a one-column internal gap:

```text
HH section: 3 + 1 + 3 = 7 columns
MM section: 3 + 1 + 3 = 7 columns
SS section: 3 + 1 + 3 = 7 columns
```

Centre information rows:

```text
MELBOURNE AU 17.4°
[ five-row macro clock or giant MEL ]
SUNNY SW22 H68 R40
```

### 42 × 6

| Item | Value |
|---|---:|
| Grid | 42 columns × 6 rows |
| Grid per physical section | 6 × 6 |
| Single flap | 85 × 107 px |
| Horizontal gap | 6 px |
| Vertical gap | 6 px |
| Section width check | 6×85 + 5×6 = 540 |
| Section height check | 6×107 + 5×6 = 672 |
| Total flaps | 252 |
| Side capacity | 6 offices per side, 12 per page |
| Centre | 18 × 6 cells |

Each centre section exactly fits two adjacent 3-column digits:

```text
HH section: 3 + 3 = 6 columns
MM section: 3 + 3 = 6 columns
SS section: 3 + 3 = 6 columns
```

Rows 1–5 contain the macro clock or giant `MEL`. Row 6 alternates between:

```text
MELBOURNE AU 17.4°
SUNNY SW22 H68 R40
```

## Matched split-flap treatment

The flap construction and typography are matched to the existing `Melbl8-Clock03-Split-flap` project:

| Element | Matched value |
|---|---|
| Display font | `MP-B.ttf` |
| Top flap | `#3f3f3c` |
| Bottom flap | `#232322` |
| Centre hinge | `rgba(0,0,0,0.86)` |
| Edge highlight | `rgba(255,255,255,0.08)` |
| Flip perspective | 1600 px |
| Half-flip duration | 300 ms |
| Moving top flap | Darkens during descent |
| Colon treatment | Aurecon green dots with a one-second pulse |

The MP-B font is preloaded from the existing clock project on the same GitHub Pages domain. A narrow system-font fallback remains in place for diagnostics.

## Office roster and timing

Melbourne remains permanently in the centre. Other offices are shown as:

```text
CODE HH:MM:SS
```

The office list uses IANA time zones through `Intl.DateTimeFormat`. Pages rotate every 18 seconds, and row changes are staggered so the entire wall does not flip simultaneously.

The office list is stored near the top of `wall.js` for review and updates.

## URL controls

| Parameter | Example | Effect |
|---|---|---|
| Debug overlay | `?debug=1` | Shows physical section boundaries, coordinates and seam values |
| Disable animation | `?noanim=1` | Changes values instantly |
| Stop office paging | `?cycle=0` | Keeps the first office page |
| Lock centre to clock | `?mode=clock` | Disables the giant MEL cycle |
| Lock centre to MEL | `?mode=location` | Shows giant MEL only |
| Temperature | `?temp=18.2` | Overrides prototype temperature |
| Condition | `?condition=CLOUDY` | Overrides condition text |
| Wind | `?wind=SW22` | Overrides wind text |
| Humidity | `?hum=68` | Overrides humidity |
| Rain | `?rain=40` | Overrides rain percentage number |
| Fixed test time | `?testutc=2026-08-02T04:25:38Z` | Freezes all clocks for repeatable visual QC |

Parameters can be combined.

## Visual and layout QC

Both layouts were rendered at native 3840 × 804 and at a reduced browser viewport.

Checks passed:

- 49 × 7 contains exactly 343 flaps
- 42 × 6 contains exactly 252 flaps
- all seven sections are exactly 540 × 672 px
- active board bounds are x 30, y 66, width 3780, height 672
- all physical seams align to the specified coordinates
- side office lines fit with full `HH:MM:SS`
- the clock and `MEL` modes render in the three centre physical sections
- colon dots hide correctly in location mode
- scaled display remains centred without shifting
- no page script errors were detected during the rendered checks

## NVIDIA Shield notes

- Use the direct `49x7.html` or `42x6.html` page URL in signage software.
- The internal stage always remains 3840 × 804.
- Only changed flaps animate.
- Office pages change every 18 seconds rather than continuously.
- Heavy blur, particles, canvas and WebGL are deliberately avoided.
- `?noanim=1` is available as a diagnostic fallback.

## Weather

Weather is currently replaceable prototype data supplied through defaults or URL parameters. Live Bureau of Meteorology data should be connected after the visual layout and Shield performance are approved.

## Search indexing

Every page contains `noindex`, `nofollow` and `noarchive` directives. `robots.txt` also disallows crawling. This reduces discoverability but is not access control.
