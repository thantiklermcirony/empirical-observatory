"""Pure, ordered inquiry compiler. It neither executes nor grants admission."""

from copy import deepcopy
import hashlib
import json
import math

FIELDS = frozenset("identity question system observer quantities operations constraints mechanism premises execution results contrast next_question provenance".split())
AVAILABLE = frozenset(("assumed", "observed", "derived", "imported_theorem"))
PHYSICAL = frozenset(("action", "wait", "instrument"))
KINDS = PHYSICAL | {"derive", "compare"}


def digest(value):
    """SHA256 of UTF-8, sorted-key, compact JSON; reject non-JSON/NaN values."""
    def check(item):
        if item is None or type(item) in (str, bool, int):
            return
        if type(item) is float:
            if not math.isfinite(item):
                raise ValueError("Nonfinite JSON number")
            return
        if type(item) is list:
            for child in item:
                check(child)
            return
        if type(item) is dict and all(type(k) is str for k in item):
            for child in item.values():
                check(child)
            return
        raise ValueError("Expected JSON values and string object keys")
    try:
        check(value)
        raw = json.dumps(value, sort_keys=True, separators=(",", ":"),
                         ensure_ascii=False, allow_nan=False).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()
    except (TypeError, UnicodeError, RecursionError) as exc:
        raise ValueError("Invalid canonical JSON input") from exc


def _object(value, required, optional=(), label="object"):
    if type(value) is not dict or set(value) != set(required) | (set(value) & set(optional)):
        raise ValueError(f"Invalid {label} fields; required={sorted(required)}, optional={sorted(optional)}")


def _text(value, label):
    if type(value) is not str or not value.strip():
        raise ValueError(f"{label} must be a nonempty string")


def _list(value, label):
    if type(value) is not list:
        raise ValueError(f"{label} must be a list")


def _unique_records(records, label):
    _list(records, label)
    result = {}
    for record in records:
        if type(record) is not dict:
            raise ValueError(f"{label} records must be objects")
        _text(record.get("id"), f"{label}.id")
        if record["id"] in result:
            raise ValueError(f"Duplicate {label} id: {record['id']}")
        result[record["id"]] = record
    return result


def _contract(value, *, input_port=False):
    unit_key = "units" if input_port else "unit"
    _object(value, ("meaning", "role", unit_key, "shape"),
            ("contextual",) if input_port else (), "quantity contract")
    if "contextual" in value and type(value["contextual"]) is not bool:
        raise ValueError("contextual must be a boolean")
    for key in ("meaning", "role"):
        _text(value[key], key)
    if input_port:
        _list(value["units"], "units")
        for unit in value["units"]:
            _text(unit, "unit")
        if not value["units"] or len(set(value["units"])) != len(value["units"]):
            raise ValueError("units must be nonempty and unique")
    else:
        _text(value["unit"], "unit")
    if value["shape"] is None:
        raise ValueError("shape must be explicit")


def _clock(clock):
    _object(clock, ("kind", "unit"), label="clock")
    _text(clock["kind"], "clock.kind")
    _text(clock["unit"], "clock.unit")


def _time(value):
    _object(value, ("value", "unit"), label="time")
    _text(value["unit"], "time.unit")
    if type(value["value"]) not in (str, int, float) or value["value"] == "":
        raise ValueError("time.value must be explicit numeric data")


def _issue(code, message, **context):
    return {"code": code, "message": message, **context}


def _union(*groups):
    return list(dict.fromkeys(x for group in groups for x in group))


def compile_inquiry(inquiry: dict, catalogue: dict) -> dict:
    """Compile trusted capability choices; raise ValueError on schema ambiguity.

    Shapes are opaque JSON contracts compared exactly. Missing/null quantity
    values block only consumers. No sorting, inference of units, or compression.
    """
    input_hash = digest(inquiry)
    digest(catalogue)
    _object(inquiry, FIELDS, label="inquiry (exactly 14 keys)")
    _object(inquiry["identity"], ("id", "revision"), label="identity")
    identity = inquiry["identity"]
    _text(identity["id"], "identity.id")
    if type(identity["revision"]) is not int or identity["revision"] < 1:
        raise ValueError("revision must be an integer >= 1")
    _object(inquiry["system"], ("jurisdiction",), label="system")
    _text(inquiry["system"]["jurisdiction"], "system.jurisdiction")
    observer = inquiry["observer"]
    _object(observer, ("preparation_id", "clock"), ("time",), "observer")
    _text(observer["preparation_id"], "observer.preparation_id")
    _clock(observer["clock"])
    if "time" in observer:
        _time(observer["time"])
    if type(inquiry["execution"]) is not dict:
        raise ValueError("execution must be an object")
    compression_block = inquiry["execution"].get("compression", "ordered") != "ordered"

    quantities = _unique_records(inquiry["quantities"], "quantities")
    for q in quantities.values():
        _object(q, ("id", "meaning", "role", "unit", "shape"),
                ("value", "preparation_id", "time"), "quantity")
        _contract({k: q[k] for k in ("meaning", "role", "unit", "shape")})
        if "preparation_id" in q:
            _text(q["preparation_id"], "quantity.preparation_id")
        if "time" in q:
            _time(q["time"])
    premises = _unique_records(inquiry["premises"], "premises")
    for premise in premises.values():
        _object(premise, ("id", "status"), label="premise")
        _text(premise["status"], "premise.status")
    operations = _unique_records(inquiry["operations"], "operations")
    # Scientific declarations have a deliberately small executable language.
    # Unsupported declarations block the whole word, including earlier steps.
    mechanism, constraints = inquiry["mechanism"], inquiry["constraints"]
    if type(mechanism) is not dict or type(constraints) is not dict:
        raise ValueError("mechanism and constraints must be objects")
    declaration_issues, declared_models = [], None
    if mechanism:
        if (set(mechanism) != {"models"} or type(mechanism["models"]) is not dict
                or any(type(value) is not str or not value.strip()
                       for value in mechanism["models"].values())):
            declaration_issues.append(_issue("unsupported_mechanism", "Use an empty mechanism or an exact models mapping from every step ID to its capability ID"))
        else:
            declared_models = mechanism["models"]
            if set(declared_models) != set(operations):
                declaration_issues.append(_issue("unsupported_mechanism", "Mechanism models must name exactly the declared steps",
                    unknown_steps=sorted(set(declared_models) - set(operations)),
                    missing_steps=sorted(set(operations) - set(declared_models))))
    if constraints:
        declaration_issues.append(_issue("unsupported_constraints", "Only an empty constraints object is supported; no additional constraint interpretation is admitted"))
    _object(catalogue, ("capabilities",), label="catalogue")
    capabilities = _unique_records(catalogue["capabilities"], "capabilities")
    for cap in capabilities.values():
        _object(cap, ("id", "verb", "kind", "jurisdictions", "inputs", "output",
                      "premises", "clock", "owner", "scope", "result_kind", "enabled"),
                ("observation_time", "allow_observation_time"), "capability")
        for key in ("verb", "kind", "owner", "scope", "result_kind"):
            _text(cap[key], f"capability.{key}")
        if cap["kind"] not in KINDS or type(cap["enabled"]) is not bool:
            raise ValueError("Invalid capability kind or enabled flag")
        if "allow_observation_time" in cap and type(cap["allow_observation_time"]) is not bool:
            raise ValueError("allow_observation_time must be a boolean")
        for key in ("jurisdictions", "premises"):
            _list(cap[key], key)
            for item in cap[key]:
                _text(item, key)
            if len(cap[key]) != len(set(cap[key])):
                raise ValueError(f"Duplicate capability {key}")
        if not cap["jurisdictions"] or type(cap["inputs"]) is not dict:
            raise ValueError("Capability needs jurisdictions and input port object")
        for port, contract in cap["inputs"].items():
            _text(port, "port")
            _contract(contract, input_port=True)
        _contract(cap["output"])
        _clock(cap["clock"])
        if "observation_time" in cap:
            _time(cap["observation_time"])

    if declared_models is not None:
        for step_id, capability_id in declared_models.items():
            if capability_id not in capabilities:
                declaration_issues.append(_issue("unsupported_mechanism", "Mechanism names an unregistered capability",
                    step_id=step_id, capability_id=capability_id))

    steps, done, word = [], {}, []
    last_physical = None
    last_physical_state = None
    for op in operations.values():
        _object(op, ("id", "verb", "kind", "inputs"),
                ("after", "requested_output"), "operation")
        _text(op["verb"], "operation.verb")
        _text(op["kind"], "operation.kind")
        if op["kind"] not in KINDS or type(op["inputs"]) is not dict:
            raise ValueError("Invalid operation kind or inputs")
        if "requested_output" in op:
            _contract(op["requested_output"])
        after = op.get("after", [])
        _list(after, "after")
        for dep in after:
            _text(dep, "after reference")
            if dep not in done:
                raise ValueError(f"after must reference an earlier step: {dep}")
        if len(after) != len(set(after)):
            raise ValueError("Duplicate after dependency")
        refs, source_contracts = [], {}
        common_issues = []
        for port, ref in op["inputs"].items():
            _text(port, "input port")
            if type(ref) is str:
                if ref not in quantities:
                    raise ValueError(f"Unknown quantity reference: {ref}")
                q = quantities[ref]
                source_contracts[port] = q
                if q.get("value") is None:
                    common_issues.append(_issue("missing_value", "Required input value is missing", port=port, quantity_id=ref))
                if q.get("preparation_id", observer["preparation_id"]) != observer["preparation_id"]:
                    common_issues.append(_issue("preparation_mismatch", "Input belongs to a different preparation", port=port, quantity_id=ref))
            else:
                _object(ref, ("step",), label="step input reference")
                _text(ref["step"], "step reference")
                if ref["step"] not in done:
                    raise ValueError(f"Input must reference an earlier step: {ref['step']}")
                refs.append(ref["step"])
                source_contracts[port] = done[ref["step"]]["output_contract"]
        dependencies = _union(after, refs,
                              [last_physical] if op["kind"] in PHYSICAL and last_physical else [])
        inherited = _union(*(done[d]["premise_ids"] for d in dependencies))
        for dep in dependencies:
            if done[dep]["status"] != "ready":
                common_issues.append(_issue("dependency_blocked", "Required earlier step is blocked", dependency_id=dep))
        if compression_block:
            common_issues.append(_issue("compression_not_admitted", "Only ordered execution is admitted; counts or pairs are not a closure certificate"))

        candidates = [c for c in capabilities.values()
                      if c["verb"] == op["verb"] and c["kind"] == op["kind"]
                      and inquiry["system"]["jurisdiction"] in c["jurisdictions"]]
        evaluated = []
        for cap in candidates:
            issues = []
            supplied, required = set(op["inputs"]), set(cap["inputs"])
            for port in sorted(required - supplied):
                issues.append(_issue("missing_input_port", "Required input port not supplied", port=port))
            for port in sorted(supplied - required):
                issues.append(_issue("extra_input_port", "Undeclared input would be ignored", port=port))
            for port in sorted(required & supplied):
                actual, expected = source_contracts[port], cap["inputs"][port]
                if (op["kind"] in PHYSICAL and expected["role"] == "state"
                        and last_physical_state is not None
                        and op["inputs"][port] != {"step": last_physical_state}):
                    issues.append(_issue("state_lineage_mismatch", "A state-consuming physical operation must use the preceding physical state output; no reset or branch is inferred",
                        port=port, required_step=last_physical_state))
                if actual is None:
                    issues.append(_issue("output_contract_unavailable", "Earlier step has no unique output contract", port=port))
                    continue
                for key in ("meaning", "role", "shape"):
                    if digest(actual[key]) != digest(expected[key]):
                        issues.append(_issue(f"input_{key}_mismatch", f"Input {key} does not match capability", port=port))
                if actual["unit"] not in expected["units"]:
                    issues.append(_issue("input_unit_mismatch", "Input unit is not admitted; no conversion inferred", port=port))
                if not cap.get("allow_observation_time", True) and "time" in actual:
                    issues.append(_issue("input_time_not_supported", "This capability does not admit an explicit observation time on its required input", port=port))
                if expected.get("contextual"):
                    # A step reference has no observation provenance in its output
                    # contract. Do not silently invent preparation or acquisition time.
                    if actual.get("preparation_id") != observer["preparation_id"]:
                        issues.append(_issue("context_preparation_missing_or_mismatched", "Contextual input requires the declared preparation", port=port))
                    if ("time" not in observer or "time" not in actual
                            or digest(actual["time"]) != digest(observer["time"])
                            or actual["time"]["unit"] != observer["clock"]["unit"]):
                        issues.append(_issue("context_time_missing_or_mismatched", "Contextual input requires the exact declared observation time and clock unit", port=port))
            if "requested_output" in op and digest(op["requested_output"]) != digest(cap["output"]):
                issues.append(_issue("requested_output_mismatch", "Capability does not return the requested meaning, role, unit and shape"))
            if not cap["enabled"]:
                issues.append(_issue("capability_disabled", "Trusted capability is disabled"))
            if cap["clock"] != observer["clock"]:
                issues.append(_issue("clock_mismatch", "Capability and observer clocks differ"))
            if not cap.get("allow_observation_time", True) and "time" in observer:
                issues.append(_issue("observation_time_not_supported", "This capability does not admit an explicit observer time; its native protocol owns the clock grid"))
            if "observation_time" in cap and ("time" not in observer or digest(cap["observation_time"]) != digest(observer["time"])):
                issues.append(_issue("observation_time_not_supported", "Capability does not support the declared observation time"))
            for pid in cap["premises"]:
                if premises.get(pid, {}).get("status") not in AVAILABLE:
                    issues.append(_issue("premise_unavailable", "Required premise is absent or unavailable", premise_id=pid))
            evaluated.append((cap, issues))
        compatible = [(c, e) for c, e in evaluated if not e]
        # Select only an enabled, context-compatible route with available premises.
        if len(compatible) > 1:
            raise ValueError(f"Ambiguous capability routing for step {op['id']}")
        selected = compatible[0] if compatible else evaluated[0] if len(evaluated) == 1 else None
        issues = list(common_issues)
        if selected:
            cap, mismatch = selected
            if declared_models is not None and declared_models.get(op["id"]) != cap["id"]:
                declaration_issues.append(_issue("mechanism_mismatch", "Declared mechanism does not match the selected capability",
                    step_id=op["id"], declared_capability_id=declared_models.get(op["id"]), selected_capability_id=cap["id"]))
            issues.extend(mismatch)
            premise_ids = _union(inherited, cap["premises"])
            output = deepcopy(cap["output"])
            owner = cap["owner"]
        else:
            cap, output, owner = None, None, None
            if declared_models is not None and op["id"] in declared_models:
                declaration_issues.append(_issue("mechanism_mismatch", "Declared mechanism has no uniquely selected capability for this step",
                    step_id=op["id"], declared_capability_id=declared_models[op["id"]], selected_capability_id=None))
            premise_ids = inherited
            issues.append(_issue("unsupported_operation", "No unique compatible capability for this verb, kind, jurisdiction and inputs"))
            for candidate, mismatch in evaluated:
                issues.extend(dict(issue, candidate_id=candidate["id"]) for issue in mismatch)
        ready = not issues
        step = {"id": op["id"], "status": "ready" if ready else "blocked",
                "capability_id": cap["id"] if ready else None, "owner": owner,
                "bindings": deepcopy(op["inputs"]) if ready else {},
                "depends_on": dependencies, "premise_ids": premise_ids,
                "issues": issues, "output_contract": output}
        steps.append(step)
        done[op["id"]] = step
        word.append({k: op[k] for k in ("id", "verb", "kind")})
        if op["kind"] in PHYSICAL:
            last_physical = op["id"]
            if output is not None and output["role"] == "state":
                last_physical_state = op["id"]
    if declaration_issues:
        for step in steps:
            step.update(status="blocked", capability_id=None, bindings={})
            step["issues"].extend(deepcopy(declaration_issues))
    count = sum(s["status"] == "ready" for s in steps)
    status = "blocked" if declaration_issues or compression_block or (steps and count == 0) else "ready" if count == len(steps) else "partial"
    return {"inquiry_id": identity["id"], "revision": identity["revision"],
            "input_sha256": input_hash, "word": word, "steps": steps, "status": status,
            "issues": deepcopy(declaration_issues)}
