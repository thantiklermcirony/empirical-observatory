# Active Context: first adoption plan

Research checked 10 September 2026. This is a launch plan and demand audit, not evidence that anyone has adopted Active Context. No messages, issues or PRs were posted.

**First user:** a developer resuming a Cline-assisted Python or TypeScript pull request after a code, configuration or runtime change. Their immediate question is: “Which recorded checks still apply, and which should I rerun before continuing?” Start with the ordinary local CLI and a readable continuation packet. Package one useful task; keep the wider scientific programme available through a separate link.

The release promise should be: **“Resume with evidence: see the conditions behind earlier checks and the checks that need refreshing.”** Its current interface uses declared scopes and costs; it does not discover complete dependencies, prove a patch correct, or learn an optimal observation policy. A tie with ordinary dependency invalidation is a useful implementation result, not an AI-performance breakthrough.

## Three specific communities

| Priority | Expressed problem and current evidence | Integration and existing alternatives | Appropriate first contribution |
| --- | --- | --- | --- |
| 1. Cline task/review users | [Discussion #12959](https://github.com/cline/cline/discussions/12959), opened 5 August 2026, asks for a plan/act/review loop preserving commands, results and context. On 6 August a participant describes BitFun's existing revision/workspace-bound handoff; on 9 August the proposer agrees. The discussion was accessible 10 September with three comments and one reply. [Open issue #12377](https://github.com/cline/cline/issues/12377), opened 18 July 2026, reports resuming an obsolete objective. Neither is a maintainer endorsement of this product. | Cline already resumes tasks and checks file states against checkpoints. Its hooks already support resume-time context injection. Active Context can supply a separate receipt/refresh packet; it must not claim to implement native mode switching or fix task prioritization. | A small external CLI recipe demonstrating one relevant change, one irrelevant change and one failed recheck. Only then offer an optional pinned-version adapter. Cline requires checking existing feature discussions and core approval before upstream feature work; use that route if a native change becomes warranted. |
| 2. Continue check/review users | [Open issue #12382](https://github.com/continuedev/continue/issues/12382), opened 12 May 2026, supplies a reproduction where original agent task IDs/statuses recur across new PR heads. The author reports five later commits without new check sessions. The displayed issue remains open; the underlying server cause is their inference, not independently reproduced here. | Continue already provides checks, Git context and MCP configuration. A local receipt viewer can show which repository/head/check-definition a result concerns and refuse to present a mismatched receipt as current. This is diagnostic assistance, not a fix for Continue's hosted scheduler. | An offline two-revision regression fixture and concise expected/actual evidence. Inspect current behavior before suggesting an upstream patch. Do not install a GitHub App or post statuses merely to demonstrate the product. |
| 3. Aider users with long sessions | [Open issue #4113](https://github.com/Aider-AI/aider/issues/4113), opened 27 May 2025, describes manually copying relevant portions of a large chat history after restarting. No assignee or linked development is displayed. Its age makes it a weaker current-demand signal. | Aider already restores history, maintains a repository map and rereads current files each message. Supply a small JSON/Markdown evidence file using its existing read-only-file workflow; do not claim Aider is reading stale files. This addresses check applicability, only part of the broader history-selection request. | An external command-line recipe and one reproducible task continuation. Avoid coupling to Aider's Python API, which its documentation says has no compatibility guarantee. Its contribution guide accepts issues/PRs and requires a CLA for PR contributors. |

Primary integration/norm sources: [Cline task management](https://github.com/cline/cline/blob/main/docs/core-workflows/task-management.mdx), [Cline contribution rules](https://github.com/cline/cline/blob/main/CONTRIBUTING.md), [Continue contribution rules](https://github.com/continuedev/continue/blob/main/CONTRIBUTING.md), [Continue MCP configuration](https://docs.continue.dev/reference), [Aider FAQ](https://aider.chat/docs/faq.html), [Aider commands](https://github.com/Aider-AI/aider/blob/main/aider/website/docs/usage/commands.md), [Aider scripting](https://aider.chat/docs/scripting.html), [Aider contribution rules](https://github.com/Aider-AI/aider/blob/main/CONTRIBUTING.md).

**Do not advertise a tested hook integration yet.** Cline's [published hooks guide](https://docs.cline.bot/customization/hooks) and [repository hook README](https://github.com/cline/cline/blob/main/.clinerules/hooks/README.md) disagree about payload names, Windows support and ordering. Pin an actual release and record real callback fixtures before claiming support. Continue's check-CI URL cited in its issue now returns 404; its current MCP reference is accessible, but that does not verify hosted check lifecycle behavior.

The prior-art comparison must also include [Bazel's action caching](https://bazel.build/remote/caching), [Graphiti](https://github.com/getzep/graphiti) and [Attestor](https://github.com/bolnet/attestor). Memory, dependency invalidation, provenance and frozen review targets already exist. Attestor's advertised performance is its own claim; it was not reproduced in this audit. Our narrower question is whether a lightweight continuation/checking workflow earns repeat use.

## First ten-minute workflow

Ship a pinned source release, one ready-configured demo and a five-line explanation of its declared coverage. The example should contain an inexpensive focused test plus a broader check. The ledger and generated packet must sit outside watched scopes.

1. Run the declared focused check through `python -m active_context run ... --check unit`; show command, exit code, inputs, runtime identity and output receipt. A tool callback's generic `success` flag is not sufficient evidence that a test passed.
2. Resume without changes: `inspect` reports reuse **within declared scope**. Show the receipt link and remaining unknown dependencies.
3. Apply the demo's published relevant change; `inspect` reports the changed condition. Run `plan --claim parser-behavior` to display the allowed recheck and its declared cost. Planning does not execute it.
4. Execute the selected check explicitly. A failure stays in the ledger and supersedes the old success for current applicability. Also show the irrelevant-edit example, where the declared test scope stays unchanged.
5. Save the inspection/plan output as the continuation packet. Read it into an existing agent task; for Aider, use its normal `/read-only` command. Ask the developer to identify the next action and receipt supporting it. The first release needs no model API call to demonstrate these mechanics.

These commands follow `work/active-context/INTERFACE.md`; the runnable release must replace the ellipsis with tested example paths. Do not publish aspirational commands as an already functioning installer or promise untested MCP/hooks. Show the same demonstration against rerun-all, fixed refresh and declared-dependency invalidation, including ties and failures.

## Adoption measurements and stop rules

Record actual counts, with owner/bot/CI/demo runs separated. Default to local reports; any sharing is opt-in.

| Measure | Definition | Proposed two-week decision target, not an observed result |
| --- | --- | --- |
| Activation | Independent developer records a real check, resumes after a relevant change, reads the packet and performs an appropriate next step | Five completed first uses; median time-to-first-useful-packet under 10 minutes |
| Task correctness | Independent executable acceptance and stale-success errors across the same continuation episodes | No false reuse claims on the frozen engineering cases; completion no worse than rerun-all. This small sample is not a reliability guarantee. |
| Checking cost | All receipt capture, hashing, inspection and command time; failures/timeouts retained | Follow the frozen 20% gate versus the strongest equally correct baseline; a tie fails the superiority claim |
| Repeat use | Activated developer with another real continuation opportunity uses it on a separate day/task by day 7 | At least three of five eligible developers return; publish numerator and eligible denominator |
| Burden | Setup time, manual scope edits and unnecessary rechecks on unrelated changes | Record why each person stops. If dependency annotation outweighs saved work, simplify before promotion. |
| External contribution | Someone outside the project supplies a reproducible failure, recipe improvement or maintained integration | One substantive contribution is more informative than stars |

Do not equate installations, downloads, stars or an issue author expressing a problem with retained users. An LLM improvement requires a later fixed-agent comparison; this release's deterministic experiment cannot establish it.

## Two-week sequence, ready for approval and execution

- **Days 1–2:** finish and verify the CLI release, one demo, clear unknown-dependency labels, source license, uninstall instructions and a 90-second replay. Keep the initial page about resuming a real coding task.
- **Days 3–4:** run the frozen continuation benchmark, publish every comparator and failure, and test the README from a clean environment. If the tool ties dependency invalidation, describe it as a small usable implementation.
- **Day 5:** prepare one Cline-specific feature-discussion reply with the existing thread's exact scope, runnable artifact and benchmark limits. Ask whether a receipt/refresh adapter would help; do not imply native plan/act support or maintainer approval. Root/user reviews before anything is posted.
- **Days 6–7:** publish the approved release note in our own repository. Invite up to five opt-in testers to use their own non-demo tasks. Do not mass-tag issue authors, send cold DMs or paste the same pitch across projects.
- **Days 8–10:** help those testers reproduce failures. Prepare the Aider read-only-file recipe and Continue revision-mismatch fixture only when the corresponding use is tested. Add to an existing thread only if it contributes new evidence and fits its norms; otherwise keep it in our own examples.
- **Days 11–13:** collect second-task use, uninstall reasons and true end-to-end cost. Fix usability defects with a new version; retain prior results and keep evaluation cases separate from development examples.
- **Day 14:** publish activation/return counts and the failure log. Continue one integration if people use it again. If nobody returns, reconsider the workflow before a larger launch. Upstream PRs come after agreement on a concrete change, not as an advertising channel.

## Actual interest baseline

The parent fetched the public Observatory repository metadata on 10 September 2026: **0 stars, 0 forks, 0 subscribers, 0 open issues**. Raw selected fields are preserved in `public-repo-baseline.json` (repository `pushed_at` 09:23:51Z; this is push time, not a traffic observation). No independent Active Context user count has been measured. These zeros do not imply zero readers.

Repository visitors/clones and website sessions are **unknown**, not zero. The public repository/page fetches in this research did not reveal traffic. GitHub's traffic view requires push access and covers the preceding 14 days; owner access can establish a dated baseline later. [GitHub traffic documentation](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository)

Issue states above were read from primary GitHub pages on 10 September; some pages report crawler ages of several days. Reopen the chosen thread and check for fixes/duplicates immediately before any outreach. This is a three-community demand screen, not an exhaustive market study.
