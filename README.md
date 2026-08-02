# Aurecon split-flap wall

Two exact-pixel split-flap wall prototypes for the 3840 × 804 video wall at Aurecon Centre, 850 Collins Street, Docklands, Melbourne.

- **49 × 7:** `49x7.html`
- **42 × 6:** `42x6.html`
- Selector and notes: `index.html`

The site uses plain HTML, CSS and JavaScript. There is no framework, canvas, WebGL or external runtime library.

## Resolved layout concept

The seven physical screen sections are divided into a **2 / 3 / 2 composition**:

- two sections on the left for rotating office clocks
- three centre sections for the Melbourne hero
- two sections on the right for rotating office clocks

The side rows use one split flap per character. The centre uses multiple flaps as a bitmap display.

### Centre behaviour

The centre cycles between:

1. a five-row, seven-segment-style `HH:MM:SS` clock built from multiple flap cells
2. giant `MEL`, with one letter inside each of the three centre physical sections

The clock remains visible for 15 seconds. `MEL` appears for 5 seconds. This can be disabled with `?mode=clock` or `?mode=location`.

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

Centre rows:

```text
MELBOURNE 17.4° SUNNY
[ five-row macro clock or giant MEL ]
AU SW22K HUM68 RAIN40
```

The 21-column clock fit is exact. It uses six two-column digits, two one-column colons and one blank column between every symbol.

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

Rows 1–5 contain the macro clock or giant `MEL`. Row 6 alternates between:

```text
MELBOURNE AU 17.4°
SUNNY SW22 H68 R40
```

The compact clock uses 17 columns and is centred in the 18-column area:

```text
HH block 5 + colon 1 + MM block 5 + colon 1 + SS block 5 = 17
```

## Office roster

The prototype includes the public Aurecon office list across Australia, New Zealand and Asia from <https://www.aurecongroup.com/locations>, excluding Melbourne because it is the permanent centre hero. Each office has an internal three-letter display code and an IANA time zone. Side pages rotate every 18 seconds and row changes are staggered.

The list is stored near the top of `wall.js` for easy review and updates.

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
| Wind | `?wind=SW22K` | Overrides wind text |
| Humidity | `?hum=68` | Overrides humidity |
| Rain | `?rain=40` | Overrides rain percentage number |

Parameters can be combined.

## NVIDIA Shield notes

- Use the direct `49x7.html` or `42x6.html` page URL in signage software.
- The stage is always 3840 × 804 and scales uniformly only when the browser viewport differs.
- Only changed flaps animate.
- Office pages change every 18 seconds rather than continuously.
- The app uses `Intl.DateTimeFormat` instead of a time-zone library.
- Heavy blur, particles, canvas and WebGL are deliberately avoided.
- `?noanim=1` is available as a fallback for diagnostics.

The MP-B display font is loaded from the existing `Melbl8-Clock03-Split-flap` GitHub Pages project on the same domain. The page falls back to Arial Narrow if that asset is unavailable.

## Weather

Weather is currently replaceable prototype data, supplied through defaults or URL parameters. Live Bureau of Meteorology data should be connected only after the visual layout and Shield performance are approved.

## Search indexing

Every page contains `noindex`, `nofollow` and `noarchive` directives. `robots.txt` also disallows crawling. This reduces discoverability but is not access control.
