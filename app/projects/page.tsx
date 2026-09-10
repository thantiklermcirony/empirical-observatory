import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Orbit } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Current projects — The Empirical Architecture',
  description:
    'Inspect our Ray Serve recovery experiment, submitted NeuroGym decision cue, Pertpy biological evaluator and Graphiti memory fixes.',
};

const github = 'https://github.com/thantiklermcirony';
const nextMissions = [
  {
    name: '01 / Ray Serve',
    status: 'SUBMITTED / AWAITING REVIEW',
    description:
      'A replacement controller needs a new subscription. Inspect the candidate, actual actor tests and the Linux HTTP experiment.',
    href: 'https://github.com/ray-project/ray/pull/66039',
    gate: 'CPU / Linux · upstream review pending',
  },
  {
    name: '02 / Dask',
    status: 'CONTRACT & REPRODUCTION',
    description:
      'Should moving empty data partitions change a merge result? Compare row identity with pandas and coordinate with the contributor already investigating.',
    href: 'https://github.com/dask/dask/issues/12564',
    gate: 'CPU · issue still awaiting triage',
  },
  {
    name: '03 / NASA F Prime',
    status: 'CONDITIONAL / DESIGN AGREEMENT',
    description:
      'Turn delayed communication records into inspectable ground data. Build a decoder only after the format, ownership and required upstream approval are settled.',
    href: 'https://github.com/nasa/fprime/issues/5845',
    gate: 'Offline fixtures · draft writer dependency',
  },
];
const projects = [
  {
    name: 'TAO / adaptive control',
    status: 'PLAYABLE EXPERIMENT',
    description:
      'Recover a bounded reactor and compare controllers. The published conventional PI controller currently wins on mean tracking error.',
    href: '/#tao',
    action: 'Enter TAO Chamber',
    source: `${github}/empirical-observatory/blob/main/research/Methods.md`,
  },
  {
    name: 'Quantum measurement',
    status: 'PLAYABLE SIMULATION',
    description:
      'Choose measurements, spend a shot budget and compare gate order using established quantum mechanics.',
    href: '/#quantum',
    action: 'Enter Quantum Lab',
    source: `${github}/empirical-observatory`,
  },
  {
    name: 'Earth, AI & Genome',
    status: 'EXPEDITION WORKSPACE',
    description:
      'Explore real Oslo observations and a reproducible memory diagnostic. The AlphaGenome adapter needs local setup and provider access.',
    href: '/#expeditions',
    action: 'Explore expeditions',
    source: `${github}/empirical-observatory/tree/main/integrations`,
  },
  {
    name: 'IDA / StateAtlas',
    status: 'RESEARCH PROTOTYPE',
    description:
      'Inspect the developing instrument for predictive state, measurement and intervention research. Biological and consciousness claims remain research questions.',
    href: `${github}/ida-stateatlas`,
    action: 'Explore IDA on GitHub',
    source: `${github}/ida-stateatlas`,
  },
];

export default function Projects() {
  return (
    <main className="projects-page">
      <header className="projects-header">
        <Link className="brand" href="/">
          <Orbit size={30} />
          <span>
            THE EMPIRICAL
            <br />
            <strong>ARCHITECTURE</strong>
          </span>
        </Link>
        <Link className="text-link" href="/">
          <ArrowLeft size={16} /> Research station
        </Link>
      </header>
      <section className="projects-intro">
        <span className="eyebrow">OPEN RESEARCH / CURRENT PROJECTS</span>
        <h1>
          Ideas you can put
          <br />
          to the test.
        </h1>
        <p>
          Run an experiment, inspect the evidence, or help improve a working
          project.
        </p>
        <div className="project-links">
          <Link href="/#tao">
            Try an experiment <ArrowUpRight size={18} />
          </Link>
          <Link href={`${github}/empirical-architecture`}>
            Read the programme <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section
        className="graphiti-feature pertpy-feature"
        id="ray"
        aria-labelledby="ray-title"
      >
        <div className="project-status">
          <span className="status-light" /> CONTRIBUTION SUBMITTED · AWAITING
          REVIEW
        </div>
        <div className="graphiti-heading">
          <div>
            <span className="eyebrow">LATEST PROJECT / AI INFRASTRUCTURE</span>
            <h2 id="ray-title">
              Still running.
              <br />
              Still listening?
            </h2>
          </div>
          <p>
            Ray Serve can keep serving old routes after its controller is
            replaced. Our candidate lets the surviving HAProxy manager find the
            new controller and reload its state.
          </p>
        </div>
        <div className="graphiti-fixes">
          <article>
            <span className="project-number">01 / IDENTITY</span>
            <h3>The same name can hide a different system.</h3>
            <p>
              We replace a real Ray actor while deliberately reusing its
              snapshot version. The original subscriber stops; the candidate
              receives the replacement state.
            </p>
            <Link href="https://github.com/ray-project/ray/pull/66039">
              Review the Ray contribution <ArrowUpRight size={18} />
            </Link>
          </article>
          <article>
            <span className="project-number">02 / RECOVERY</span>
            <h3>Test the response, not just the running process.</h3>
            <p>
              In the paired Linux experiment, the original keeps returning the
              old application. The candidate serves the new route while the same
              HAProxy manager survives.
            </p>
            <Link
              href={`${github}/empirical-architecture/actions/workflows/ray-recovery.yml`}
            >
              Inspect the Linux validation <ArrowUpRight size={18} />
            </Link>
          </article>
        </div>
        <div className="project-evidence">
          <CheckCircle2 size={22} />
          <p>
            <strong>14 local recovery and shutdown checks pass.</strong> Actual
            Ray processes test replacement, version reuse and retry behavior. A
            separate unit test checks orderly HAProxy shutdown.
          </p>
        </div>
        <p className="project-caveat">
          The HTTP result is from one CPU node; multi-node, GPU and production
          deployments remain untested. Only HAProxyManager enables replacement
          discovery. This is a reliability candidate, with no model-quality or
          compute-saving claim. The reviewed and tested patch is submitted to
          Ray; maintainer acceptance and upstream checks remain separate gates.
        </p>
      </section>
      <section
        className="graphiti-feature pertpy-feature"
        id="neurogym"
        aria-labelledby="neurogym-title"
      >
        <div className="project-status">
          <span className="status-light" /> CONTRIBUTION SUBMITTED · AWAITING
          REVIEW
        </div>
        <div className="graphiti-heading">
          <div>
            <span className="eyebrow">
              SUBMITTED PROJECT / OBSERVABLE DECISIONS
            </span>
            <h2 id="neurogym-title">
              Can the agent see
              <br />
              when to act?
            </h2>
          </div>
          <p>
            A NeuroGym task could demand different answers after identical
            visible histories. Our proposed fix keeps the existing wait signal
            on until the decision period begins, making the intended action
            window visible.
          </p>
        </div>
        <div className="graphiti-fixes">
          <article>
            <span className="project-number">01 / INFORMATION</span>
            <h3>Give the learner the missing signal.</h3>
            <p>
              The same observation-driven policy responds early four times
              before the correction, and zero times afterwards, in each of four
              controlled rollouts. Reward stays at 1 in both versions.
            </p>
            <Link href="https://github.com/neurogym/neurogym/pull/295">
              Review the proposed fix <ArrowUpRight size={18} />
            </Link>
          </article>
          <article>
            <span className="project-number">02 / PRESERVATION</span>
            <h3>Change the cue, preserve the experiment.</h3>
            <p>
              Across 240 noisy seeded trials, all other observation channels,
              targets, sampled timings and trial draws match. Twenty new cases
              fail on the original; all 32 new cases pass with the correction.
            </p>
            <Link href="/research/NeuroGym_Contribution_Report.md">
              Read the measured results <ArrowUpRight size={18} />
            </Link>
          </article>
        </div>
        <figure className="pertpy-result">
          <Image
            src="/research/NeuroGym_Go_Cue.png"
            width={1890}
            height={1224}
            loading="lazy"
            unoptimized
            alt="Recorded before and after traces: keeping the fixation cue active through stimulus and delay distinguishes waiting from the decision period."
          />
          <figcaption>
            Recorded task signals and policy responses, using the same
            controlled trials.{' '}
            <Link href="/research/NeuroGym_Go_Cue.png">
              Open the full-size chart.
            </Link>
          </figcaption>
        </figure>
        <div className="project-evidence">
          <CheckCircle2 size={22} />
          <p>
            <strong>All 132 tests in the full candidate suite pass.</strong>{' '}
            Lint, formatting, type checking and package builds pass on the
            tested Windows/Python 3.12 runtime.{' '}
            <Link href="/research/NeuroGym_Contribution_Package.zip">
              Download the patch and reproduction evidence.
            </Link>
          </p>
        </div>
        <p className="project-caveat">
          Submitted for maintainer review; not merged. The cue enables waiting;
          existing reward rules still ignore premature responses. This is a task
          correctness repair, with no trained-model improvement established.
          Maintainers will decide the compatibility policy.
        </p>
      </section>
      <section
        className="graphiti-feature pertpy-feature"
        id="pertpy"
        aria-labelledby="pertpy-title"
      >
        <div className="project-status">
          <span className="status-light" /> CONTRIBUTION SUBMITTED · AWAITING
          REVIEW
        </div>
        <div className="graphiti-heading">
          <div>
            <span className="eyebrow">BIOLOGICAL PREDICTION</span>
            <h2 id="pertpy-title">
              Does the prediction
              <br />
              actually work?
            </h2>
          </div>
          <p>
            Our Pertpy evaluator checks biological predictions against simple
            baselines, keeps training and test cells separate, and makes missing
            or misleading scores visible. The contribution and review are
            public.
          </p>
        </div>
        <div className="graphiti-fixes">
          <article>
            <span className="project-number">01 / REAL CELLS</span>
            <h3>Eight unseen gene combinations.</h3>
            <p>
              We tested the evaluator on 4,553 selected cells from the Norman
              dataset. Conventional additive predictions beat the no-change
              baseline in seven of eight combinations.
            </p>
            <Link href="https://github.com/scverse/pertpy/pull/1098">
              Review Pertpy PR #1098 <ArrowUpRight size={18} />
            </Link>
          </article>
          <article>
            <span className="project-number">
              02 / A NECESSARY REALITY CHECK
            </span>
            <h3>Good correlation can hide a bad answer.</h3>
            <p>
              One combination scored 0.84 on response correlation, yet had 3.06
              times the squared prediction error of the no-change baseline. A
              single attractive score would hide that failure.
            </p>
            <Link href="/research/Pertpy_Evaluation_Report.md">
              Read the results and limits <ArrowUpRight size={18} />
            </Link>
          </article>
        </div>
        <figure className="pertpy-result">
          <Image
            src="/research/Norman_Baseline_Comparison.png"
            width={2040}
            height={1156}
            loading="lazy"
            unoptimized
            alt="Additive prediction lowers mean squared error in seven of eight held-out gene combinations. DUSP9 plus MAPK1 has correlation 0.84 but 3.06 times the no-change error."
          />
          <figcaption>
            Conventional baselines on one K562 dataset. IDA has not yet been
            scored.{' '}
            <Link href="/research/Norman_Baseline_Comparison.png">
              Open the full-size chart.
            </Link>
          </figcaption>
        </figure>
        <div className="project-evidence">
          <CheckCircle2 size={22} />
          <p>
            <strong>
              71 maintained evaluator tests pass on Python 3.12 and 3.14.
            </strong>{' '}
            The latest test update raises measured line coverage from 90.67% to
            99.11%, with no failures or skips.{' '}
            <Link href="https://github.com/thantiklermcirony/pertpy/actions/runs/34429620981">
              Inspect the test results.
            </Link>{' '}
            <Link href="https://github.com/thantiklermcirony/pertpy/actions/runs/34415474373">
              Inspect the earlier real-data validation.
            </Link>
          </p>
        </div>
        <p className="project-caveat">
          Submitted for maintainer review; not merged. This is a first
          evaluation API and a testing ground for IDA. It does not establish an
          IDA advantage or a new biological finding.{' '}
          <Link href="/research/Reproduce_Pertpy_Evaluation.md">
            Reproduce the experiment.
          </Link>
        </p>
      </section>
      <section
        className="graphiti-feature"
        id="graphiti"
        aria-labelledby="graphiti-title"
      >
        <div className="project-status">
          <span className="status-light" /> TWO FIXES SUBMITTED · AWAITING
          REVIEW
        </div>
        <div className="graphiti-heading">
          <div>
            <span className="eyebrow">CURRENT OPEN-SOURCE CONTRIBUTION</span>
            <h2 id="graphiti-title">
              Helping AI memory
              <br />
              keep its history.
            </h2>
          </div>
          <p>
            Our Graphiti contributions address two ways a memory system can lose
            track of when a fact was true. The code, reproductions and review
            are public.
          </p>
        </div>
        <div className="graphiti-fixes">
          <article>
            <span className="project-number">01 / HISTORY</span>
            <h3>A fact can become true again.</h3>
            <p>
              An assignment ends, then resumes. Identical wording should not
              erase the later occurrence.
            </p>
            <div className="memory-example">
              <span>
                Before <b>Earlier, expired memory reused</b>
              </span>
              <span>
                After <b>Separate occurrence preserved</b>
              </span>
            </div>
            <Link href="https://github.com/getzep/graphiti/pull/1867">
              Review the history fix <ArrowUpRight size={18} />
            </Link>
          </article>
          <article>
            <span className="project-number">02 / TIME</span>
            <h3>A save should not change an answer.</h3>
            <p>
              Reading and resaving a timestamp changed answers at exact
              boundaries. Normalizing its representation prevents that drift.
            </p>
            <div className="memory-example">
              <span>
                Before <b>Same instant, changed boundary answer</b>
              </span>
              <span>
                After <b>Boundary answer preserved</b>
              </span>
            </div>
            <Link href="https://github.com/getzep/graphiti/pull/1866">
              Review the timestamp fix <ArrowUpRight size={18} />
            </Link>
          </article>
        </div>
        <div className="project-evidence">
          <CheckCircle2 size={22} />
          <p>
            <strong>48 targeted regression cases pass.</strong> Each published
            branch also passed its separate unit checks. A real Neo4j audit
            confirmed the tested boundary behavior.{' '}
            <Link href="https://github.com/thantiklermcirony/empirical-observatory/blob/main/public/research/Graphiti.md">
              Read the evidence and remaining limits.
            </Link>
          </p>
        </div>
        <p className="project-caveat">
          These are tested correctness repairs, awaiting maintainer acceptance.
          They do not establish a general AI advantage. Status recorded 10
          September 2026; the pull requests show the latest review and checks.
        </p>
      </section>
      <section
        className="project-contribute"
        id="next"
        aria-labelledby="next-title"
      >
        <span className="eyebrow">NEXT MISSIONS / RESEARCH SHORTLIST</span>
        <h2 id="next-title">Make silent failures visible.</h2>
        <p>
          Three investigations chosen for useful, testable contributions. These
          include the submitted Ray recovery fix and two researched
          opportunities. Upstream agreement remains separate from our
          experiments. Existing authors keep credit for their work.
        </p>
        <div className="project-grid">
          {nextMissions.map((mission) => (
            <article className="project-card" key={mission.name}>
              <span className="eyebrow">{mission.status}</span>
              <h3>{mission.name}</h3>
              <p>{mission.description}</p>
              <Link className="project-action" href={mission.href}>
                Read the open problem <ArrowUpRight size={18} />
              </Link>
              <p className="project-caveat">{mission.gate}</p>
            </article>
          ))}
        </div>
        <Link className="text-link" href="/research/Next_Big_Three.md">
          Read the scan, earlier lessons and Tesla / SpaceX findings{' '}
          <ArrowUpRight size={18} />
        </Link>
      </section>
      <section className="project-grid" aria-label="Projects to explore">
        {projects.map((project) => (
          <article className="project-card" key={project.name}>
            <span className="eyebrow">{project.status}</span>
            <h2>{project.name}</h2>
            <p>{project.description}</p>
            <Link className="project-action" href={project.href}>
              {project.action} <ArrowUpRight size={18} />
            </Link>
            <Link className="project-source" href={project.source}>
              Methods & source
            </Link>
          </article>
        ))}
      </section>
      <section className="project-contribute">
        <span className="eyebrow">BUILD WITH US</span>
        <h2>Bring a test, a counterexample, or a better baseline.</h2>
        <p>
          The most useful contribution makes a specific claim easier to check.
        </p>
        <div className="project-links">
          <Link
            href={`${github}/empirical-architecture/blob/main/CONTRIBUTING.md`}
          >
            Find a way to contribute <ArrowUpRight size={18} />
          </Link>
          <Link
            href={`${github}/empirical-observatory/tree/main/research/contribution-scan`}
          >
            Explore open problems <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <footer className="projects-footer">
        Founded by Daniel J. Murray · Experiments, evidence and code are
        identified separately.<Link href="/">Return to the Observatory</Link>
      </footer>
    </main>
  );
}
