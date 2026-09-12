# Foundation claims for a paper-grounded Question Desk

11 September 2026. Bounded corpus extraction from manuscript body text. Paper expectations are retained separately from the numerical solvers; no language-model rediscovery is claimed. “Novel” below means priority established, not merely an internally correct result.

## Reading boundary

The six claims below were selected from body-text extracts that include the theorem statement or proof, page markers and scope language. Titles and catalogue summaries were used only to identify the paper. No claim is inferred from a title. The current-paper files are theorem-centred extracts rather than full manuscripts, so the source location names the exact theorem/proposition and PDF page shown in the extract.

## Claim 1 — what actually forces scalar UHL/Einstein composition

**Question for the Desk.** Does boundedness plus associativity force

```text
x * y = (x+y)/(1+kappa^2*x*y)?
```

If not, state assumptions under which the manuscript proves that law.

**Source.** Daniel John Murray, *Einstein Velocity Addition from Associativity and Boundary-Fixing Möbius Translations*; `pdf-text/R01-0.txt`; PDF p. 1, Theorem 1.1 (“Main classification”), with scope discussion on p. 2 and proofs in §§3–4.

**Exact assumptions.** On `I_kappa=(-1/kappa,1/kappa)`, the operation is continuous, strictly increasing in each variable and associative, has identity `0`, and each element has inverse `-x`. In addition, each left translation `tau_a(x)=a*x` extends to a real-analytic fractional-linear map of the extended real line fixing both boundary points individually.

**Expected answer.** Boundedness and associativity alone do not select `artanh` in the measured coordinate. Under all stated assumptions, the additive generator is, up to positive scale,

```text
f(x)=kappa^(-1) artanh(kappa*x),
```

and therefore the displayed Einstein law follows. The decisive selector is the boundary-fixing Möbius action. Aczél representation supplies an additive coordinate for the regular associative interval law, but does not by itself say that the raw coordinate's generator is `artanh`.

**Strongest falsifier.** An explicit operation satisfying every assumption, including raw-coordinate Möbius left translations fixing both endpoints, but differing from the Einstein formula. An associative bounded law obtained through another nonlinear generator is not a falsifier if its left translations are not Möbius in the fixed measured coordinate.

**Known versus novel.** The conditional theorem is mathematically sound under the stated assumptions. Aczél interval representation, Möbius conjugacy and rapidity are classical. No independent priority audit establishes the combination as a novel theorem; the programme's important content is the precise dependency and the demand for a physical justification of the Möbius selector.

**Visual cue.** Draw many possible nonlinear rulers unwrapping the same bounded interval to the real line. Then lock the two endpoints and require every update to be projective: only the rapidity ruler remains, up to scale.

## Claim 2 — a measured present carries a future law exactly when the law is constant on its fibres

**Question for the Desk.** When does a history compression `x(h)` define a genuine state law rather than merely a convenient label?

**Source.** Daniel J. Murray, *The Observer and the World: Predictive state, lawful forgetting, and the geometry of empirical reality*; `current-07-theorems.txt`; PDF pp. 4–5, Theorem 1 (“State-Law Descent”), §2.

**Exact assumptions.** Fix a declared experimental jurisdiction: admitted histories, interventions `u`, future event sigma-algebra and conditional future kernels `K_u(h,B)`. Give the candidate representation its stated final sigma-algebra. The theorem is about exact factorization, not finite-sample approximate equality.

**Expected answer.** A descended kernel `Kbar_u` on the candidate state exists for every admitted intervention exactly when every `K_u(h,B)` is constant on each fibre of `x`. Equivalently,

```text
x(h1)=x(h2)  =>  K_u(h1,B)=K_u(h2,B)
```

for every admitted `u` and future event `B`. If one matched-present pair has different declared future laws, no function applied after `x` can restore the lost distinction.

**Strongest falsifier.** Histories `h1,h2` with the same `x`, different future kernels for an admitted test, and nevertheless a well-defined exact `Kbar_u(x,B)` reproducing both. This would directly contradict the equivalence. Empirical non-rejection in a finite test battery does not falsify or prove the exact theorem.

**Known versus novel.** This is an elementary factorization/quotient criterion closely related to sufficient statistics, predictive-state representations, causal states and bisimulation. The manuscript supplies a clear experimental formulation; no priority claim for the abstract quotient is supported.

**Visual cue.** Histories are wires entering boxes labelled by the same present. A valid box has identical future-distribution wires leaving it. If two outgoing wires differ, the box merged too much history.

## Claim 3 — new experimental access can only refine exact predictive state

**Question for the Desk.** If observer `J2` can perform every future test available to `J1` and additional tests, how are their exact predictive state spaces related?

**Source.** Same Observer paper and extract as Claim 2; PDF p. 6, Proposition 2 (“Jurisdiction refinement”), §2.4.

**Exact assumptions.** Both jurisdictions act on the same admitted history class, and the future-test repertoire of `J1` is a subset of that of `J2`. Equivalence means equality of every future law inside the relevant jurisdiction.

**Expected answer.** Equivalence under the richer jurisdiction implies equivalence under the poorer one. Hence every `J2` state lies inside a `J1` state, producing a natural surjection

```text
S_J2 ->> S_J1.
```

An added sensor, intervention or horizon may split an old state; it cannot merge histories that the old repertoire already distinguished, provided the old tests and history domain are truly retained.

**Strongest falsifier.** A pair equivalent under all tests in the superset `J2` but distinguishable by a test in its subset `J1`. Apparent merging after adding a sensor is not a mathematical counterexample if the data processing, tolerances, admitted histories or old tests were changed.

**Known versus novel.** The order relation is a direct set-inclusion consequence, not a new mathematical discovery. Its scientific value is as a guardrail: observer-relative state refinement is precise without implying that observers create the underlying world.

**Visual cue.** Show a coarse map whose one region divides into smaller regions when a new experimental lens is added; arrows from fine regions collapse back onto the old region.

## Claim 4 — the predictive quotient is the coarsest exact state for a declared future family

**Question for the Desk.** Among all exact representations of history for one declared continuation-closed future family, what is the maximum lawful compression?

**Source.** Daniel J. Murray, *Predictive Closure: State, action, and the experimental compression of history*; `current-10-theorems.txt`; PDF p. 7, §2.2, “P — PROVED MODULE: Predictive quotient theorem.”

**Exact assumptions.** Define `h ~_Pi h'` by equality of all conditional future laws in the fixed declared family `Pi`. “Exact sufficient” means those laws factor through the proposed representation. The ordering is informational refinement, not Euclidean dimension or code length.

**Expected answer.** `~_Pi` is an equivalence relation and `S_Pi=H/~_Pi` is the coarsest exact predictive state in the information order. Every exact sufficient representation `z` must keep at least the distinctions retained by the quotient:

```text
z(h)=z(h')  =>  h ~_Pi h'.
```

It may keep extra distinctions. Changing the intervention set, horizon, resolution or future variables changes `Pi` and can change the quotient.

**Strongest falsifier.** An exact sufficient `z` that assigns the same value to two histories whose admitted future-response rows differ. A smaller numerical dimension is not by itself a falsifier because arbitrary encodings can preserve an information partition.

**Known versus novel.** The manuscript explicitly relates this to causal-state, predictive-state, sufficient-statistic, bisimulation and automata future-equivalence ideas and does not claim priority for the quotient. Its programme role is to make the admission conditions explicit and connect them to experiments.

**Visual cue.** Write one row per history and one column per future test. Identical rows collapse into one state; no exact compression may collapse unequal rows.

## Claim 5 — minimum deterministic action information is a hypergraph/set-cover problem

**Question for the Desk.** When can several predictive states share one deterministic action code, and how many codewords are minimally required on a finite domain?

**Source.** Daniel J. Murray, *From Predictive State to Viable Action: Action Sufficiency, Safe Diagnosis, and the Operational Recoverability Bound*; `current-11-theorems.txt`; PDF p. 3, Theorem 1 (“Action-sufficiency criterion”), §3.1, and p. 4, Theorem 2 (“Minimum action-code theorem”), §4.

**Exact assumptions.** Use a nonempty finite individually feasible state set `S+`, a finite declared primitive action library `A`, success threshold `1-alpha`, acceptable sets

```text
A_alpha(s)={a: p_s(a)>=1-alpha},
```

and a deterministic code/policy. The hypergraph contains inclusion-minimal state subsets whose acceptable-action intersection is empty. Randomized, adaptive or measurable infinite-space policies require different conditions.

**Expected answer.** A code is valid exactly when every occupied code cell has a common acceptable action:

```text
intersection_{s:z(s)=z0} A_alpha(s) != empty.
```

The minimum number of deterministic codewords is the chromatic number of the resulting conflict hypergraph, equivalently the minimum number of action-success sets needed to cover `S+`. Pairwise compatibility is insufficient: three states can have pairwise nonempty intersections but empty three-way intersection.

**Strongest falsifier.** A finite declared instance in which a deterministic policy succeeds for every state in a code cell whose full acceptable-action intersection is empty, or in which the rigorously constructed minimal-conflict hypergraph has chromatic number different from the exact minimum code size. Silently enlarging the library with randomized mixtures changes the problem and is not a counterexample.

**Known versus novel.** The set-intersection proof and set-cover/hypergraph equivalence use classical combinatorics. The biological/action-sufficiency formulation may be a useful synthesis, but no independent novelty claim is established. It does establish a precise difference between information sufficient for prediction and information sufficient for a declared action.

**Visual cue.** Give each state a palette of safe actions. States may share one label only if all their palettes overlap at a common colour; pairwise overlaps can form a triangle with no colour common to all three.

## Claim 6 — arbitrary factual recall cannot be compressed below the facts by a fixed decoder

**Question for the Desk.** Can a fixed deterministic model encode every possible table of `N` independent `b`-bit facts in fewer than `N*b` fact-dependent bits while answering every indexed fact exactly?

**Source.** Daniel J. Murray, *Epistemic Type Safety for Generative AI: Witnessed Assertion, Fail-Closed Kernels, and Why the Model Need Not Be the World*; `current-01-theorems.txt`; PDF p. 8, Proposition 1 (“Elementary factual-storage counting bound”).

**Exact assumptions.** The fact table ranges over all `2^(N*b)` possible independently variable tables. The decoder is deterministic and fixed independently of the table. For every table, a `B`-bit description must let the decoder return every indexed fact exactly.

**Expected answer.** No. Different tables require different descriptions, so the table-to-description map is injective. There are at most `2^B` descriptions and `2^(N*b)` tables, forcing `B>=N*b`. An external store relocates the fact-dependent bits; it does not make them disappear. This bound does not show that a small proposer is sufficient for language understanding, binding, planning or reasoning.

**Strongest falsifier.** A fixed decoder and descriptions with `B<N*b` that exactly recover every entry of every possible table. Compression of a structured, correlated or restricted table family does not falsify the all-tables counting claim.

**Known versus novel.** This is an elementary pigeonhole/information-counting argument, explicitly not presented as a new information-theoretic theorem. The paper's “early saturation of proposing” claim is an untested empirical hypothesis and must not be reported as a consequence of this proposition.

**Visual cue.** Place all possible fact books on one side and all shorter bit strings on the other. If there are fewer strings than books, two books share a string and the fixed decoder must answer one of them incorrectly.

## Cross-paper consistency checks for the harness

1. **Selector check:** An answer saying “boundedness forces `artanh`” fails Claim 1 even if it reproduces the formula.
2. **Jurisdiction check:** An answer calling a variable “the state” without naming future tests fails Claims 2–4.
3. **Lost-information check:** An answer proposing a more flexible model after histories have already been merged fails Claim 2.
4. **Prediction/action check:** An answer equating the richest predictive state with the minimum action code fails Claim 5.
5. **Pairwise check:** An answer replacing the conflict hypergraph with only pairwise conflicts fails Claim 5.
6. **Storage/model-size check:** An answer using Claim 6 to promise that small models will match large models fails the source paper's explicit scope boundary.

Together these form a coherent test of the programme's central grammar:

```text
physical operation + selector
          -> lawful composition
history + declared future repertoire
          -> predictive quotient
predictive state + declared success/action library
          -> action-sufficient code
evidence store + verifier/proposer boundary
          -> certified assertion architecture
```

The chain is a dependency map. It does not show that one axiom derives every later module, nor that any physical or biological system instantiates the mathematical premises.
