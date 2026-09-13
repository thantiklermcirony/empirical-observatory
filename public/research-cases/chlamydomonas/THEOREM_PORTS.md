# The mathematical connections and their limits

These are algebraic consequences of the imported model. They are not newly
discovered laws of nature. Time is in minutes, volume V in AV, and model amounts
in AU. Positive V and nonnegative model parameters are prerequisites.

## 1. Growth integrates the illumination history

Between divisions, dV/dt = μ L(t) V. Therefore

`V(t) = V(0) exp(μ ∫ L(s) ds)`.

For a symmetric synchronous lineage with generation g, the total is
`2^g V(t) = V(0) exp(μ ∫ L(s) ds)` even through division events.
This follows because each daughter has half the parent volume and there are
twice as many daughters. It applies only to this model with fixed μ and no
maintenance loss, nutrient limitation, asymmetric division or death.

Use: distinguish a change in total modeled growth from a change in its division
schedule. It is not an energy-conservation or biomass-stoichiometry theorem.
Equal light duration is not by itself a measured equal-energy claim.

## 2. Cancel internal reactions before inventing another node

Let T = TF + INTF and I = IN + INTF + IP. Summing the source equations yields

`dT/dt = kSyTf V − kDeTf T`

`dI/dt = kSyIn − kDeIn I`.

Binding, release and phosphorylation contributions cancel exactly. This does
not erase the internal pools: S synthesis still depends on free TF, and the
oscillator's response depends on its full state. T is not interchangeable with
TF in a downstream equation.

Use: analytically propagate totals and make their reaction accounting auditable.
The engine evolves V, SK, T and I analytically on each constant-light segment,
and solves for INTF, IP, S and M implicitly. This is an equivalent coordinate
transformation at the differential-equation level; finite-step solutions retain
numerical error. A stiff nonlinear solve can produce spurious branch effects.

## 3. Division is an amount map, not a concentration jump

The published event is a downward crossing of M/V = CdTh. All eight amounts,
including V, are halved. Thus each daughter inherits the same instantaneous
concentrations, and the two daughters' amounts sum to the parent's.

Use: prevent a visual division from duplicating or destroying model material.
It does not conserve a complete cell's measured mass, charge, energy or genome:
those complete physical ledgers do not exist in this reduced model.

## 4. Nonnegative states have lawful boundary derivatives

For each amount set to zero with all other states nonnegative and V positive,
its source ODE has a nonnegative derivative. The nonnegative orthant is invariant
for the differential equations under these assumptions. V remains positive.
Numerical integrators need separate verification; the engine rejects meaningful
negative or nonfinite states and only trims roundoff-scale negatives.

Use: reject invalid states, rather than hiding them with large-value clipping.
This model is not universally bounded in volume across all forcing and parameter
choices. A finite simulation horizon is not a universal biological ceiling.

## 5. Names, numerical equality and units are not sufficient links

| Candidate link | Decision | Missing requirement |
|---|---|---|
| Source-model free TF amount to the same defined free TF port | Representation compatible | Empirical and causal support still separate |
| Image area in pixels to model volume in AV | Reject direct link | Calibrated geometry and scale transformation |
| Total TF to a free-TF-dependent rate | Reject substitution | Bound/free distribution or a justified reduction |
| Generic model kinase to a named measured gene/protein | Reject direct identity | Experimental identification and assay map |
| Growth-rate multiplier to nitrogen/water dose | Reject | Uptake, reserves, stoichiometry and joint dose-response data |
| Binary light state to photon energy or membrane voltage | Reject | Spectrum, absorption and electrical/energetic mechanisms |
| AU to moles | Reject | Molecular identity and calibrated amount scale |

## Architecture assembled here

One versioned model engine owns the calculations. Observable ports declare
meaning, units and evidence. Displays consume those same states. Parameter and
schedule interventions are recorded. A separate observation model consumes
measured data. The evidence ledger can keep, narrow or reject a lead. New
scientific layers remain unsupported until their connectors are justified.

The strongest closure claim we can make here is implementation-specific and
finite. There is no empirical whole-organism closure certificate, no new Aczél
theorem, and no derivation of all biology from boundedness and adaptiveness.
