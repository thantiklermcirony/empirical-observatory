"""Offline temporal/provenance contract tests. No network and no model scores."""
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.request

import collector as c


class Clock:
    def __init__(self, value="2026-09-10T06:05:00Z"):
        self.value = c.parse(value)

    def __call__(self):
        return self.value


class Provider:
    def __init__(self, clock):
        self.clock = clock
        self.calls = []
        self.delay = timedelta(seconds=2)
        self.forecast = 80
        self.actual = 120
        self.mutate = lambda rows: rows
        self.status = 200

    def __call__(self, url):
        self.calls.append(url)
        start_text, end_text = url.split("/intensity/")[1].split("/")
        start, end = c.parse(start_text), c.parse(end_text)
        self.clock.value += self.delay
        rows = []
        while start < end:
            rows.append({"from": c.stamp(start), "to": c.stamp(start + c.HALF_HOUR),
                         "intensity": {"forecast": self.forecast,
                                       "actual": self.actual if start < self.clock.value else None,
                                       "index": "moderate"}})
            start += c.HALF_HOUR
        return c.Response(c.bytes_json({"data": self.mutate(rows)}), self.status,
                          {"date": "Thu, 10 Sep 2026 06:05:00 GMT", "retry-after": "1800"})


class CollectorTests(unittest.TestCase):
    def setUp(self):
        scratch = Path(__file__).parent / ".test-tmp"
        scratch.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=scratch)
        self.addCleanup(self.temp.cleanup)
        self.store = Path(self.temp.name) / "store"
        self.clock = Clock()
        self.provider = Provider(self.clock)

    def cycle(self):
        return c.run_cycle(self.store, self.provider, self.clock)

    def seed(self):
        self.cycle()
        return c.records(self.store / "forecasts")[0]

    def mature(self, f, extra=timedelta()):
        self.clock.value = c.parse(f["matures_at"]) + extra
        return self.cycle()

    def test_receipt_rule_exact_boundary_and_microsecond(self):
        at = c.parse("2026-09-10T06:30:00Z")
        self.assertEqual(c.target_after_receipt(at)[0], at + timedelta(hours=24))
        later = at + timedelta(microseconds=1)
        lead = (c.target_after_receipt(later)[0] - later).total_seconds()
        self.assertGreater(lead, 86400)
        self.assertLess(lead, 88200)

    def test_receipt_crosses_half_hour_and_uses_later_target(self):
        self.clock.value = c.parse("2026-09-10T06:29:59Z")
        summary = self.cycle()
        self.assertEqual(summary["records"][0]["start"], "2026-09-11T07:00:00.000000Z")
        self.assertAlmostEqual(summary["records"][0]["leadHours"], 24 + 1799 / 3600)
        self.assertEqual(len(self.provider.calls), 1)

    def test_timezones_normalize_and_naive_rejected(self):
        london = datetime(2026, 10, 25, 1, 15, tzinfo=timezone(timedelta(hours=1)))
        self.assertEqual(c.stamp(c.target_after_receipt(london)[0]), "2026-10-26T00:30:00.000000Z")
        with self.assertRaises(ValueError):
            c.target_after_receipt(datetime(2026, 10, 25, 1, 15))

    def test_first_vintage_and_raw_receipts_are_immutable(self):
        f = self.seed()
        path = self.store / "forecasts" / (f["forecast_id"] + ".json")
        first_bytes = path.read_bytes()
        self.provider.forecast = 999
        summary = self.cycle()
        self.assertEqual(path.read_bytes(), first_bytes)
        self.assertEqual(summary["records"][0]["forecast"], 80)
        self.assertEqual(len(c.records(self.store / "captures")), 2)
        self.assertEqual(summary["health"]["last_run"]["forecast_status"], "duplicate_target_preserved_first_vintage")
        raw = self.store / "raw" / (f["raw_sha256"] + ".body")
        self.assertEqual(hashlib.sha256(raw.read_bytes()).hexdigest(), f["raw_sha256"])
        self.assertIsNone(f["provider_issued_at"])
        self.assertIn("not established", f["evidence"])

    def test_actual_never_resolves_early(self):
        f = self.seed()
        before = len(self.provider.calls)
        summary = self.mature(f, -timedelta(microseconds=1))
        self.assertEqual(len(self.provider.calls) - before, 1)
        self.assertEqual(summary["resolved"], 0)
        self.assertFalse((self.store / "resolutions").exists())

    def test_actual_resolves_at_maturity_and_zero_is_valid(self):
        f = self.seed()
        self.provider.actual = 0
        before = len(self.provider.calls)
        summary = self.mature(f)
        self.assertEqual(len(self.provider.calls) - before, 2)
        result = c.records(self.store / "resolutions")[0]
        self.assertEqual(result["actual"], 0)
        self.assertGreaterEqual(c.parse(result["resolved_at"]), c.parse(f["matures_at"]))
        self.assertEqual(summary["resolved"], 1)

    def test_null_actual_retains_unresolved_then_retries_after_six_hours(self):
        f = self.seed()
        self.provider.actual = None
        first = self.mature(f)
        self.assertEqual(first["resolved"], 0)
        self.assertEqual(first["health"]["mature_missing_checks"], 1)
        before = len(self.provider.calls)
        self.clock.value += timedelta(minutes=30)
        self.cycle()
        self.assertEqual(len(self.provider.calls) - before, 1)
        self.clock.value += timedelta(hours=6)
        self.provider.actual = 42
        self.assertEqual(self.cycle()["resolved"], 1)

    def test_revisions_never_replace_first_mature_label(self):
        f = self.seed()
        self.mature(f)
        path = self.store / "resolutions" / (f["forecast_id"] + ".json")
        first = path.read_bytes()
        for later in (121, 120, None):
            self.clock.value += timedelta(days=1, minutes=1)
            self.provider.actual = later
            self.cycle()
        self.assertEqual(path.read_bytes(), first)
        revisions = c.records(self.store / "revisions" / f["forecast_id"])
        self.assertEqual([r["actual"] for r in revisions], [121, 120, None])
        self.assertTrue(all(r["first_mature_actual"] == 120 for r in revisions))

    def test_stale_unresolved_targets_expire_without_backfill(self):
        f = self.seed()
        summary = self.mature(f, timedelta(days=7, seconds=1))
        self.assertEqual(summary["forecast_records"][0]["status"], "unresolved_expired")
        self.assertEqual(len(self.provider.calls), 2)
        self.assertEqual(summary["resolved"], 0)

    def test_missing_slots_are_not_synthetic_forecasts(self):
        self.seed()
        self.clock.value = c.parse("2026-09-10T07:36:00Z")
        summary = self.cycle()
        self.assertEqual(summary["health"]["expected_run_slots"], 4)
        self.assertEqual(summary["health"]["observed_run_slots"], 2)
        self.assertEqual(summary["missed"], 2)
        self.assertEqual(len(summary["records"]), 2)
        self.cycle()
        self.assertEqual(c.read_json(self.store / "summary.json")["missed"], 2)

    def test_future_actual_rejected(self):
        def future_actual(rows):
            for row in rows:
                row["intensity"]["actual"] = 12
            return rows
        self.provider.mutate = future_actual
        summary = self.cycle()
        self.assertEqual(summary["status"], "error")
        self.assertEqual(summary["records"], [])

    def test_duplicate_and_absent_intervals_rejected(self):
        self.provider.mutate = lambda rows: rows + rows
        self.assertEqual(self.cycle()["status"], "error")
        self.provider.mutate = lambda rows: []
        self.assertEqual(self.cycle()["status"], "error")
        self.assertEqual(c.records(self.store / "forecasts"), [])

    def test_bad_forecast_and_actual_values_rejected(self):
        for invalid in (-1, True, None, "12"):
            with self.subTest(value=invalid):
                self.provider.forecast = invalid
                self.assertEqual(self.cycle()["status"], "error")
        self.provider.forecast = 80
        f = self.seed()
        for invalid in (-1, True, "12"):
            self.provider.actual = invalid
            result = self.mature(f, timedelta(hours=7 * (1 + len(c.records(self.store / "runs")))))
            self.assertEqual(result["resolved"], 0)
            self.assertEqual(result["status"], "error")
        for invalid in (float("nan"), float("inf"), -float("inf")):
            with self.assertRaises(ValueError):
                c.numeric(invalid)
        with self.assertRaises(ValueError):
            c.decode(b'{"data": [], "invalid": NaN}')

    def test_http_failure_archived_without_immediate_retry(self):
        self.provider.status = 429
        summary = self.cycle()
        self.assertEqual(len(self.provider.calls), 1)
        self.assertEqual(summary["status"], "error")
        receipt = c.records(self.store / "captures")[0]
        self.assertEqual(receipt["http_status"], 429)
        self.assertEqual(receipt["headers"]["retry-after"], "1800")
        self.assertTrue((self.store / "raw" / (receipt["raw_sha256"] + ".body")).exists())

    def test_body_cap_and_clock_reversal_fail_closed(self):
        summary = c.run_cycle(self.store, lambda url: c.Response(b"x" * (c.MAX_BYTES + 1)), self.clock)
        self.assertEqual(summary["status"], "error")
        self.provider.delay = -timedelta(seconds=1)
        self.assertEqual(self.cycle()["status"], "error")
        self.assertEqual(c.records(self.store / "forecasts"), [])

    def test_lock_and_schedule_mutation_rejected(self):
        self.seed()
        with c.exclusive(self.store):
            with self.assertRaises(RuntimeError):
                self.cycle()
        with self.assertRaises(ValueError):
            c.run_cycle(self.store, self.provider, self.clock, schedule_offset_minute=10)
        self.assertFalse((self.store / ".collector.lock").exists())

    def test_exact_actual_match_and_multiple_due_records_batch(self):
        first = self.seed()
        self.clock.value += timedelta(minutes=30)
        self.cycle()
        last = c.records(self.store / "forecasts")[-1]
        before = len(self.provider.calls)
        result = self.mature(last)
        self.assertEqual(result["resolved"], 2)
        self.assertEqual(result["health"]["last_run"]["mature_checked"], 2)
        self.assertEqual(len(self.provider.calls) - before, 2)
        resolved = c.records(self.store / "resolutions")
        self.assertEqual(resolved[0]["target_start"], first["target_start"])

    def test_ui_projection_is_bounded_and_honest(self):
        summary = self.cycle()
        self.assertEqual(set(summary["records"][0]), {"issuedAt", "start", "end", "forecast", "actual", "leadHours"})
        self.assertEqual(summary["status"], "collecting")
        self.assertIsNone(summary["records"][0]["actual"])
        self.assertFalse(summary["predictive_superiority_claim"])
        self.assertIn("receipt time", summary["detail"])
        self.assertIn("separately", summary["provenance"])
        self.assertEqual(summary["attribution"]["license"], "CC BY 4.0")
        self.assertEqual(len(summary["health"]["last_run"]["collector_sha256"]), 64)

    def test_fixed_provider_and_bounded_request(self):
        for url in ("http://api.carbonintensity.org.uk/intensity/a/b", "https://example.com/intensity/a/b",
                    "https://api.carbonintensity.org.uk/regional/a/b"):
            with self.assertRaises(ValueError):
                c.fetch_http(url)
        with self.assertRaises(ValueError):
            c.interval_url(self.clock.value, self.clock.value + timedelta(days=30))

    def test_transport_deadline_enforced_without_network(self):
        class FakeResponse:
            status = 200
            headers = {}
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def read(self, size): return b"a"
        class Opener:
            def open(self, request, timeout):
                self.timeout = timeout
                return FakeResponse()
        opener = Opener()
        with patch.object(c.urllib.request, "build_opener", return_value=opener), \
                patch.object(c.time, "monotonic", side_effect=[0, 0, 31]):
            with self.assertRaises(TimeoutError):
                c.fetch_http(c.BASE + "/intensity/2026-09-10T00:00Z/2026-09-10T00:30Z")
        self.assertEqual(opener.timeout, 20)

    def test_verifier_accepts_normal_captures_resolutions_and_revisions(self):
        f = self.seed()
        self.mature(f)
        self.clock.value += timedelta(days=1, minutes=1)
        self.provider.actual = 121
        self.cycle()
        result = c.verify_store(self.store)
        self.assertTrue(result["valid"], result["errors"])
        self.assertEqual(result["counts"]["resolutions"], 1)
        self.assertEqual(result["counts"]["revisions"], 1)

    def test_verifier_rejects_forecast_value_maturity_and_reference_tampering(self):
        f = self.seed()
        path = self.store / "forecasts" / (f["forecast_id"] + ".json")
        for name, value in (("value", 987), ("matures_at", c.stamp(c.parse(f["matures_at"]) - timedelta(days=1))),
                            ("capture_record", "captures/../../outside.json"),
                            ("capture_record", str(path.resolve())), ("exact_lead_seconds", 1)):
            with self.subTest(field=name):
                path.write_bytes(c.bytes_json({**f, name: value}))
                self.assertFalse(c.verify_store(self.store)["valid"])
        path.write_bytes(c.bytes_json(f))
        self.assertTrue(c.verify_store(self.store)["valid"])

    def test_verifier_rejects_raw_and_capture_tampering(self):
        f = self.seed()
        raw = self.store / "raw" / (f["raw_sha256"] + ".body")
        original = raw.read_bytes()
        raw.write_bytes(original + b" ")
        self.assertFalse(c.verify_store(self.store)["valid"])
        raw.write_bytes(original)
        capture_path = self.store / f["capture_record"]
        capture = c.read_json(capture_path)
        capture_path.write_bytes(c.bytes_json({**capture, "bytes": 1}))
        self.assertFalse(c.verify_store(self.store)["valid"])

    def test_verifier_rejects_frozen_configuration_change(self):
        self.seed()
        path = self.store / "config.json"
        original = c.read_json(path)
        for name, value in (("maturity_seconds", 0), ("cadence_seconds", 1), ("target_rule", "now")):
            path.write_bytes(c.bytes_json({**original, name: value}))
            self.assertFalse(c.verify_store(self.store)["valid"])
        path.write_bytes(c.bytes_json(original))
        self.assertTrue(c.verify_store(self.store)["valid"])

    def test_verifier_rejects_actual_value_and_early_resolution_tampering(self):
        f = self.seed()
        self.mature(f)
        path = self.store / "resolutions" / (f["forecast_id"] + ".json")
        original = c.read_json(path)
        for name, value in (("actual", 999), ("resolved_at", f["target_end"]),
                            ("target_start", f["target_end"])):
            path.write_bytes(c.bytes_json({**original, name: value}))
            self.assertFalse(c.verify_store(self.store)["valid"])
        path.write_bytes(c.bytes_json(original))
        self.assertTrue(c.verify_store(self.store)["valid"])

    def test_verifier_reconstructs_first_forecast_vintage(self):
        f = self.seed()
        self.provider.forecast = 999
        self.cycle()
        captures = c.records(self.store / "captures")
        later = captures[-1]
        reference = sorted((self.store / "captures").glob("*.json"))[-1]
        later_receipt = c.parse(later["received_at"])
        replacement = {**f, "value": 999, "raw_sha256": later["raw_sha256"],
                       "capture_record": "captures/" + reference.name,
                       "issued_at": later["received_at"], "received_at": later["received_at"],
                       "exact_lead_seconds": (c.parse(f["target_start"]) - later_receipt).total_seconds()}
        (self.store / "forecasts" / (f["forecast_id"] + ".json")).write_bytes(c.bytes_json(replacement))
        result = c.verify_store(self.store)
        self.assertFalse(result["valid"])
        self.assertTrue(any("first valid captured forecast" in e for e in result["errors"]))


if __name__ == "__main__":
    unittest.main(verbosity=2)
