import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Orbit } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Current projects — The Empirical Architecture',
  description:
    'Try our open experiments, inspect two tested Graphiti memory fixes, and find a concrete way to contribute.',
};

const github = 'https://github.com/thantiklermcirony';
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
      <section className="graphiti-feature" aria-labelledby="graphiti-title">
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
