# Temporal Grammar inquiry spine

This local Python tool runs an explicitly structured scientific question through the existing mathematics, resource-geometry and quantum-reference engines. It preserves the ordered action word, checks which operations can be connected, and returns computed results or named missing requirements in the same fourteen-field inquiry.

The organising idea comes from the programme's *Predictive Closure* V4: retain the histories and operations that can change an admitted future response; compress them only after the relevant equivalence has been established. This implementation preserves order. It does not infer predictive states, prove commutation, or compress histories into counts or pair parcels.

## What runs

| Registered capability | Actual calculation | Scientific scope |
|---|---|---|
| `math.projective.action` / `math.contraction.action` | Exact point evaluation through the pinned rational engine: `(x+u)/(1+x*u)` or `c*x`. | Declared dimensionless bounded scalar maps. No physical intervention is inferred from their names. |
| `biology.resource.ceiling` | Intersects the pinned geometry kernel's resource set with the supplied stock intervals and computes a necessary GPx resource ceiling. | Synthetic time-zero observations, fixed common volume, complete resource ledger and fixed supply term. A ceiling is not achieved clearance or survival. |
| `quantum.reference.evolve` | Runs and verifies the accepted four-level reference through its fixed adapter. | Conditional dimensionless model yields. No physical-time calibration, optical evidence or quantum-to-redox map is supplied. |

Accepted engine, geometry and quantum-reference sources keep their original bounded review scopes. The mathematics/quantum mappings have been exercised as local integration references. Neither parent acceptance nor a successful job automatically admits the whole routing implementation. Recovery Challenge and optical candidates are not activated by this catalogue; this distribution uses the quantum reference only.

The mathematics source intake is publicly available at [the exact published commit](https://github.com/thantiklermcirony/empirical-observatory/tree/5775fc734b86de7e81c3c1ecae14528cbb0dc08d/research/mathematics-integration-v0.1), with eight public files verified against their source bytes. That publication is separate from runtime integration review.

## The question is structured by the caller

An inquiry has exactly these top-level fields:

```text
identity question system observer quantities operations constraints mechanism
premises execution results contrast next_question provenance
```

The caller supplies the jurisdiction, preparation, clocks, quantity meanings/roles/units, values, ordered operations and premise statuses. `question.original` is retained for explanation; no language model or prose parser translates it into science. The trusted local catalogue supplies capability definitions and fixed worker paths. An inquiry cannot supply a command, module or replacement capability.

An operation binds named input ports to quantity IDs or to an earlier step's output. Matching checks verb, kind, jurisdiction, meaning, role, shape, units, requested output, context and required premises. Available premise labels are `assumed`, `observed`, `derived` and `imported_theorem`; labels are declarations, not authenticated scientific review. A missing input value, stock/rate mismatch, extra port, unsupported clock or request for a trajectory from a bound blocks the step. An irrelevant quantity elsewhere in the inquiry is not delivered to the worker.

Physical `action`, `wait` and `instrument` steps preserve chronological dependency. A state-consuming physical step must use the preceding physical state output; a reset or branch cannot be silently inferred from reuse of an old input. `derive` and `compare` use their declared/reference dependencies, so an unrelated quantum gap does not block resource arithmetic. A requested wait has no handler in the current catalogue: it remains a named gap and blocks its physical descendants.

Contextual resource inputs require the same explicit preparation and canonical time object as the observer. This capability accepts time `{"value":"0","unit":"min"}`. No time conversion is inferred. The whole-protocol quantum capability owns its native model-time grid and rejects additional observer/input timestamps. The resource adapter explicitly supports NADPH in mM or uM; the compiler does not infer general unit conversions.

Use an empty `mechanism`, or `{"models":{"step_id":"capability_id"}}` naming every declared step and its exact registered model. Other mechanism descriptions and nonempty `constraints` are unsupported by this small runtime. They must not be presented as equations or restrictions the worker actually evaluated. `execution.compression` must be `ordered`.

## An exact AB/BA example

For `x=1/4`, define alignment `A(x)=(x+1/3)/(1+x/3)` and contraction `B(x)=x/2`. In chronological notation:

| Word | State calculation | Final value |
|---|---|---|
| AB: align, then contract | `A(1/4)=7/13`, then `B(7/13)` | `7/26` |
| BA: contract, then align | `B(1/4)=1/8`, then `A(1/8)` | `11/25` |

These are actual exact engine calls with explicit step-output bindings. Their difference demonstrates order dependence of these stipulated maps. It does not establish a biological mechanism or identify a hidden physical state. Replacing AB by two independently evaluated actions on the original `x` would be a different calculation.

## Run locally

Use Python 3.12 with NumPy and SciPy installed in the selected environment. The reviewed adapter environment used Python 3.12.14; the quantum mapping records NumPy 2.5.3 and SciPy 1.18.1. These are recorded environments, not a general compatibility claim. The compiler alone uses the standard library.

The portable distribution places the Python files beside this README and carries the minimal reviewed source copies in `dependencies.zip`, bound by `DEPENDENCIES.json`. From that directory, run:

```sh
python -X utf8 -B demo.py --out runs/example
python -X utf8 -B -m unittest discover -s . -p "test_*.py" -v
```

The demonstration verifies the archive and member hashes, prepares `vendor/math`, `vendor/quantum` and `vendor/reference`, configures their paths, and runs AB, BA, resource, quantum, corrected-resource, withdrawn-premise and unresolved-link cases. Read `runs/example/summary.json` and each case's `inquiry.json`. The withdrawal and missing-link cases intentionally retain unresolved results. Choose a new output directory on each run; existing job directories are not overwritten.

For individual steps after preparing those dependencies, use the same Python interpreter throughout:

```sh
python -c "from pathlib import Path; Path('runs').mkdir(exist_ok=True)"
python -X utf8 -B configure.py --math-root vendor/math --quantum-root vendor/quantum --reference-root vendor/reference --out runs/config.json
python -X utf8 -B examples.py --out runs/inputs --quantum-root vendor/quantum
python -X utf8 -B run.py runs/inputs/actions-ab.json --config runs/config.json --out runs/actions-ab
python -X utf8 -B run.py runs/inputs/actions-ba.json --config runs/config.json --out runs/actions-ba
python -X utf8 -B run.py runs/inputs/resource.json --config runs/config.json --out runs/resource
python -X utf8 -B run.py runs/inputs/resource-corrected.json --config runs/config.json --out runs/resource-corrected --previous runs/resource/inquiry.json
python -X utf8 -B run.py runs/inputs/quantum.json --config runs/config.json --out runs/quantum
```

`configure.py` checks the pinned dependency files and binds the local interpreter and runtime sources. Its configuration contains local paths: regenerate it for a relocated, reviewed copy rather than treating it as a portable publication artifact. `examples.py` creates the five authored inputs shown above; its equivalent Python API is `write_examples(folder, quantum_root)`.

Compiler checks can run directly:

```sh
python -X utf8 -B -m unittest discover -s . -p test_grammar.py -v
```

Full integration tests use the prepared `vendor` tree, falling back to the sibling `adapter-review` tree in the development layout. To test separately located, hash-matched copies, set `OBSERVATORY_MATH_ROOT`, `OBSERVATORY_QUANTUM_ROOT` and `OBSERVATORY_REFERENCE_ROOT` to those directories before the test command. These are operator configuration, not request fields. `configure.py` also accepts the explicit root arguments shown above. The portable demonstration and all 50 tests were run from a separately extracted distribution copy on the recorded Windows environment.

## Results, changed sources and corrections

Each run writes `input.json`, `plan.json`, the local worker configuration, per-job inputs/native artifacts and `inquiry.json`. Only ready steps launch a fresh fixed Python worker with `shell=False`. The runner checks relevant source hashes before and after execution, binds the returned capability and job digest, and retains transitive premise/dependency IDs. Current limits include a 64 KB inquiry, 32 operations, 128 quantities and a 75-second outer worker timeout; domain workers impose additional numeric/protocol limits.

A changed relevant geometry source prevents the resource job from returning an active number. An unrelated intact mathematics operation can still execute. Changing a shared runtime file prevents use of its old configuration. Historical receipts remain snapshots; reading a saved JSON file does not contact a live review service or automatically refresh its scientific support.

For the resource example, NADPH 9–11 uM gives the necessary ceiling `[0.5541,0.566]` mM, excluding a 0.60 mM target. Revision 2 replaces that observation with 60–80 uM and gives `[0.6051,0.635]` mM, retracting the exclusion. It does not establish that the target can be achieved.

With `--previous`, the runner checks the previous receipt digest, same inquiry ID and next integer revision. An explicit correction uses `provenance.correction={"replaces":"revision1:N","reason":"…"}`. The current implementation requires an existing named quantity, a changed supplied value, unchanged quantity semantics/context, and no simultaneous changes to other quantities or scientific declarations. Other changes are ordinary revision comparisons, not observation corrections. Result transitions distinguish changed value/status from changed support even if the final number is equal; support includes capability, inputs/context, premises, sources, interpreter and parent support.

These are local content/revision checks. They do not authenticate an assay, establish public chronology or implement the companion's complete durable event protocol. `next_question` reports unresolved requirements; it does not autonomously collect evidence or launch a recursive discovery process.

## Review boundary

The initial independent executable review held acceptance for five issues: physical state lineage, equal-valued changed support, correction targets, unsupported mechanism/constraints, and quantum time context. The corrected implementation passed **50 supplied tests and 15 independent recheck groups**, including the original failing variants and 14 negative admission gates. Original failures remain in the review history. This clears the identified local routing blockers; it is not scientific validation of all parent theories. See `REVIEW.md` and `VALIDATION.json` for the bounded release record.

This is a local structured execution spine, with scoped numerical results and explicit gaps. It is not a hosted durable loop, an authenticated general admission service, a language-model reasoning system or evidence that the programme has discovered a new law. No optical experimental data or candidate activation is included in this distribution. The existing hosted `/api/question` remains separate. Connecting its reviewed structured requests and the existing shared ledger is the next integration task, not a capability implied by publishing this source.
