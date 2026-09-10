# Active Context: an AI tool worth testing

Working product name, 10 September 2026. This is a proposed product and evaluation plan, not an implemented general AI memory system or a claim of novelty.

**Give an AI the information it can currently rely on, the assumptions that may have expired, and the cheapest useful check before its next decision.**

## The concrete experience

A coding agent remembers that a deployment passed. The repository, configuration or service version changes. Active Context traces the old conclusion to those dependencies, marks its current applicability as unresolved, and identifies the relevant check. Once the result arrives, it updates the task's usable context and preserves why the earlier conclusion no longer applied. A failed check remains a result, not a prompt to rewrite the test.

In a team conversation, the same term may refer to different projects for different speakers. The tool should preserve who said what, to whom, about which entity, and at what time. It must distinguish a person's stated belief from an established external fact. A later message does not automatically supersede an earlier claim about a different entity or period.

The desired output is a compact, task-specific context packet with source links, applicability conditions, known conflicts and unresolved questions. Compression is useful only when the agent's subsequent decisions remain correct. There is no claim that the smallest sufficient context can always be identified.

## What existing tools already do

[Graphiti](https://github.com/getzep/graphiti) already supplies temporal facts, provenance, invalidation and hybrid retrieval. [Attestor](https://github.com/bolnet/attestor) explicitly targets auditable agent memory and deterministic retrieval. [ReMe](https://github.com/agentscope-ai/ReMe) provides agent memory management. We should adapt and compare these capabilities rather than announce ordinary temporal memory as our discovery.

The proposed opening is **active context repair**: connect a task's pending decision to the assumptions it depends on, find what has changed or remains unobserved, and select a useful additional check under a cost budget. Whether that combination materially improves agent performance is the empirical question. Static expiry rules, dependency invalidation and active information gathering also have substantial prior art; novelty must be reviewed at the implementation and experiment level.

## A small interface that other agents could use

- `context_for(task, actor, time, budget)`: assemble relevant evidence with entity, audience, version and time boundaries; report omissions and unresolved conflicts.
- `check_assumptions(proposed_action, context_id)`: identify dependencies that are missing, expired or contradicted. An unrecorded change can still escape detection.
- `choose_observation(available_checks, cost_budget)`: propose a check from an explicit allowed set. Initial policies should be transparent baselines; learned selection needs its own held-out test.
- `record_observation(source, result, timestamps)`: preserve original evidence and update dependencies without overwriting history.
- `replay_decision(run_id)`: inspect what was available, which context was supplied, what the agent did and what independently happened afterward.

Return proposals and evidence, not permission to execute arbitrary actions. A connector's access control remains authoritative; speaker identity and data scope are not replaced by semantic similarity. Model-generated text remains distinguishable from measured tool output.

## How to test whether it is valuable

Use the same agent model, tasks, tools and action limits for all comparisons. Count the entire ingestion, retrieval, checking and answer cost; a smaller final prompt does not establish a lower total cost. Measure completed-task success, erroneous actions based on stale/wrong-scope information, source fidelity, unnecessary checks, tokens, latency and abstention. Evaluate correct action, not merely whether a gold fact appeared in retrieval.

1. [LongMemEval](https://github.com/xiaowu0162/LongMemEval) supplies memory update, temporal and abstention cases. Keep its official splits and scoring conventions. Treat it as a useful regression benchmark, not sufficient evidence for acting agents.
2. [ToolSandbox](https://github.com/apple/ToolSandbox) supplies stateful tools and dependencies in interactive tasks. Test an integration on its unmodified scenarios before adding a separately labelled extension with between-step world changes. Both are author-released benchmarks, not new Observatory inventions.
3. [GroupMemBench](https://arxiv.org/abs/2605.14498v2) is a newer, directly relevant test of speaker/audience-grounded group memory. Its authors report substantial failures among the tested systems; those results are from their evaluation, not measured weaknesses in every current product. Verify code, data license and exact benchmark version before execution.

Comparators should include full available context, ordinary keyword/semantic retrieval, maintained temporal memory, fixed freshness/TTL checks, dependency invalidation and a simple fixed-budget refresh policy. The proposed active policy must show an increment beyond these. Use untouched tasks/entities and changing environments, not only a synthetic benchmark constructed around our rules. Do not cherry-pick the model or prompts after viewing the final test.

The first persuasive demonstration would replay one agent task side by side: its environment changes; the ordinary system relies on outdated or wrongly scoped context; the candidate detects the relevant unresolved dependency, performs a cheap check and completes the task. Then show aggregate success and full cost on independent tasks, including cases where our extra machinery loses.

## How it fits the current build

The Observatory ledger supplies versioned contracts, source snapshots, predictions, outcomes and review records. Recovery Lab tests whether extra observed history adds information. The grid collector exercises prospective timestamps and delayed truth. The existing adaptive-measurement simulation demonstrates test choice within a small declared model. Graphiti contributions address real memory-correctness defects.

Active Context would combine these lessons into an agent-facing tool. The missing pieces are task/dependency extraction, context selection, observation-policy estimation, real agent adapters and an independently scored deployment-task comparison. The current ledger alone does not provide those capabilities and has no demonstrated LLM cost or accuracy advantage.

**Recommended next AI delivery:** a narrow SDK adapter and reproducible stateful-agent experiment, with source-linked memory and explicit dependency refresh. Broaden only after a useful improvement survives strong comparisons. Keep the product usable independently of the programme's broader philosophical claims.
