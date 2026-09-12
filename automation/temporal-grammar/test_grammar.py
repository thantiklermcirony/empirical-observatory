"""Focused contract tests; no domain solver or producer fixtures imported."""

from copy import deepcopy
import unittest

from grammar import compile_inquiry, digest, FIELDS


STOCK = {"meaning": "reserve", "role": "stock", "unit": "mM", "shape": "scalar"}
BOUND = {"meaning": "future clearance ceiling", "role": "bound", "unit": "mM", "shape": "scalar"}


def capability(cid="budget", verb="bound", kind="derive", source=STOCK, output=BOUND):
    port = {k: deepcopy(v) for k, v in source.items() if k != "unit"}
    port["units"] = [source["unit"]]
    return {"id": cid, "verb": verb, "kind": kind, "jurisdictions": ["synthetic-resource"],
            "inputs": {"source": port}, "output": deepcopy(output), "premises": ["accounting"],
            "clock": {"kind": "physical", "unit": "min"}, "owner": "biology",
            "scope": "declared resource bound", "result_kind": "formal_under_premises", "enabled": True}


def operation(sid="budget", verb="bound", kind="derive", source="reserve"):
    return {"id": sid, "verb": verb, "kind": kind, "inputs": {"source": source}}


def inquiry(operations=None):
    q = {k: {} for k in FIELDS}
    q.update(identity={"id": "case", "revision": 1},
             system={"jurisdiction": "synthetic-resource"},
             observer={"preparation_id": "prep-1", "clock": {"kind": "physical", "unit": "min"}},
             quantities=[{"id": "reserve", **deepcopy(STOCK), "value": "0.5"}],
             operations=operations if operations is not None else [operation()],
             premises=[{"id": "accounting", "status": "assumed"}])
    return q


def compile_case(q=None, caps=None):
    return compile_inquiry(q if q is not None else inquiry(),
                           {"capabilities": caps if caps is not None else [capability()]})


def codes(step):
    return {i["code"] for i in step["issues"]}


class GrammarTests(unittest.TestCase):
    def test_digest_stable_json_and_order_sensitive(self):
        self.assertEqual(digest({"b": 2, "a": [1, 2]}), digest({"a": [1, 2], "b": 2}))
        self.assertNotEqual(digest([1, 2]), digest([2, 1]))
        self.assertNotEqual(digest("0"), digest(0))

    def test_digest_rejects_nonfinite_and_non_json(self):
        cycle = []; cycle.append(cycle)
        for value in ({"x": float("nan")}, float("inf"), {1: "bad"}, (1, 2), cycle):
            with self.subTest(value_type=type(value).__name__), self.assertRaises(ValueError):
                digest(value)

    def test_ready_binding_contains_refs_only_and_inputs_unchanged(self):
        q, cats = inquiry(), {"capabilities": [capability()]}
        before = deepcopy((q, cats))
        result = compile_inquiry(q, cats)
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["input_sha256"], digest(q))
        self.assertEqual(result["steps"][0]["bindings"], {"source": "reserve"})
        self.assertEqual(result["steps"][0]["capability_id"], "budget")
        self.assertEqual((q, cats), before)

    def test_fourteen_fields_and_no_inquiry_capability_injection(self):
        for change in (lambda q: q.pop("contrast"), lambda q: q.update(capabilities=[]),
                       lambda q: q["operations"][0].update(command=["anything"])):
            q = inquiry(); change(q)
            with self.assertRaises(ValueError): compile_case(q)

    def test_revision_is_positive_integer(self):
        for revision in (0, -1, True, 1.5, "1"):
            q = inquiry(); q["identity"]["revision"] = revision
            with self.subTest(revision=revision), self.assertRaises(ValueError): compile_case(q)

    def test_duplicate_record_ids_are_errors(self):
        for field in ("quantities", "premises", "operations"):
            q = inquiry(); q[field].append(deepcopy(q[field][0]))
            with self.subTest(field=field), self.assertRaises(ValueError): compile_case(q)
        with self.assertRaises(ValueError): compile_case(caps=[capability(), capability()])

    def test_missing_value_blocks_only_consumed_quantities(self):
        for value in ("absent", None):
            q = inquiry()
            if value == "absent": q["quantities"][0].pop("value")
            else: q["quantities"][0]["value"] = None
            step = compile_case(q)["steps"][0]
            self.assertIn("missing_value", codes(step))
            self.assertIsNone(step["capability_id"])
            self.assertEqual(step["bindings"], {})
        q = inquiry()
        q["quantities"].append({"id": "unused", **STOCK, "preparation_id": "other"})
        self.assertEqual(compile_case(q)["status"], "ready")
        q["quantities"][0]["value"] = 0
        self.assertEqual(compile_case(q)["status"], "ready")

    def test_extra_ports_block_instead_of_ignoring_intent(self):
        q = inquiry(); q["operations"][0]["inputs"]["extra"] = "reserve"
        step = compile_case(q)["steps"][0]
        self.assertIn("extra_input_port", codes(step))
        self.assertEqual(step["bindings"], {})

    def test_semantics_units_shape_and_requested_trajectory(self):
        for key, value in (("meaning", "signal"), ("role", "ratio"), ("unit", "uM"), ("shape", "trajectory")):
            q = inquiry(); q["quantities"][0][key] = value
            self.assertIn(f"input_{key}_mismatch", codes(compile_case(q)["steps"][0]))
        q = inquiry(); q["operations"][0]["requested_output"] = dict(BOUND, role="trajectory", shape="series")
        step = compile_case(q)["steps"][0]
        self.assertIn("requested_output_mismatch", codes(step))
        self.assertIsNone(step["capability_id"])

    def test_clock_and_preparation_are_not_interchangeable(self):
        q = inquiry(); q["observer"]["clock"]["kind"] = "spatial"
        self.assertIn("clock_mismatch", codes(compile_case(q)["steps"][0]))
        q = inquiry(); q["quantities"][0]["preparation_id"] = "different"
        self.assertIn("preparation_mismatch", codes(compile_case(q)["steps"][0]))

    def test_contextual_observation_requires_exact_preparation_and_time(self):
        c = capability(); c["inputs"]["source"]["contextual"] = True
        c["observation_time"] = {"value": "0", "unit": "min"}
        q = inquiry(); q["observer"]["time"] = deepcopy(c["observation_time"])
        q["quantities"][0].update(preparation_id="prep-1", time=deepcopy(c["observation_time"]))
        self.assertEqual(compile_case(q, [c])["status"], "ready")
        changes = [lambda x: x["observer"].pop("time"),
                   lambda x: x["quantities"][0].pop("time"),
                   lambda x: x["quantities"][0].pop("preparation_id"),
                   lambda x: x["quantities"][0]["time"].update(unit="s"),
                   lambda x: x["quantities"][0]["time"].update(value=0),
                   lambda x: x["observer"]["time"].update(value="1")]
        for change in changes:
            bad = deepcopy(q); change(bad)
            step = compile_case(bad, [c])["steps"][0]
            self.assertEqual(step["status"], "blocked")
            self.assertEqual(step["bindings"], {})
        later = deepcopy(q)
        later["observer"]["time"]["value"] = "1"
        later["quantities"][0]["time"]["value"] = "1"
        self.assertIn("observation_time_not_supported", codes(compile_case(later, [c])["steps"][0]))

    def test_premise_gate_and_allowed_statuses(self):
        for status in ("assumed", "observed", "derived", "imported_theorem"):
            q = inquiry(); q["premises"][0]["status"] = status
            self.assertEqual(compile_case(q)["status"], "ready")
        for status in ("missing", "rejected", "accepted", "producer_claim"):
            q = inquiry(); q["premises"][0]["status"] = status
            self.assertIn("premise_unavailable", codes(compile_case(q)["steps"][0]))
        q = inquiry(); q["premises"] = []
        self.assertEqual(compile_case(q)["status"], "blocked")

    def test_order_is_exact_and_physical_chain_ignores_derive_gaps(self):
        q = inquiry([operation("z", "read", "instrument"), operation("missing", "quantum", "derive"),
                     operation("a", "wait", "wait"), operation("m", "read", "instrument")])
        read = capability("read", "read", "instrument", output=STOCK)
        wait = capability("wait", "wait", "wait", output=STOCK)
        result = compile_case(q, [read, wait])
        self.assertEqual([s["id"] for s in result["word"]], ["z", "missing", "a", "m"])
        self.assertEqual([s["status"] for s in result["steps"]], ["ready", "blocked", "ready", "ready"])
        self.assertEqual(result["steps"][2]["depends_on"], ["z"])
        self.assertEqual(result["steps"][3]["depends_on"], ["a"])
        self.assertEqual(result["status"], "partial")

    def test_state_word_requires_immediately_preceding_state_output(self):
        state = dict(STOCK, meaning="current state", role="state")
        cap = capability("advance", "advance", "action", source=state, output=state)
        q = inquiry([operation("a", "advance", "action"),
                     operation("b", "advance", "action", {"step": "a"}),
                     operation("c", "advance", "action", {"step": "b"})])
        q["quantities"][0].update(state)
        self.assertEqual(compile_case(q, [cap])["status"], "ready")
        for index, reference, required in ((1, "reserve", "a"), (2, "reserve", "b"),
                                            (2, {"step": "a"}, "b")):
            with self.subTest(index=index, reference=reference):
                bad = deepcopy(q)
                bad["operations"][index]["inputs"]["source"] = reference
                result = compile_case(bad, [cap])
                step = result["steps"][index]
                self.assertIn("state_lineage_mismatch", codes(step))
                self.assertEqual(step["bindings"], {})
                self.assertIsNone(step["capability_id"])
                self.assertEqual(next(x for x in step["issues"] if x["code"] == "state_lineage_mismatch")["required_step"], required)
                if index == 1:
                    self.assertIn("dependency_blocked", codes(result["steps"][2]))

    def test_derive_does_not_reset_physical_state_lineage(self):
        state = dict(STOCK, meaning="current state", role="state")
        physical = capability("advance", "advance", "action", source=state, output=state)
        derivation = capability("inspect", "inspect", "derive", source=state, output=state)
        q = inquiry([operation("a", "advance", "action"),
                     operation("d", "inspect", "derive"),
                     operation("b", "advance", "action", {"step": "a"})])
        q["quantities"][0].update(state)
        self.assertEqual(compile_case(q, [physical, derivation])["status"], "ready")
        q["operations"][2]["inputs"]["source"] = {"step": "d"}
        self.assertIn("state_lineage_mismatch", codes(compile_case(q, [physical, derivation])["steps"][2]))

    def test_configured_action_examples_bind_exact_models_and_lineage(self):
        from configure import catalogue
        from examples import actions, resource
        caps = {"capabilities": [{k: v for k, v in cap.items() if k != "source_groups"} for cap in catalogue()]}
        for q in (actions(), actions(True), resource(), resource(True)):
            with self.subTest(identity=q["identity"]):
                result = compile_inquiry(q, caps)
                self.assertEqual(result["status"], "ready")
                self.assertEqual(q["mechanism"]["models"], {step["id"]: step["capability_id"] for step in result["steps"]})
        q = actions(); q["operations"][1]["inputs"]["state"] = "x"
        self.assertIn("state_lineage_mismatch", codes(compile_inquiry(q, caps)["steps"][1]))

    def test_mechanism_defaults_or_complete_exact_mapping(self):
        q = inquiry([operation("first"), operation("second")])
        self.assertEqual(compile_case(q)["status"], "ready")
        q["mechanism"] = {"models": {"first": "budget", "second": "budget"}}
        self.assertEqual(compile_case(q)["status"], "ready")
        before = deepcopy(q)
        compile_case(q)
        self.assertEqual(q, before)

    def test_unsupported_mechanism_declarations_block_the_entire_word(self):
        declarations = [
            {"formula": "x-u"}, {"models": {}, "formula": "x-u"},
            {"models": []}, {"models": {"first": "budget"}},
            {"models": {"first": "budget", "second": "budget", "ghost": "budget"}},
            {"models": {"first": "budget", "second": "not-registered"}},
            {"models": {"first": "budget", "second": True}},
        ]
        for mechanism in declarations:
            with self.subTest(mechanism=mechanism):
                q = inquiry([operation("first"), operation("second")])
                q["mechanism"] = mechanism
                result = compile_case(q)
                self.assertEqual(result["status"], "blocked")
                self.assertTrue(result["issues"])
                for step in result["steps"]:
                    self.assertIn("unsupported_mechanism", codes(step))
                    self.assertIsNone(step["capability_id"])
                    self.assertEqual(step["bindings"], {})

    def test_known_but_different_mechanism_blocks_earlier_steps_too(self):
        q = inquiry([operation("first"), operation("second")])
        q["mechanism"] = {"models": {"first": "budget", "second": "other"}}
        result = compile_case(q, [capability(), capability("other", "different")])
        self.assertEqual(result["status"], "blocked")
        for step in result["steps"]:
            self.assertIn("mechanism_mismatch", codes(step))
            self.assertEqual(step["bindings"], {})
        q["mechanism"]["models"]["second"] = "budget"
        q["operations"][1]["verb"] = "unknown"
        result = compile_case(q)
        self.assertEqual(result["status"], "blocked")
        self.assertIn("mechanism_mismatch", codes(result["steps"][0]))

    def test_nonempty_constraints_block_all_steps_without_interpretation(self):
        for constraint in ({"output_must_be_negative": True}, {"limit": "0"}):
            q = inquiry([operation("first"), operation("second")])
            q["constraints"] = constraint
            result = compile_case(q)
            self.assertEqual(result["status"], "blocked")
            for step in result["steps"]:
                self.assertIn("unsupported_constraints", codes(step))
                self.assertIsNone(step["capability_id"])
                self.assertEqual(step["bindings"], {})
        q = inquiry([]); q["constraints"] = {"limit": "0"}
        self.assertEqual(compile_case(q)["status"], "blocked")

    def test_mechanism_and_constraints_keep_strict_object_schema(self):
        for field in ("mechanism", "constraints"):
            for bad in (None, [], "x-u", False):
                q = inquiry(); q[field] = bad
                with self.subTest(field=field, bad=bad), self.assertRaises(ValueError):
                    compile_case(q)

    def test_explicit_time_opt_out_blocks_observer_and_consumed_quantity(self):
        c = capability(); c["allow_observation_time"] = False
        self.assertEqual(compile_case(caps=[c])["status"], "ready")
        for observer_time, quantity_time in ((True, False), (False, True), (True, True)):
            q = inquiry(); time = {"value": "0", "unit": "min"}
            if observer_time: q["observer"]["time"] = time
            if quantity_time: q["quantities"][0]["time"] = time
            step = compile_case(q, [c])["steps"][0]
            self.assertEqual(step["status"], "blocked")
            self.assertEqual(step["bindings"], {})
            if observer_time: self.assertIn("observation_time_not_supported", codes(step))
            if quantity_time: self.assertIn("input_time_not_supported", codes(step))
            # Explicit or default true retains general-compiler compatibility.
            self.assertEqual(compile_case(q)["status"], "ready")
            self.assertEqual(compile_case(q, [dict(c, allow_observation_time=True)])["status"], "ready")
        q = inquiry(); q["quantities"].append({"id": "unused", **STOCK, "time": {"value": "100", "unit": "min"}})
        self.assertEqual(compile_case(q, [c])["status"], "ready")

    def test_quantum_catalogue_rejects_time_outside_its_native_protocol(self):
        from configure import catalogue
        c = next(cap for cap in catalogue() if cap["id"] == "quantum.reference.evolve")
        c.pop("source_groups")
        self.assertIs(c["allow_observation_time"], False)
        q = inquiry()
        q["system"]["jurisdiction"] = "quantum_reference_model"
        q["observer"]["clock"] = {"kind": "model", "unit": "model_time"}
        q["quantities"] = [{"id": "protocol", "meaning": "four_level_reference_protocol", "role": "mechanism",
                            "unit": "model_time", "shape": "object", "value": {"clock": {"units": "model_time", "end": 40, "points": 21}}}]
        q["operations"] = [{"id": "yields", "verb": "predict_yields", "kind": "derive", "inputs": {"protocol": "protocol"}}]
        q["premises"] = [{"id": pid, "status": "assumed"} for pid in c["premises"]]
        self.assertEqual(compile_case(q, [c])["status"], "ready")
        q["observer"]["time"] = {"value": "100", "unit": "model_time"}
        q["quantities"][0]["time"] = {"value": "0", "unit": "model_time"}
        step = compile_case(q, [c])["steps"][0]
        self.assertTrue({"input_time_not_supported", "observation_time_not_supported"} <= codes(step))
        self.assertEqual(step["bindings"], {})

    def test_unsupported_wait_blocks_later_physical_not_unrelated_derive(self):
        q = inquiry([operation("gap", "wait", "wait"), operation("read", "read", "instrument"), operation()])
        result = compile_case(q, [capability(), capability("read", "read", "instrument")])
        self.assertEqual([s["status"] for s in result["steps"]], ["blocked", "blocked", "ready"])
        self.assertIn("dependency_blocked", codes(result["steps"][1]))
        self.assertEqual(result["steps"][2]["depends_on"], [])

    def test_step_refs_check_types_and_propagate_transitive_premises(self):
        a = capability("read", "read", "instrument", output=STOCK)
        b = capability(); b["premises"] = ["target"]
        c = capability("compare", "compare", "compare", source=BOUND)
        c["premises"] = ["comparison"]
        q = inquiry([operation("a", "read", "instrument"), operation("b", source={"step": "a"}),
                     operation("c", "compare", "compare", {"step": "b"})])
        q["premises"] += [{"id": p, "status": "derived"} for p in ("target", "comparison")]
        result = compile_case(q, [a, b, c])
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["steps"][2]["premise_ids"], ["accounting", "target", "comparison"])
        self.assertEqual(result["steps"][2]["bindings"], {"source": {"step": "b"}})
        q["premises"][0]["status"] = "missing"
        result = compile_case(q, [a, b, c])
        self.assertEqual(result["status"], "blocked")
        self.assertIn("dependency_blocked", codes(result["steps"][2]))
        q = inquiry([operation("a"), operation("b", source={"step": "a"})])
        self.assertIn("input_meaning_mismatch", codes(compile_case(q)["steps"][1]))

    def test_declared_dependency_blocks_even_without_input_reference(self):
        q = inquiry([operation("unknown", "unknown"), operation()])
        q["operations"][1]["after"] = ["unknown"]
        self.assertEqual(compile_case(q)["status"], "blocked")

    def test_future_self_and_unknown_references_are_errors(self):
        for ref in ({"step": "budget"}, {"step": "later"}, "unknown", {"step": "x", "value": 1}):
            q = inquiry(); q["operations"][0]["inputs"]["source"] = ref
            with self.assertRaises(ValueError): compile_case(q)
        q = inquiry(); q["operations"][0]["after"] = ["later"]
        with self.assertRaises(ValueError): compile_case(q)

    def test_counts_pairs_or_other_compression_never_reorders_or_binds(self):
        for requested in ("counts", "pairs", "sort", None):
            q = inquiry(); q["execution"]["compression"] = requested
            result = compile_case(q)
            self.assertEqual(result["status"], "blocked")
            self.assertIn("compression_not_admitted", codes(result["steps"][0]))
            self.assertIsNone(result["steps"][0]["capability_id"])

    def test_disabled_unsupported_and_ambiguous_routes(self):
        c = capability(); c["enabled"] = False
        self.assertIn("capability_disabled", codes(compile_case(caps=[c])["steps"][0]))
        q = inquiry(); q["system"]["jurisdiction"] = "different"
        self.assertIn("unsupported_operation", codes(compile_case(q)["steps"][0]))
        with self.assertRaises(ValueError): compile_case(caps=[capability(), capability("duplicate-route")])

    def test_clock_and_availability_select_the_unique_admitted_route(self):
        disabled = capability("disabled"); disabled["enabled"] = False
        spatial = capability("spatial"); spatial["clock"]["kind"] = "spatial"
        missing = capability("missing"); missing["premises"] = ["unavailable"]
        result = compile_case(caps=[spatial, missing, disabled, capability()])
        self.assertEqual(result["steps"][0]["capability_id"], "budget")
        self.assertEqual(result["status"], "ready")

    def test_bad_catalogue_shapes_raise_valueerror(self):
        for change in (lambda c: c.update(enabled="true"),
                       lambda c: c.update(allow_observation_time="false"),
                       lambda c: c["inputs"]["source"].update(units=[{}]),
                       lambda c: c["inputs"]["source"].update(contextual="yes"),
                       lambda c: c.update(output=None)):
            c = capability(); change(c)
            with self.assertRaises(ValueError): compile_case(caps=[c])


if __name__ == "__main__":
    unittest.main()
