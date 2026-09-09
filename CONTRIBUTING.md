# Contributing

Run the numerical tests and type check before proposing a change. Include the seed, engine version, source label and expected result for a counterexample. A bug report should distinguish an incorrect calculation, an invalid scientific assumption and an interface problem.

New controllers must receive the same available information, actuator limits and tuning budget as their baselines. Publish development/test partitions before inspecting the final comparison. Preserve losing runs. New instruments need units, time semantics, calibration/quality fields, an explicit source type and a disconnection path. Do not commit participant data, credentials or proprietary datasets.

Proposed first contributions:

1. Gymnasium export with independent trajectory equivalence tests.
2. A recurrent/filter baseline and memory-free negative control.
3. BrainFlow stimulus markers with measured clock alignment.
4. Accessible interaction testing across keyboard, touch and reduced motion.
5. The Earth and Genome integration briefs in `research/Next_Big_Job.md`.

Keep upstream adapter changes small and independently useful. Cite the upstream libraries and relevant scientific prior art. Do not describe an integration as an endorsement by its maintainers.
