"""Lossless-in-meaning adapter and pre-design eligibility audit; no model fitting.

Input: Luciano et al. Figshare25125587 v1 data.zip, CC BY4.0.
Python3.10+, standard library only. Empty CSV cells are missing, never zero.
"""

from __future__ import annotations

import argparse
import collections
import csv
import datetime as dt
import hashlib
import io
import json
import math
from pathlib import Path
import re
import statistics
import zipfile


EXPECTED_MD5 = "df606cae4bf3bc65cb64f85cda2f6c96"
DATA_MEMBER = "data/fragility_longitudinal_mpd.csv"
ID_CORRECTIONS = {"DO-AL-0097": "DO-AL-0105"}
STATIC_FIELDS = (
    "id", "sex", "strain", "diet", "date_born", "date_exit",
    "exit_reason", "has_clinical_record",
)
ORDINAL_FIELDS = (
    "breathing_rate_depth", "coat_condition", "piloerection", "dermatitis",
    "pallor_and_or_cyanosis", "kyphosis", "hunched", "body_condition",
    "eye_discharge_eyelid_inflammation", "changes_to_the_globe",
    "response_to_analgesic", "peri_retro_orbital_swelling", "nasal_discharge",
    "rectal_prolapse", "vaginal_uterine_prolapse", "diarrhea", "tail_stiffening",
    "vestibular_disturbance", "gait_disorders", "tremor", "activity",
    "response_to_external_stimuli", "paralysis", "tumors", "distended_abdomen",
    "urine", "dehydration_reduced_skin_turgor", "malocclusions",
    "head_piloerection", "thoracic_mass",
)
VISIT_FIELDS = (
    "body_weight", "temperature", *ORDINAL_FIELDS,
    "date_due", "collection_date", "collected_by_anon",
)
EXIT_CLASSES = {
    "FD": "found_dead", "ES": "euthanized_sick", "RE": "requested_euthanasia",
    "FTR": "failed_to_recover", "MSG": "missing", "DC": "discarded",
    "NA": "unknown", "": "unknown",
}


def nullable(value):
    return None if value is None or str(value).strip() in ("", "NA", "NaN") else str(value)


def parse_date(value):
    value = nullable(value)
    return None if value is None else dt.date.fromisoformat(value)


def parse_number(value):
    value = nullable(value)
    if value is None:
        return None
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"Nonfinite measurement: {value}")
    return number


def iso(date):
    return None if date is None else date.isoformat()


def scores(values):
    """Published30-item score, plus explicit partial-observation bounds.

    Matches scripts/fragility_vecs.R and df_process() in fragility_funs.R.
    Physical measurements excluded; dermatitis.25/.75 map to.5; no inversion.
    Published sum removes NA. Additional bounds do not assume NA is healthy.
    """
    normalized = []
    for field in ORDINAL_FIELDS:
        value = values.get(field)
        if value is not None:
            allowed = (0, .25, .5, .75, 1) if field == "dermatitis" else (0, .5, 1)
            if value not in allowed:
                raise ValueError(f"Out-of-range ordinal value for {field}: {value}")
            if field == "dermatitis" and value in (.25, .75):
                value = .5
        normalized.append(value)
    observed = [v for v in normalized if v is not None]
    missing = len(ORDINAL_FIELDS) - len(observed)
    severe = sum(v == 1 for v in observed)
    upper = severe + missing
    state = "impaired" if severe >= 4 else "below_threshold" if upper < 4 else None
    return {
        "ordinal_observed": len(observed),
        "ordinal_missing": missing,
        "published_fgi_mean_observed": statistics.fmean(observed) if observed else None,
        "published_severe_sum_na_removed": severe,
        "severe_lower_bound": severe,
        "severe_upper_bound": upper,
        "severe_count_complete": severe if missing == 0 else None,
        "ge4_state_certain": state,
        "ge4_state_complete": state if missing == 0 else None,
    }


def adapt_rows(rows, fieldnames):
    """Accept wide rows and return animals, actual visits, undated measurements, audit."""
    if not rows:
        raise ValueError("Empty input")
    if any(f not in fieldnames for f in STATIC_FIELDS):
        raise ValueError("Required static fields missing")
    slot_map = collections.defaultdict(dict)
    for field in fieldnames:
        if field in STATIC_FIELDS:
            continue
        match = re.fullmatch(r"(.+)_(\d+)", field)
        if not match or match.group(1) not in VISIT_FIELDS:
            raise ValueError(f"Unexpected input field: {field}")
        prefix, suffix = match.groups()
        slot_map[int(suffix)][prefix] = field
    for slot, mapping in slot_map.items():
        if set(mapping) != set(VISIT_FIELDS):
            raise ValueError(f"Incomplete column schema in slot{slot}")
    animals, visits, undated = [], [], []
    seen_source, seen_canonical = set(), set()
    quality = {
        "empty_slots": 0, "planned_only_slots": 0, "dated_empty_assessments": [],
        "duplicate_dates": [], "nonincreasing_slot_dates": [],
        "assessments_after_exit": [], "invalid_physical_values": [],
        "identity_corrections": [],
    }
    for row_number, row in enumerate(rows, 2):
        source_id = nullable(row["id"])
        if source_id is None or source_id in seen_source:
            raise ValueError(f"Missing or duplicate source ID: {source_id}")
        canonical_id = ID_CORRECTIONS.get(source_id, source_id)
        if canonical_id in seen_canonical:
            raise ValueError(f"Canonical ID collision: {canonical_id}")
        seen_source.add(source_id)
        seen_canonical.add(canonical_id)
        if canonical_id != source_id:
            quality["identity_corrections"].append({"source_id": source_id, "animal_id": canonical_id})
        born, exited = parse_date(row["date_born"]), parse_date(row["date_exit"])
        if born is None:
            raise ValueError(f"Missing date_born for {source_id}")
        exit_raw = row["exit_reason"].strip()
        if exit_raw not in EXIT_CLASSES:
            raise ValueError(f"Unrecognized exit reason: {exit_raw}")
        animal = {
            "animal_id": canonical_id, "source_id": source_id,
            "source_csv_row": row_number, "sex": nullable(row["sex"]),
            "strain": nullable(row["strain"]), "diet": nullable(row["diet"]),
            "date_born": iso(born), "date_exit": iso(exited),
            "exit_reason_raw": exit_raw, "exit_class": EXIT_CLASSES[exit_raw],
            "published_exit_inclusion": exit_raw in ("FD", "ES", "RE"),
            "has_clinical_record_whole_record": nullable(row["has_clinical_record"]),
        }
        per_animal = []
        previous_slot_date = None
        for slot, mapping in sorted(slot_map.items()):
            raw = {prefix: nullable(row.get(field)) for prefix, field in mapping.items()}
            measured = any(raw[f] is not None for f in ("body_weight", "temperature", *ORDINAL_FIELDS))
            date = parse_date(raw["collection_date"])
            due = parse_date(raw["date_due"])
            values = {f: parse_number(raw[f]) for f in ("body_weight", "temperature", *ORDINAL_FIELDS)}
            common = {
                "animal_id": canonical_id, "source_id": source_id,
                "source_csv_row": row_number, "assessment_slot": slot,
                "sex": animal["sex"], "strain": animal["strain"], "diet": animal["diet"],
                "collection_date": iso(date), "date_due": iso(due),
                "assessor_id": raw["collected_by_anon"], **values,
            }
            if date is None:
                if measured or raw["collected_by_anon"] is not None:
                    undated.append(common)
                elif due is not None:
                    quality["planned_only_slots"] += 1
                else:
                    quality["empty_slots"] += 1
                continue
            if date < born:
                raise ValueError(f"Assessment before birth: {canonical_id}:{slot}")
            if not measured:
                quality["dated_empty_assessments"].append([canonical_id, slot])
            if previous_slot_date is not None and date <= previous_slot_date:
                quality["nonincreasing_slot_dates"].append([canonical_id, slot, iso(date)])
            previous_slot_date = date
            if exited is not None and date > exited:
                quality["assessments_after_exit"].append([canonical_id, slot, iso(date)])
            for field in ("body_weight", "temperature"):
                if values[field] is not None and values[field] <= 0:
                    quality["invalid_physical_values"].append([canonical_id, slot, field, values[field]])
            common["age_days"] = (date - born).days
            common.update(scores(values))
            per_animal.append(common)
        per_animal.sort(key=lambda v: (v["collection_date"], v["assessment_slot"]))
        dates = [parse_date(v["collection_date"]) for v in per_animal]
        for date, count in collections.Counter(dates).items():
            if count > 1:
                quality["duplicate_dates"].append([canonical_id, iso(date), count])
        for i, visit in enumerate(per_animal):
            visit["history_days_observed"] = (dates[i] - dates[0]).days
            visit["prior_assessments"] = i
            visit["days_since_previous_assessment"] = (dates[i] - dates[i - 1]).days if i else None
        chronology_problems = []
        if any(count > 1 for count in collections.Counter(dates).values()):
            chronology_problems.append("duplicate_observation_dates")
        if exited is not None and any(date > exited for date in dates):
            chronology_problems.append("observations_after_recorded_exit")
        animal["endpoint_chronology_valid"] = not chronology_problems
        animal["endpoint_chronology_flags"] = "|".join(chronology_problems)
        animal["first_observation_date"] = iso(dates[0]) if dates else None
        animal["last_observation_date"] = iso(dates[-1]) if dates else None
        animal["entry_age_days"] = (dates[0] - born).days if dates else None
        animal["actual_visit_count"] = len(dates)
        animals.append(animal)
        visits.extend(per_animal)
    quality["assessment_slots_per_animal_schema"] = len(slot_map)
    quality["undated_measurement_count"] = len(undated)
    return animals, visits, undated, quality


def quantiles(values):
    values = sorted(v for v in values if v is not None)
    if not values:
        return {"n": 0}
    def q(p):
        index = (len(values) - 1) * p
        lo, hi = math.floor(index), math.ceil(index)
        return values[lo] + (values[hi] - values[lo]) * (index - lo)
    return {"n": len(values), "min": values[0], "q25": q(.25), "median": q(.5), "q75": q(.75), "max": values[-1]}


def count_values(values):
    return dict(sorted(collections.Counter("MISSING" if v is None or v == "" else str(v) for v in values).items()))


def make_audit(animals, visits, quality, include_clean=True):
    groups = collections.defaultdict(list)
    for v in visits:
        groups[v["animal_id"]].append(v)
    animal_map = {a["animal_id"]: a for a in animals}
    included = {a["animal_id"] for a in animals if a["published_exit_inclusion"]}
    pairs = [(seq[i - 1], seq[i]) for seq in groups.values() for i in range(1, len(seq))]
    complete_pairs = [(a, b) for a, b in pairs if a["ge4_state_complete"] is not None and b["ge4_state_complete"] is not None]
    transitions = count_values(a["ge4_state_complete"] + " -> " + b["ge4_state_complete"] for a, b in complete_pairs)
    horizons = {}
    for horizon, tolerance in ((7, 2), (30, 3)):
        bucket = collections.Counter()
        strata = collections.defaultdict(collections.Counter)
        for seq in groups.values():
            for i, v in enumerate(seq):
                date = parse_date(v["collection_date"])
                animal = animal_map[v["animal_id"]]
                exit_date = parse_date(animal["date_exit"])
                delta_exit = (exit_date - date).days if exit_date else None
                future = [(n, (parse_date(n["collection_date"]) - date).days) for n in seq[i + 1:]]
                window = [(n, days) for n, days in future if abs(days - horizon) <= tolerance]
                target = min(window, key=lambda nd: (abs(nd[1] - horizon), nd[1], nd[0]["assessment_slot"])) if window else None
                if delta_exit is not None and 0 <= delta_exit <= horizon:
                    status = "exit_" + animal["exit_class"]
                elif target is not None:
                    status = "assessment_in_window_complete" if target[0]["ge4_state_complete"] else "assessment_in_window_incomplete"
                else:
                    status = "no_assessment_in_window_no_exit_by_horizon"
                bucket[status] += 1
                strata[animal["strain"] + "/" + animal["sex"] + "/" + animal["diet"]][status] += 1
                if target is not None:
                    bucket["window_available_total"] += 1
                    if target[1] == horizon:
                        bucket["exact_horizon_visit"] += 1
                    if v["history_days_observed"] >= 30:
                        bucket["window_with_30day_history"] += 1
                    if v["ge4_state_complete"] == "impaired" and target[0]["ge4_state_complete"] is not None:
                        bucket["impaired_complete_landmark_and_target"] += 1
                        if target[0]["ge4_state_complete"] == "below_threshold":
                            bucket["observed_threshold_recrossings"] += 1
                if delta_exit is not None and delta_exit == 0:
                    bucket["same_day_exit_landmarks_order_unknown"] += 1
        horizons[str(horizon)] = {
            "window_days": [horizon - tolerance, horizon + tolerance],
            "counts": dict(sorted(bucket.items())),
            "strata_status_counts": {k: dict(sorted(v.items())) for k, v in sorted(strata.items())},
            "warning": "Descriptive pre-design availability, not fixed-horizon labels: window observations are not exact horizon states; missing visits/exit mechanisms must be handled explicitly. No future date is a predictor.",
        }
    cohorts = []
    for stratum in sorted({(a["strain"], a["sex"], a["diet"]) for a in animals}):
        selected = [a for a in animals if (a["strain"], a["sex"], a["diet"]) == stratum]
        ids = {a["animal_id"] for a in selected}
        vv = [v for v in visits if v["animal_id"] in ids]
        cohorts.append({"strain": stratum[0], "sex": stratum[1], "diet": stratum[2], "animals": len(selected), "visits": len(vv), "entry_age_days": quantiles(a["entry_age_days"] for a in selected), "exit_reasons": count_values(a["exit_reason_raw"] for a in selected)})
    result = {
        "disclosure": "PRE-DESIGN DATA ELIGIBILITY INSPECTION: aggregate observation/score/transition availability was inspected before choosing a predictive protocol; no predictive model was fitted, tuned or evaluated.",
        "animals": len(animals), "unique_source_ids": len({a["source_id"] for a in animals}),
        "unique_canonical_ids": len(animal_map), "actual_visits": len(visits),
        "published_included_animals": len(included),
        "published_included_visits": sum(v["animal_id"] in included for v in visits),
        "visits_per_animal": quantiles(a["actual_visit_count"] for a in animals),
        "spacing_days": quantiles(v["days_since_previous_assessment"] for v in visits),
        "spacing_counts": count_values(v["days_since_previous_assessment"] for v in visits if v["days_since_previous_assessment"] is not None),
        "exit_reasons": count_values(a["exit_reason_raw"] for a in animals),
        "cohorts": cohorts, "assessors": count_values(v["assessor_id"] for v in visits),
        "missing_by_field": {f: sum(v[f] is None for v in visits) for f in VISIT_FIELDS if f not in ("date_due", "collection_date", "collected_by_anon")},
        "ordinal_missing_counts": count_values(v["ordinal_missing"] for v in visits),
        "certain_state_counts": count_values(v["ge4_state_certain"] for v in visits),
        "complete_state_counts": count_values(v["ge4_state_complete"] for v in visits),
        "consecutive_complete_transitions": transitions,
        "consecutive_pairs": len(pairs), "consecutive_complete_pairs": len(complete_pairs),
        "distinct_animals_with_observed_complete_recovery": len({a["animal_id"] for a, b in complete_pairs if a["ge4_state_complete"] == "impaired" and b["ge4_state_complete"] == "below_threshold"}),
        "landmarks_with_30day_observed_history": sum(v["history_days_observed"] >= 30 for v in visits),
        "horizon_eligibility": horizons,
        "quality": quality,
        "limitations": [
            "No cage identifier in released schema", "Observation begins late in life: delayed entry and survivor selection",
            "DO females with diets versus B6 both sexes with AL is a confounded cross-cohort comparison",
            "Clinical treatment details are incomplete; no causal recovery attribution",
            "Published mean and severe sum ignore missing items; strict and bounded states added separately",
            "True change times between visits are unobserved; threshold recrossing is not demonstrated biological rejuvenation",
        ],
    }
    if include_clean:
        valid_animals = [a for a in animals if a["endpoint_chronology_valid"]]
        valid_ids = {a["animal_id"] for a in valid_animals}
        valid_visits = [v for v in visits if v["animal_id"] in valid_ids]
        clean = make_audit(valid_animals, valid_visits, {}, include_clean=False)
        result["chronology_quarantine"] = {
            "animal_ids": [a["animal_id"] for a in animals if not a["endpoint_chronology_valid"]],
            "visits_removed_for_endpoint_planning": len(visits) - len(valid_visits),
            "reason": "Conservative whole-animal quarantine; preserve source dates and all raw exports. This is not a correction of author data.",
        }
        result["chronology_valid_subset"] = {k: clean[k] for k in (
            "animals", "actual_visits", "exit_reasons", "complete_state_counts",
            "consecutive_complete_transitions", "distinct_animals_with_observed_complete_recovery",
            "landmarks_with_30day_observed_history", "horizon_eligibility",
        )}
    return result


def write_csv(path, rows):
    with path.open("w", newline="", encoding="utf-8") as handle:
        if rows:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def run(source, output):
    data = source.read_bytes()
    md5 = hashlib.md5(data).hexdigest()
    if md5 != EXPECTED_MD5:
        raise ValueError("Input archive does not match pinned public v1 MD5")
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        text = archive.read(DATA_MEMBER).decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
        animals, visits, undated, quality = adapt_rows(rows, reader.fieldnames)
        codebook = archive.read("data/codebook.txt")
        readme = archive.read("data/readme.txt")
    output.mkdir(parents=True, exist_ok=True)
    write_csv(output / "animals.csv", animals)
    write_csv(output / "visits.csv", visits)
    write_csv(output / "undated_measurements.csv", undated)
    audit = make_audit(animals, visits, quality)
    write_json(output / "AUDIT.json", audit)
    provenance = {
        "source_doi": "10.6084/m9.figshare.25125587.v1",
        "source_url": "https://ndownloader.figshare.com/files/44351708",
        "source_license": "CC BY4.0", "source_bytes": len(data),
        "source_md5": md5, "source_sha256": hashlib.sha256(data).hexdigest(),
        "csv_member": DATA_MEMBER, "csv_sha256": hashlib.sha256(text.encode()).hexdigest(),
        "codebook_sha256": hashlib.sha256(codebook).hexdigest(),
        "source_readme_sha256": hashlib.sha256(readme).hexdigest(),
        "adapter_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "published_scoring_reference": "Original scripts.zip / scripts/fragility_vecs.R + fragility_funs.R df_process(); MD5b424fc781b51bdd86319d39f298b2a63",
        "outputs": {p.name: {"bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(output.glob("*")) if p.is_file() and p.name != "PROVENANCE.json"},
        "no_prediction": True,
    }
    write_json(output / "PROVENANCE.json", provenance)
    return audit


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    audit = run(args.source, args.output)
    print(json.dumps({k: audit[k] for k in ("animals", "actual_visits", "published_included_animals", "published_included_visits", "spacing_days", "distinct_animals_with_observed_complete_recovery")}, indent=2))
