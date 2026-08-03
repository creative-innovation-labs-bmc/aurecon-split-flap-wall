(() => {
  'use strict';

  // Random-build launch fix only.
  // During the row-by-row entrance, wall-live.js keeps the activated clock
  // cells synced to the current time. A flap can still be mid-transition when
  // the next second arrives, so dataset.value/dataset.macro may describe the
  // completed state rather than the state already requested. Track that
  // requested state here and suppress identical requests.

  const CENTRE_START = 8;
  const DIGIT_STARTS = [1, 6, 12, 17, 23, 28];
  const DIGIT_ROWS = 5;
  const DIGIT_COLS = 4;
  const targetCoords = new Set();

  for (const digitStart of DIGIT_STARTS) {
    for (let row = 0; row < DIGIT_ROWS; row += 1) {
      for (let col = 0; col < DIGIT_COLS; col += 1) {
        const globalRowOneBased = 1 + row + 1;
        const globalColOneBased = CENTRE_START + digitStart + col + 1;
        targetCoords.add(`${globalColOneBased},${globalRowOneBased}`);
      }
    }
  }

  let wrappedCount = 0;
  let suppressedCount = 0;

  function wrapFlap(flap) {
    if (!flap || flap._launchDedupeWrapped) return;
    if (!targetCoords.has(flap.dataset.coord)) return;
    if (typeof flap.update !== 'function') return;

    const originalUpdate = flap.update.bind(flap);
    flap._launchDedupeWrapped = true;
    flap._launchRequestedValue = null;
    flap._launchRequestedMacro = null;

    flap.update = (value, macro = false, delay = 0, halfMs) => {
      const nextValue = String(value ?? ' ').slice(0, 1) || ' ';
      const nextMacro = Boolean(macro);
      const launching = document.body.classList.contains('launching');

      if (launching) {
        if (
          flap._launchRequestedValue === nextValue
          && flap._launchRequestedMacro === nextMacro
        ) {
          suppressedCount += 1;
          window.__launchClockDedupe = {
            wrappedCount,
            suppressedCount,
            lastSuppressedCoord: flap.dataset.coord,
            lastSuppressedAt: Date.now()
          };
          return;
        }
        flap._launchRequestedValue = nextValue;
        flap._launchRequestedMacro = nextMacro;
      } else {
        flap._launchRequestedValue = null;
        flap._launchRequestedMacro = null;
      }

      originalUpdate(nextValue, nextMacro, delay, halfMs);
    };

    wrappedCount += 1;
    window.__launchClockDedupe = {
      wrappedCount,
      suppressedCount,
      lastSuppressedCoord: null,
      lastSuppressedAt: null
    };
  }

  function scan() {
    document.querySelectorAll('.flap[data-coord]').forEach(wrapFlap);
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();

  window.addEventListener('load', () => {
    scan();
    window.setTimeout(scan, 50);
    window.setTimeout(scan, 250);
  }, { once: true });
})();
