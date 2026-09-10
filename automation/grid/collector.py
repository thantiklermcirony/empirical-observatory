"""Collector-only GB carbon-intensity evidence; Python standard library only."""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

UTC = timezone.utc
BASE = "https://api.carbonintensity.org.uk"
HALF_HOUR = timedelta(minutes=30)
HORIZON = timedelta(hours=24)
MATURITY = timedelta(hours=48)
MONITOR_WINDOW = timedelta(days=7)
MAX_BYTES = 1_000_000
MAX_READ_SECONDS = 30
TARGET_RULE = "first UTC half-hour start >= receipt+24h; actual lead in [24h,24.5h)"
ATTRIBUTION = {
    "provider": "National Energy System Operator (NESO)",
    "description": "Official national carbon-intensity forecasts and estimated actuals; collector maintained independently",
    "source": "https://carbonintensity.org.uk/",
    "license": "CC BY 4.0",
    "license_url": "https://creativecommons.org/licenses/by/4.0/",
    "terms": "https://github.com/carbon-intensity/terms",
    "units": "gCO2/kWh",
    "endorsement": "No provider endorsement or affiliation is implied",
}


def utc(value: datetime) -> datetime:
    if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("Timezone-aware datetime required")
    return value.astimezone(UTC)


def stamp(value):
    return utc(value).isoformat(timespec="microseconds").replace("+00:00", "Z")


def parse(value):
    if not isinstance(value, str):
        raise ValueError("Timestamp must be a string")
    return utc(datetime.fromisoformat(value.replace("Z", "+00:00")))


def floor_half(value):
    value = utc(value)
    return value.replace(minute=(value.minute // 30) * 30, second=0, microsecond=0)


def target_after_receipt(received_at):
    threshold = utc(received_at) + HORIZON
    start = floor_half(threshold)
    if start < threshold:
        start += HALF_HOUR
    return start, start + HALF_HOUR


def nominal_slot(value, offset_minute):
    if not isinstance(offset_minute, int) or not 0 <= offset_minute < 30:
        raise ValueError("Schedule offset must be an integer from 0 to 29")
    return floor_half(utc(value) - timedelta(minutes=offset_minute)) + timedelta(minutes=offset_minute)


def interval_url(start, end):
    start, end = utc(start), utc(end)
    if start != floor_half(start) or end != floor_half(end) or not start < end <= start + timedelta(days=1):
        raise ValueError("Bounded half-hour-aligned interval required")
    fmt = lambda d: d.strftime("%Y-%m-%dT%H:%MZ")
    return BASE + "/intensity/" + fmt(start) + "/" + fmt(end)


def numeric(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
        raise ValueError("Intensity must be a finite nonnegative number, not boolean/null")
    return value


def decode(raw):
    def invalid(value):
        raise ValueError("Nonstandard nonfinite JSON token: " + value)
    data = json.loads(raw, parse_constant=invalid)
    if not isinstance(data, dict) or not isinstance(data.get("data"), list):
        raise ValueError("Expected national data list")
    return data["data"]


def exact_row(rows, start, end):
    matched = [row for row in rows if isinstance(row, dict)
               and parse(row.get("from")) == start and parse(row.get("to")) == end]
    if len(matched) != 1:
        raise ValueError(f"Expected one exact target interval, received {len(matched)}")
    if not isinstance(matched[0].get("intensity"), dict):
        raise ValueError("National intensity object missing")
    return matched[0]["intensity"]


def bytes_json(value):
    return (json.dumps(value, indent=2, sort_keys=True, allow_nan=False) + "\n").encode("utf-8")


def immutable(path, raw):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        if path.read_bytes() != raw:
            raise ValueError("Immutable record conflict: " + str(path))
        return
    with path.open("xb") as stream:
        stream.write(raw)


def replace_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    temp.write_bytes(bytes_json(value))
    os.replace(temp, path)


def read_json(path, default=None):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


@contextmanager
def exclusive(folder):
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / ".collector.lock"
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError as error:
        raise RuntimeError("Another collector or an unresolved crash lock exists; inspect before retrying") from error
    try:
        with os.fdopen(fd, "w") as stream:
            stream.write(str(os.getpid()))
        yield
    finally:
        path.unlink()


@dataclass(frozen=True)
class Response:
    body: bytes
    status: int = 200
    headers: dict | None = None


class SameProviderRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urllib.parse.urlparse(newurl)
        if parsed.scheme != "https" or parsed.netloc != "api.carbonintensity.org.uk":
            raise ValueError("Redirect outside fixed provider rejected")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch_http(url):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != "api.carbonintensity.org.uk" or not parsed.path.startswith("/intensity/"):
        raise ValueError("Only fixed national provider URLs are permitted")
    request = urllib.request.Request(url, headers={
        "Accept": "application/json", "User-Agent": "EmpiricalObservatory-GridCollector/0.1"})
    opener = urllib.request.build_opener(SameProviderRedirect())
    try:
        response = opener.open(request, timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        deadline = time.monotonic() + MAX_READ_SECONDS
        chunks, total = [], 0
        read = getattr(response, "read1", response.read)
        while True:
            if time.monotonic() >= deadline:
                raise TimeoutError("Provider response exceeded the read deadline")
            chunk = read(min(65_536, MAX_BYTES + 1 - total))
            if time.monotonic() >= deadline:
                raise TimeoutError("Provider response exceeded the read deadline")
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            if total > MAX_BYTES:
                raise ValueError("Provider response exceeds one-megabyte cap")
        body = b"".join(chunks)
        headers = {k.lower(): v for k, v in response.headers.items()
                   if k.lower() in ("date", "etag", "last-modified", "cache-control", "age", "retry-after", "content-type")}
        return Response(body, response.status, headers)


def capture(folder, url, fetch, now, run_id, kind):
    requested = utc(now())
    result = fetch(url)
    received = utc(now())
    if not isinstance(result, Response) or not isinstance(result.body, bytes) or len(result.body) > MAX_BYTES:
        raise ValueError("Invalid or oversized transport response")
    sha = hashlib.sha256(result.body).hexdigest()
    immutable(folder / "raw" / (sha + ".body"), result.body)
    record = {"url": url, "requested_at": stamp(requested), "received_at": stamp(received),
              "http_status": result.status, "headers": result.headers or {}, "raw_sha256": sha,
              "bytes": len(result.body), "kind": kind}
    immutable(folder / "captures" / (run_id + "-" + kind + ".json"), bytes_json(record))
    if received < requested:
        raise ValueError("Recorder clock moved backward during request")
    if result.status != 200:
        raise ValueError("Provider HTTP status " + str(result.status) + "; no immediate retry")
    return decode(result.body), record, received


def key(start):
    return utc(start).strftime("%Y%m%dT%H%MZ")


def records(folder):
    return [read_json(path) for path in sorted(folder.glob("*.json"))] if folder.exists() else []


def run_cycle(store_path, fetch_json_callable=fetch_http, now_callable=lambda: datetime.now(UTC),
              schedule_offset_minute=5):
    """One bounded cycle: one forecast request, at most one mature-actual daily batch."""
    folder = Path(store_path)
    with exclusive(folder):
        now, fetch = now_callable, fetch_json_callable
        started = utc(now())
        slot = nominal_slot(started, schedule_offset_minute)
        config_path = folder / "config.json"
        config = read_json(config_path)
        if config is None:
            config = {"schema_version": 1, "schedule_start_at": stamp(slot), "cadence_seconds": 1800,
                      "schedule_offset_minute": schedule_offset_minute, "maturity_seconds": 172800,
                      "target_rule": TARGET_RULE,
                      "phase": "collector_only_no_candidate_model", "attribution": ATTRIBUTION}
            immutable(config_path, bytes_json(config))
        if config["schedule_offset_minute"] != schedule_offset_minute:
            raise ValueError("Changing the schedule requires a separate store")
        run_id = started.strftime("%Y%m%dT%H%M%S%fZ") + "-" + uuid.uuid4().hex[:8]
        run = {"run_id": run_id, "started_at": stamp(started), "nominal_slot": stamp(slot),
               "collector_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
               "forecast_status": "not_attempted", "errors": [], "mature_checked": 0,
               "mature_missing": 0, "new_resolutions": 0, "new_revisions": 0}
        try:
            lower = floor_half(started + HORIZON)
            rows, receipt, received = capture(folder, interval_url(lower, lower + 3 * HALF_HOUR),
                                              fetch, now, run_id, "forecast")
            target_start, target_end = target_after_receipt(received)
            item = exact_row(rows, target_start, target_end)
            value = numeric(item.get("forecast"))
            if item.get("actual") is not None:
                raise ValueError("Future target unexpectedly has a reported actual")
            path = folder / "forecasts" / (key(target_start) + ".json")
            if path.exists():
                run["forecast_status"] = "duplicate_target_preserved_first_vintage"
            else:
                record = {"schema_version": 1, "forecast_id": key(target_start), "provider": "NESO",
                          "issued_at": stamp(received), "received_at": stamp(received),
                          "provider_issued_at": None, "target_start": stamp(target_start),
                          "target_end": stamp(target_end), "value": value, "units": "gCO2/kWh",
                          "exact_lead_seconds": (target_start - received).total_seconds(),
                          "matures_at": stamp(target_end + MATURITY), "raw_sha256": receipt["raw_sha256"],
                          "capture_record": "captures/" + run_id + "-forecast.json",
                          "nominal_run_slot": stamp(slot),
                          "evidence": "local receipt clock; public pre-outcome commitment not established by this file",
                          "attribution": ATTRIBUTION}
                immutable(path, bytes_json(record))
                run["forecast_status"] = "captured"
            run["target_id"] = key(target_start)
        except Exception as error:
            run["forecast_status"] = "error"
            run["errors"].append({"phase": "forecast", "type": type(error).__name__, "message": str(error)})

        forecasts = records(folder / "forecasts")
        checks = read_json(folder / "check-state.json", {})
        due = []
        for record in forecasts:
            maturity = parse(record["matures_at"])
            checked = checks.get(record["forecast_id"], {})
            resolution = read_json(folder / "resolutions" / (record["forecast_id"] + ".json"))
            interval = timedelta(hours=24 if resolution else 6)
            last = parse(checked["checked_at"]) if "checked_at" in checked else datetime.min.replace(tzinfo=UTC)
            if maturity <= started <= maturity + MONITOR_WINDOW and started - last >= interval:
                due.append((last, record))
        if due:
            due.sort(key=lambda x: (x[0], x[1]["target_start"]))
            day = parse(due[0][1]["target_start"]).replace(hour=0, minute=0, second=0, microsecond=0)
            batch = [r for _, r in due if day <= parse(r["target_start"]) < day + timedelta(days=1)]
            try:
                rows, receipt, received = capture(folder, interval_url(day, day + timedelta(days=1)),
                                                  fetch, now, run_id, "actual")
                for record in batch:
                    identity = record["forecast_id"]
                    prior = checks.get(identity, {})
                    check = {**prior, "checked_at": stamp(received)}
                    checks[identity] = check
                    run["mature_checked"] += 1
                    try:
                        if received < parse(record["matures_at"]):
                            raise ValueError("Actual capture precedes maturity")
                        item = exact_row(rows, parse(record["target_start"]), parse(record["target_end"]))
                        actual = item.get("actual")
                        if actual is not None:
                            actual = numeric(actual)
                        else:
                            run["mature_missing"] += 1
                        resolution_path = folder / "resolutions" / (identity + ".json")
                        resolution = read_json(resolution_path)
                        observed = {"forecast_id": identity, "target_start": record["target_start"],
                                    "target_end": record["target_end"], "actual": actual,
                                    "observed_at": stamp(received), "raw_sha256": receipt["raw_sha256"],
                                    "capture_record": "captures/" + run_id + "-actual.json",
                                    "kind": "national_estimated_actual_not_final_or_marginal_emissions"}
                        if resolution is None and actual is not None:
                            observed["resolved_at"] = stamp(received)
                            immutable(resolution_path, bytes_json(observed))
                            run["new_resolutions"] += 1
                        elif resolution is not None and actual != prior.get("last_actual", resolution["actual"]):
                            observed["first_mature_actual"] = resolution["actual"]
                            immutable(folder / "revisions" / identity / (run_id + ".json"), bytes_json(observed))
                            run["new_revisions"] += 1
                        check["last_actual"] = actual
                    except Exception as error:
                        run["mature_missing"] += 1
                        run["errors"].append({"phase": "actual_record", "forecast_id": identity,
                                              "type": type(error).__name__, "message": str(error)})
            except Exception as error:
                run["errors"].append({"phase": "actual", "type": type(error).__name__, "message": str(error)})
        replace_json(folder / "check-state.json", checks)
        run["completed_at"] = stamp(utc(now()))
        immutable(folder / "runs" / (run_id + ".json"), bytes_json(run))
        summary = build_summary(folder, parse(run["completed_at"]))
        replace_json(folder / "summary.json", summary)
        return summary


def build_summary(folder, generated_at):
    folder, generated_at = Path(folder), utc(generated_at)
    config = read_json(folder / "config.json")
    runs = records(folder / "runs")
    forecasts = records(folder / "forecasts")
    if not config or not runs:
        raise ValueError("Collector store has no run provenance")
    observed_slots = {r["nominal_slot"] for r in runs}
    current = nominal_slot(generated_at, config["schedule_offset_minute"])
    expected, missing = [], []
    slot = parse(config["schedule_start_at"])
    while slot <= current:
        expected.append(stamp(slot))
        if stamp(slot) not in observed_slots:
            missing.append(stamp(slot))
        slot += HALF_HOUR
    output = []
    for f in forecasts:
        resolution = read_json(folder / "resolutions" / (f["forecast_id"] + ".json"))
        revisions = records(folder / "revisions" / f["forecast_id"])
        maturity = parse(f["matures_at"])
        status = "resolved" if resolution else ("pending" if generated_at < maturity else
                  "unresolved_expired" if generated_at > maturity + MONITOR_WINDOW else "mature_waiting")
        output.append({**{k: f[k] for k in ("forecast_id", "issued_at", "received_at", "target_start", "target_end",
                                          "value", "exact_lead_seconds", "matures_at", "raw_sha256")},
                       "actual": resolution["actual"] if resolution else None,
                       "resolved_at": resolution["resolved_at"] if resolution else None,
                       "actual_raw_sha256": resolution["raw_sha256"] if resolution else None,
                       "status": status, "revision_count": len(revisions)})
    last_run = max(runs, key=lambda r: r["started_at"])
    result = {"schema_version": 1, "phase": "collector_only", "generated_at": stamp(generated_at),
            "last_capture": max((f["received_at"] for f in forecasts), default=None),
            "attribution": ATTRIBUTION, "geography": "Great Britain national",
            "target_rule": config["target_rule"], "maturity_rule": "first observed non-null national actual at least 48h after target end",
            "evidence": "Local capture records; GitHub publication time must be established separately",
            "candidate_model": None, "predictive_superiority_claim": False,
            "forecast_records": output[-192:], "summary_limit": 192,
            "health": {"forecast_count": len(output), "resolved_count": sum(r["status"] == "resolved" for r in output),
                       "mature_unresolved_count": sum(r["status"] in ("mature_waiting", "unresolved_expired") for r in output),
                       "pending_count": sum(r["status"] == "pending" for r in output),
                       "revision_count": sum(r["revision_count"] for r in output),
                       "expected_run_slots": len(expected), "observed_run_slots": len(observed_slots),
                       "unobserved_run_slots": len(missing), "recent_unobserved_slots": missing[-96:],
                       "slot_interpretation": "Latest nominal UTC slot at actual run start; queued scheduler event times are not reconstructed",
                       "run_count": len(runs), "error_count": sum(len(r["errors"]) for r in runs),
                       "mature_missing_checks": sum(r["mature_missing"] for r in runs),
                       "last_run": last_run}}
    result.update(ui_projection(result))
    return result


def ui_projection(summary):
    """Small public UI view; full raw evidence remains in the store."""
    health = summary["health"]
    status = "error" if health["last_run"]["errors"] else "collecting" if health["forecast_count"] else "empty"
    return {
        "status": status, "capturedAt": summary["last_capture"],
        "records": [{"issuedAt": r["issued_at"], "start": r["target_start"], "end": r["target_end"],
                     "forecast": r["value"], "actual": r["actual"],
                     "leadHours": r["exact_lead_seconds"] / 3600}
                    for r in summary["forecast_records"]],
        "resolved": health["resolved_count"], "missed": health["unobserved_run_slots"],
        "source": ATTRIBUTION["source"],
        "provenance": summary["evidence"],
        "detail": ("Collecting NESO forecasts for the first half-hour starting at least 24 hours after receipt. "
                   "Actuals resolve no earlier than 48 hours after target end. "
                   "Issued time is our receipt time; no candidate predictor is being evaluated. "
                   "Missed counts are unobserved nominal run slots, not verified scheduler failures."),
    }


def verify_store(store_path):
    """Recompute evidence links from disk without network or trusting the summary."""
    folder = Path(store_path).resolve()
    errors, counts = [], {"raw": 0, "captures": 0, "forecasts": 0, "resolutions": 0, "revisions": 0}
    if not folder.exists():
        return {"schema_version": 1, "valid": False, "counts": counts, "errors": ["Store does not exist"]}

    def require(condition, message):
        if not condition:
            raise ValueError(message)

    def safe_path(relative, category):
        require(isinstance(relative, str) and "\\" not in relative, "Invalid relative reference")
        parts = relative.split("/")
        require(parts[0] == category and all(p and p not in (".", "..") and ":" not in p for p in parts),
                "Reference category or path traversal invalid")
        path = (folder / relative).resolve()
        require(path.is_relative_to(folder), "Reference escapes store")
        require(path.is_file() and path.stat().st_size <= MAX_BYTES, "Referenced file missing or oversized")
        return path

    def small_json(path):
        require(path.resolve().is_relative_to(folder) and path.stat().st_size <= MAX_BYTES,
                "JSON file escapes store or exceeds cap")
        return json.loads(path.read_bytes())

    def checked(label, fn):
        try:
            fn()
        except Exception as error:
            errors.append(label + ": " + type(error).__name__ + ": " + str(error))

    def check_config():
        config = small_json(folder / "config.json")
        expected = {"schema_version": 1, "cadence_seconds": 1800, "maturity_seconds": 172800,
                    "target_rule": TARGET_RULE, "phase": "collector_only_no_candidate_model",
                    "attribution": ATTRIBUTION}
        for name, value in expected.items():
            require(config.get(name) == value, "Frozen configuration mismatch: " + name)
        offset = config["schedule_offset_minute"]
        require(not isinstance(offset, bool), "Boolean schedule offset invalid")
        start = parse(config["schedule_start_at"])
        require(start == nominal_slot(start, offset), "Schedule start is not an aligned nominal slot")
    checked("config.json", check_config)

    raw = {}
    for path in sorted((folder / "raw").glob("*.body")):
        def check_raw(path=path):
            require(re.fullmatch(r"[0-9a-f]{64}\.body", path.name) is not None, "Invalid raw hash filename")
            checked_path = safe_path("raw/" + path.name, "raw")
            body = checked_path.read_bytes()
            require(hashlib.sha256(body).hexdigest() == path.stem, "Raw body SHA-256 mismatch")
            raw[path.stem] = body
            counts["raw"] += 1
        checked("raw/" + path.name, check_raw)

    captures = {}
    for path in sorted((folder / "captures").glob("*.json")):
        def check_capture(path=path):
            record = small_json(path)
            body = raw[record["raw_sha256"]]
            require(record["bytes"] == len(body), "Capture byte count mismatch")
            require(parse(record["requested_at"]) <= parse(record["received_at"]), "Capture receipt precedes request")
            require(record["kind"] in ("forecast", "actual"), "Unknown capture kind")
            require(isinstance(record["http_status"], int) and not isinstance(record["http_status"], bool),
                    "Invalid HTTP status")
            prefix = BASE + "/intensity/"
            require(record["url"].startswith(prefix), "Capture URL outside provider")
            bounds = record["url"][len(prefix):].split("/")
            require(len(bounds) == 2, "Capture URL does not declare one bounded interval")
            lower, upper = map(parse, bounds)
            require(record["url"] == interval_url(lower, upper), "Capture interval URL invalid")
            captures["captures/" + path.name] = (record, body, lower, upper)
            counts["captures"] += 1
        checked("captures/" + path.name, check_capture)

    def source(record, kind, start, end):
        reference = record["capture_record"]
        safe_path(reference, "captures")
        capture_record, body, lower, upper = captures[reference]
        require(capture_record["http_status"] == 200 and capture_record["kind"] == kind, "Wrong source capture status/kind")
        require(record["raw_sha256"] == capture_record["raw_sha256"], "Record/capture raw hash disagreement")
        require(lower <= start < end <= upper, "Target outside requested interval")
        return exact_row(decode(body), start, end), parse(capture_record["received_at"])

    valid_forecasts = {}
    for path in sorted((folder / "forecasts").glob("*.json")):
        def check_forecast(path=path):
            f = small_json(path)
            start, end = parse(f["target_start"]), parse(f["target_end"])
            require(f["forecast_id"] == path.stem == key(start), "Forecast identity/filename mismatch")
            item, receipt = source(f, "forecast", start, end)
            require((start, end) == target_after_receipt(receipt), "Target violates receipt-derived interval rule")
            require(parse(f["received_at"]) == receipt == parse(f["issued_at"]), "Forecast receipt/issued time mismatch")
            require(f.get("provider_issued_at") is None, "Invented provider issue time")
            require(numeric(f["value"]) == numeric(item.get("forecast")), "Forecast value differs from raw response")
            require(item.get("actual") is None, "Forecast source reports a future actual")
            require(numeric(f["exact_lead_seconds"]) == (start - receipt).total_seconds(), "Lead time mismatch")
            require(parse(f["matures_at"]) == end + MATURITY, "Maturity differs from target end + 48h")
            require(f["units"] == "gCO2/kWh" and f["provider"] == "NESO", "Forecast units/provider mismatch")
            valid_forecasts[f["forecast_id"]] = f
            counts["forecasts"] += 1
        checked("forecasts/" + path.name, check_forecast)

    # Reconstruct first eligible captured forecast vintage; failed HTTP/schema
    # captures remain evidence but cannot become a forecast candidate.
    for reference, (capture_record, body, lower, upper) in captures.items():
        if capture_record["kind"] != "forecast" or capture_record["http_status"] != 200:
            continue
        try:
            receipt = parse(capture_record["received_at"])
            start, end = target_after_receipt(receipt)
            item = exact_row(decode(body), start, end)
            numeric(item.get("forecast"))
            if item.get("actual") is not None or not lower <= start < end <= upper:
                continue
        except (KeyError, TypeError, ValueError):
            continue
        f = valid_forecasts.get(key(start))
        if f is None or parse(f["received_at"]) > receipt:
            errors.append(reference + ": first valid captured forecast vintage missing or replaced")

    resolutions = {}
    def check_outcome(path, revision=False):
        r = small_json(path)
        f = valid_forecasts[r["forecast_id"]]
        start, end = parse(r["target_start"]), parse(r["target_end"])
        require((start, end) == (parse(f["target_start"]), parse(f["target_end"])), "Outcome/forecast interval mismatch")
        item, receipt = source(r, "actual", start, end)
        require(receipt >= end + MATURITY, "Outcome captured before maturity")
        require(parse(r["observed_at"]) == receipt, "Outcome observed time differs from capture")
        actual = item.get("actual")
        if actual is not None:
            numeric(actual)
        if r["actual"] is not None:
            numeric(r["actual"])
        require(r["actual"] == actual, "Outcome value differs from raw response")
        if revision:
            first = resolutions[r["forecast_id"]]
            require(parse(first["resolved_at"]) <= receipt, "Revision predates first resolution")
            require(r["first_mature_actual"] == first["actual"], "Revision's first-mature label mismatch")
            require(path.parent.name == r["forecast_id"], "Revision folder/identity mismatch")
            counts["revisions"] += 1
        else:
            require(r["forecast_id"] == path.stem, "Resolution filename/identity mismatch")
            require(actual is not None, "Null value cannot resolve a target")
            require(parse(r["resolved_at"]) == receipt, "Resolution time differs from receipt")
            resolutions[r["forecast_id"]] = r
            counts["resolutions"] += 1
    for path in sorted((folder / "resolutions").glob("*.json")):
        checked("resolutions/" + path.name, lambda path=path: check_outcome(path))
    for path in sorted((folder / "revisions").glob("*/*.json")):
        checked("revisions/" + path.parent.name + "/" + path.name, lambda path=path: check_outcome(path, True))
    return {"schema_version": 1, "valid": not errors, "counts": counts, "errors": errors,
            "meaning": "Offline internal consistency and source linkage; not independent public timestamp authentication"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    command = sub.add_parser("collect", help="Perform one authorized public-provider collection cycle")
    command.add_argument("--store", type=Path, required=True)
    command.add_argument("--schedule-offset-minute", type=int, default=5)
    verification = sub.add_parser("verify", help="Verify immutable source links without network")
    verification.add_argument("--store", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "verify":
        result = verify_store(args.store)
        print(json.dumps(result, indent=2))
        return 0 if result["valid"] else 1
    result = run_cycle(args.store, schedule_offset_minute=args.schedule_offset_minute)
    print(json.dumps({"phase": result["phase"], "health": result["health"]}, indent=2))
    return 1 if result["health"]["last_run"]["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
