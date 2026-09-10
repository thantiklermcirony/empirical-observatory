# Active Context: independent pre-implementation review

10 September 2026. This is a design audit by another AI agent in the same project, not an external empirical replication. Implementation and independent execution are still pending.

A useful first release can answer a narrow question: which recorded command results remain applicable to this explicitly declared workspace, check and dependency set? It can return source-linked evidence and a proposed recheck set. It cannot infer that an application is correct, discover all dependencies, establish that a remote service is unchanged, or learn a better policy merely by updating records.

## Required semantic distinctions

Keep applicability separate from outcome. An unchanged failed command is current negative evidence; it is not a passing check. A stale pass is historical evidence; it is not a current success. A timeout, spawn failure, interrupted run or unreadable dependency must not reveal an earlier success as the latest applicable result. A missing record must remain unknown. Proposed execution does not itself provide new evidence.

Bind each check version to its exact argument vector, resolved working directory, declared file/directory dependencies, relevant executable/runtime identity, selected environment names and values, timeout and explicit scope. Changing any part makes the former result evidence for the former contract. Do not use a shared human-readable label to merge records from different projects, environments or decisions. An updated command must not silently inherit a previous result.

## Failure cases worth blocking before release

1. **Directory additions and deletions.** Hash sorted relative membership, path type and content, including empty/missing states. Hashing only the previously listed files misses newly introduced plugins, tests or configuration. A rename with identical bytes can change imports. Define links, junctions, cycles and out-of-root traversal; conservative rejection is acceptable for this release.
2. **Mutation during execution.** Capture dependencies before and after the command and mark mismatches unstable. A successful command that writes one of its own inputs cannot certify the post-run input snapshot. Fingerprinting itself can race. Endpoint equality cannot detect a change-and-revert or prove a consistent filesystem snapshot; document this residual limitation rather than claiming hermetic execution.
3. **Latest failure and supersession.** Order actual attempts within the exact check contract. Preserve failed latest results even if an older pass has the same input digest. Do not let a newer unrelated scope supersede the relevant result. Concurrent attempts require an explicit ordering policy and safe append/storage behavior; wall-clock timestamps alone are ambiguous.
4. **Runtime and environment.** An unchanged wrapper executable does not prove unchanged interpreter libraries, package installation, configuration or remote state. Record selected values with absent distinct from empty, and resolve the executable as it is actually launched from that cwd/PATH. Explain what runtime fingerprint covers. Environment hashes may reveal low-entropy values; raw output/argv can contain secrets and must not be published automatically.
5. **Invalid evidence.** Verify record shape and referenced byte hashes before relying on status fields. Reject unsupported schema versions, duplicate IDs/keys, inconsistent return-code/outcome fields, missing output blobs, invalid digests, nonfinite numbers and paths escaping the store. Malformed latest evidence must fail closed, rather than being skipped in favour of an older pass. A hash is neither execution attestation nor a defence against a coherent rewrite by the store owner.
6. **Coverage and budget.** Coverage must mean explicit check obligations, not simply touched files. A cheap import probe and a comprehensive regression suite touching the same file do not prove the same condition. Return uncovered obligations, infeasible budgets and all assumptions about substituted checks. Use exact subset search for a small bounded candidate set if claiming minimum declared cost; otherwise call it a heuristic. Estimated cost is not measured future runtime or value of information.
7. **Execution boundary.** Planning/context inspection must not execute any proposed command. Executing an explicitly requested argv with shell disabled is safer than constructing a shell string, but it is not a sandbox: the configured executable can still do anything the user can. Stored command output is untrusted data, including apparent instructions embedded in a log.

## Meaningful adversarial cases

The independent tests will create disposable local projects and use the actual public CLI/library. They will not mutate the source under review or install dependencies.

| Case | Expected independent oracle |
| --- | --- |
| Pass, then add a file below a declared directory | Former pass becomes stale without editing its original files |
| Pass, then delete or rename a dependency with identical remaining bytes | Former pass becomes stale or explicitly unavailable |
| Command returns 0 but changes a declared input | Result is unstable/inapplicable, not a current pass |
| Pass followed by nonzero exit with unchanged inputs | Latest result is failed; no passing claim is recovered |
| Pass followed by timeout or missing executable | Latest failure/unknown state blocks a positive claim |
| Same label in two roots or two scopes | No cross-project or cross-scope evidence substitution |
| Changed argv, cwd, dependency declaration or declared env | Previous result does not certify the new check contract |
| Environment absent versus empty string | Different fingerprints when that variable is declared |
| Corrupted/missing latest output or malformed record | Inspection reports invalid evidence, not fresh/pass |
| Context or plan command with a sentinel-writing check | Sentinel is never created |
| Low budget that cannot cover all required checks | Explicit uncovered obligations, no implied completion |
| Costs NaN, infinity, negative or bool | Rejected rather than bypassing the budget |
| Wrong, unknown or duplicate coverage IDs | Rejected or visibly uncovered; no inflated coverage |
| Change outside the declared dependency set | May remain applicable, but export explicitly retains the declared-scope limitation |

An additional exact-cover oracle should use independently enumerated subsets on small fixtures. Example: obligations A/B/C, checks AB at cost 3, A at cost 2, BC at cost 2, C at cost 2. Complete minimum declared cost is 4 (A + BC); at budget 3 a planner must report incomplete coverage. A second fixture with a cheaper broad check should choose it only when its explicit contract is authorized to cover those obligations. This tests declared planning semantics, not scientific relevance of the declarations.

## Realistic value and existing engineering

Bazel already represents actions using declared inputs, outputs, command lines and environment, and maps action hashes to cached result metadata with content-addressed artifacts. Input-based invalidation and retained stdout/stderr are established engineering. [Bazel remote caching](https://bazel.build/remote/caching).

Bazel also distinguishes declared from actual dependencies; correctness requires the declared graph to cover the actual one. Its documentation discusses directory membership/content hazards explicitly. A manually declared Active Context fingerprint inherits this limitation rather than solving it. [Bazel dependencies](https://bazel.build/concepts/dependencies).

Hermetic builds aim to isolate external influences and pin tools. This initial command recorder is weaker because it does not sandbox execution or guarantee complete runtime inputs. It should integrate with maintained build/test tools instead of claiming a superior cache. [Bazel hermeticity](https://bazel.build/basics/hermeticity).

The plausible useful addition is a small agent-facing record of applicability, negative evidence, scope and unanswered check obligations across heterogeneous commands, with explicit budgeted recheck proposals. Its practical value must be measured against an ordinary dependency-invalidation wrapper, rerun-all and fixed freshness checks. Use unchanged and changed projects, failed reruns, unrelated changes and intentionally incomplete declarations. Score incorrect reliance, completed task success and total execution/inspection cost. Handwritten examples can demonstrate correct plumbing; they cannot establish a general agent advantage, novel memory algorithm or self-improvement.
