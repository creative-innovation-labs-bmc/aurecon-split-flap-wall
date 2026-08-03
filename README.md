# Aurecon split-flap wall

Live split-flap wall for the 3840 × 804 display at Aurecon Centre, 850 Collins Street, Docklands, Melbourne.

## Current preferred build

`49x7.html` and `49x7-live.html` use the selected Option 2 layout:

```text
8 columns | 33-column Melbourne hero | 8 columns
```

- 49 columns × 7 rows
- 343 split-flap modules
- 72 × 90 px per flap
- 6 px horizontal gaps
- 7 px vertical gaps
- two stacked office cards on each side
- wider eight-column office names
- centred 4 × 5 macro digits
- 24-hour `HH:MM:SS`
- two-column gaps between HH, MM and SS
- green blinking colon dots split across the two gap flaps

## Melbourne clock geometry

The centre has 33 columns. The active clock occupies 31 columns and is centred with one blank column on each side:

```text
1 margin
9 columns HH  = 4 + 1 + 4
2 columns split colon
9 columns MM  = 4 + 1 + 4
2 columns split colon
9 columns SS  = 4 + 1 + 4
1 margin
```

## Side office cards

Four offices are visible at once, two per side:

```text
SYDNEY
AUS
14:25

PERTH
AUS
12:25
```

Office pages rotate every 14 seconds. Local office times update each minute. Melbourne remains permanently in the centre. The office name, country and time lines now cascade in separately, and the four cards are staggered across the wall on first load and every page change. On the right side, the country and time rows are shifted one cell inward for balanced spacing against the Melbourne zone.

The office roster follows the current Aurecon locations page and includes offices across Australia, New Zealand and Asia. Melbourne is excluded from the side rotation because it is the hero location.

## Real-time weather

The wall uses the Bureau of Meteorology's Melbourne (Olympic Park) observation feed, station WMO `95936`, which is the nearest standard BOM observation used for Docklands.

A GitHub Actions workflow runs every 10 minutes:

1. `scripts/fetch_weather.py` fetches the official BOM JSON feed.
2. It writes a small same-origin `weather.json` file.
3. The page refreshes `weather.json` every five minutes.
4. Only weather characters that changed flip.

This avoids browser CORS problems on GitHub Pages and keeps the NVIDIA Shield implementation static and lightweight.

Displayed fields:

- current air temperature
- wind direction and speed
- relative humidity
- rain since 9 am in millimetres

The BOM observation feed does not reliably provide a simple `SUNNY` or `CLOUDY` label. The header therefore shows `LIVE` unless the observation contains an explicit weather condition. Rain is shown in millimetres since 9 am, not as a forecast percentage.

## Matched split-flap treatment

- font: `MP-B.ttf`
- top flap: `#3f3f3c`
- bottom flap: `#232322`
- hinge: `rgba(0,0,0,0.86)`
- perspective: 1600 px
- half-flip duration: 300 ms
- darker descending top flap
- Aurecon green `#89C925` split-circle hero colons and blinking mini office-time colons
- Aurecon grey `#373A36` stage

## Performance

Designed for NVIDIA Shield signage playback:

- plain HTML, CSS and JavaScript
- no canvas
- no WebGL
- no framework
- no continuous 60 fps loop
- only changed cells animate
- automatic Android/NVIDIA Shield mode removes expensive animated filters and reduces shadow blur while retaining the flap motion
- launch and office changes are deliberately sequenced so the peak number of simultaneous flips stays limited
- side office clocks update once per minute
- weather refreshes every five minutes
- office pages rotate every 14 seconds

## URL controls

| Parameter | Effect |
|---|---|
| `?debug=1` | Shows cell and zone guides |
| `?noanim=1` | Changes cells instantly |
| `?cycle=0` | Stops office page rotation |
| `?page=3` | Starts on a specific office page |
| `?testutc=2026-08-03T12:22:22+10:00` | Freezes clocks for QC |
| `?temp=17.4` | Overrides temperature |
| `?condition=LIVE` | Overrides weather label |
| `?winddir=SW` | Overrides wind direction |
| `?wind=22` | Overrides wind speed |
| `?hum=68` | Overrides humidity |
| `?rain=0.0` | Overrides rain since 9 am |
| `?shield=1` | Forces the Android/NVIDIA Shield performance profile |
| `?shield=0` | Disables automatic Shield performance mode for comparison |

## Search indexing

All HTML pages include `noindex`, `nofollow` and `noarchive`. The root `robots.txt` deliberately permits crawling so compliant search engines can read and honour those page-level `noindex` rules. The live pages also use a restrictive Content Security Policy and send no referrer. This prevents normal search indexing and limits browser capabilities, but GitHub Pages remains a public host and this is not password-based access control.
