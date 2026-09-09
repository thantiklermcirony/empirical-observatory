# Final independent follow-up — corrected release source

Read-only audit on 2026-09-09 of `quantum.ts`, `records.ts`, `instrument-packet.ts`, `tao.ts`, the Earth route/parser and Expeditions interface. The owner is still preparing the release; findings here describe the inspected snapshot, not any subsequent fixes.

**Checks completed:** 23 core Node tests passed; 13 Earth integration tests passed. The 60,000-seed conditional first-shot check now returns plus rates `.94037, .05726, .50147, .49945, .50215, .50169` for `0,1,+,-,+i,-i`, consistent with declared probabilities `.94,.06,.5,.5,.5,.5`. Corrected sampling has a separate engine version, while legacy replay retains its warning. Alignment preserves the tiny-state identity. Invalid empty quantum completion is rejected. `followup-reproduction.json` retains these results.

## Concrete remaining fixes

1. **P2: cancellation remains in growth and threat exact primitives.** `flow('growth',1e-20,0)` and `flow('threat',1e-20,0)` both return zero, rather than the supplied state. The subtraction-from-one formulas lose tiny positive quantities. Use the algebraically equivalent stable growth expression `(e + t*(1-e)) / (1 + t*(1-e))`; use `e + (1-e)*(-Math.expm1(-t))` for threat. Add exact zero-duration identity and relative-accuracy checks near zero. This does not affect current controller benchmark results because those primitives are the separate flow workbench.

2. **P3: quantum guess validation coerces invalid types.** `String(r.config.guess)` accepts an array such as `['+']`. Require `typeof r.config.guess === 'string'` before membership validation, so the typed experiment configuration remains truthful. This is not code execution or an observed UI exploit.

3. **P2: update published Methods version and qualifications.** `research/Methods.md` still begins “Engine 0.1.0.” Before packaging, identify engine 0.2.0, explain the state/measurement random-stream fix, keep legacy biased records out of new statistical evidence, and say dwell constrains mode changes only. The contract object already expresses the dwell qualification. Preserve the existing boundaries on plant invariance, synthetic comparison, browser timing and physical hardware.

The reviewed Earth/Memory/Genome interface separates captured observations, expected standard-task memory results, request planning and unexecuted live Atlas access. I found no additional material overclaim in that interface. The Earth endpoint uses fixed provider URLs, bounded responses, timeouts and provenance; its request path does not take an arbitrary upstream URL. This review did not run a browser, perform a live endpoint capture, attest full God's Eye host acceptance, or validate a live AlphaGenome query.

Commands executed from the Site checkout:

```sh
node --experimental-strip-types --test tests/engine.test.ts
node --test integrations/earth/earth.test.mjs
```

No Site source files were edited by this agent.
