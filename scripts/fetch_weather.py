#!/usr/bin/env python3
"""Fetch the latest BOM observation for Melbourne (Olympic Park)."""
from __future__ import annotations

import json
import pathlib
import urllib.request
from datetime import datetime, timezone

# This script is run by GitHub Actions on push and every ten minutes.
URLS = (
    "https://www.bom.gov.au/fwo/IDV60801/IDV60801.95936.json",
    "https://www.bom.gov.au/fwo/IDV60901/IDV60901.95936.json",
)
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "weather.json"


def fetch_json() -> dict:
    last_error: Exception | None = None
    for url in URLS:
        try:
            request = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Aurecon-Split-Flap-Wall/1.0 (+https://github.com/creative-innovation-labs-bmc/aurecon-split-flap-wall)",
                    "Accept": "application/json",
                },
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except Exception as exc:
            last_error = exc
    raise RuntimeError(f"Unable to fetch BOM data: {last_error}")


def utc_iso(value: str | None) -> str | None:
    if not value or len(value) != 14:
        return None
    dt = datetime.strptime(value, "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def condition_for(record: dict) -> str:
    weather = str(record.get("weather") or "").strip().upper()
    if weather and weather not in {"-", "N/A"}:
        if "RAIN" in weather:
            return "RAIN"
        if "SHOWER" in weather:
            return "SHOWER"
        if "FOG" in weather:
            return "FOG"
        if "STORM" in weather or "THUNDER" in weather:
            return "STORM"
        return weather[:7]
    return "LIVE"


def main() -> None:
    payload = fetch_json()
    data = payload.get("observations", {}).get("data", [])
    if not data:
        raise RuntimeError("BOM response contained no observations")
    record = data[0]
    output = {
        "source": "Bureau of Meteorology",
        "station": record.get("name", "Melbourne (Olympic Park)"),
        "station_wmo": record.get("wmo", 95936),
        "status": "ok",
        "temp_c": record.get("air_temp"),
        "apparent_temp_c": record.get("apparent_t"),
        "condition": condition_for(record),
        "wind_dir": record.get("wind_dir"),
        "wind_kmh": record.get("wind_spd_kmh"),
        "gust_kmh": record.get("gust_kmh"),
        "humidity_pct": record.get("rel_hum"),
        "rain_since_9am_mm": record.get("rain_trace"),
        "pressure_hpa": record.get("press_msl"),
        "observation_local": record.get("local_date_time_full"),
        "observation_utc": utc_iso(record.get("aifstime_utc")),
        "updated_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "copyright": "Copyright Commonwealth of Australia, Bureau of Meteorology"
    }
    OUTPUT.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
