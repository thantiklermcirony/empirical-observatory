'use client';
/* oxlint-disable next/no-html-link-for-pages -- Native navigation avoids the reproduced vinext production Link runtime failure. */
import { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Orbit,
  RotateCcw,
  Layers3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  atlasNodes,
  atlasEdges,
  atlasColours,
  projectPoint,
} from '@/lib/atlas';
import type { AtlasNode } from '@/lib/atlas';
import DiscoveryLoop from '@/components/observatory/DiscoveryLoop';

export default function ResearchAtlas() {
  const [selected, setSelected] = useState('centre');
  const [camera, setCamera] = useState({ yaw: 0.22, pitch: 0.24, zoom: 1 });
  const [filter, setFilter] = useState('all');
  const dossier = useRef<HTMLElement | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    yaw: number;
    pitch: number;
    moved: boolean;
  } | null>(null);
  const node = atlasNodes.find((n) => n.id === selected)!;
  const shown = atlasNodes.filter(
    (n) => filter === 'all' || n.family === filter || n.id === 'centre',
  );
  const points = Object.fromEntries(
    atlasNodes.map((n) => [
      n.id,
      projectPoint(n.position, camera.yaw, camera.pitch, camera.zoom),
    ]),
  );
  const related = atlasEdges.filter(
    (e) => e.from === selected || e.to === selected,
  );
  const choose = (id: string) => {
    setSelected(id);
    if (window.matchMedia('(max-width: 1150px)').matches) {
      requestAnimationFrame(() =>
        dossier.current?.scrollIntoView({ block: 'start' }),
      );
    }
  };
  return (
    <main className="atlas-page">
      <header className="atlas-header">
        <a className="atlas-brand" href="/">
          <Orbit size={26} />
          <span>
            EMPIRICAL OBSERVATORY<strong>RESEARCH ATLAS / 01</strong>
          </span>
        </a>
        <nav>
          <a href="/recovery">
            Recovery Lab <ArrowUpRight size={15} />
          </a>
          <a href="#discovery">
            Run exploration <ArrowUpRight size={15} />
          </a>
          <a href="/cell">
            Virtual Cell <ArrowUpRight size={15} />
          </a>
          <a href="/projects">
            <ArrowLeft size={15} /> Current projects
          </a>
        </nav>
      </header>
      <div className="atlas-intro">
        <div>
          <span className="atlas-kicker">SCIENCE-WIDE / EVIDENCE ATTACHED</span>
          <h1>What must we remember?</h1>
        </div>
        <p>
          Explore a research line. Inspect what it establishes. Find the next
          test.
        </p>
      </div>
      <section
        className="atlas-workspace"
        aria-label="Interactive programme atlas"
      >
        <aside className="atlas-index" id="atlas-index">
          <label htmlFor="atlas-filter">Research layers</label>
          <select
            id="atlas-filter"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              if (e.target.value !== 'all' && node.family !== e.target.value)
                setSelected('centre');
            }}
          >
            <option value="all">Whole programme</option>
            <option value="foundation">Foundations</option>
            <option value="experiment">Working experiments</option>
            <option value="research">Research directions</option>
          </select>
          <div className="atlas-node-list">
            {shown.map((n) => (
              <button
                key={n.id}
                onClick={() => choose(n.id)}
                aria-pressed={selected === n.id}
              >
                <i style={{ background: atlasColours[n.family] }} />
                <span>{n.title}</span>
              </button>
            ))}
          </div>
          <p className="atlas-small">
            41 manuscript records underpin the wider programme. Each selected
            line carries its own scope and next obligation.
          </p>
        </aside>
        <div className="atlas-map">
          <div className="atlas-map-toolbar">
            <span>
              <Layers3 size={15} /> PERSPECTIVE VIEW
            </span>
            <Button
              variant="ghost"
              onClick={() => setCamera({ yaw: 0.22, pitch: 0.24, zoom: 1 })}
              aria-label="Reset atlas view"
            >
              <RotateCcw size={16} /> Reset
            </Button>
          </div>
          <svg
            viewBox="0 0 700 540"
            aria-label="Rotatable programme graph; select research lines using the list or graph labels"
            onPointerDown={(e) => {
              if ((e.target as Element).closest('[data-node]')) return;
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                yaw: camera.yaw,
                pitch: camera.pitch,
                moved: false,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              d.moved = true;
              setCamera((c) => ({
                ...c,
                yaw: d.yaw + (e.clientX - d.x) * 0.008,
                pitch: Math.max(
                  -0.65,
                  Math.min(0.85, d.pitch + (e.clientY - d.y) * 0.006),
                ),
              }));
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <defs>
              <radialGradient id="atlas-field">
                <stop stopColor="#155967" stopOpacity=".36" />
                <stop offset="1" stopColor="#08151d" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse
              cx="350"
              cy="270"
              rx="320"
              ry="235"
              fill="url(#atlas-field)"
            />
            {[1.8, 3.8, 6.2].map((radius) => (
              <path
                key={radius}
                d={Array.from({ length: 65 }, (_, i) => {
                  const a = (i * Math.PI) / 32;
                  const p = projectPoint(
                    [radius * Math.cos(a), -2.5, radius * Math.sin(a)],
                    camera.yaw,
                    camera.pitch,
                    camera.zoom,
                  );
                  return (
                    (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)
                  );
                }).join(' ')}
                fill="none"
                stroke="#315569"
                strokeDasharray="3 7"
              />
            ))}
            {atlasEdges
              .filter(
                (e) =>
                  shown.some((n) => n.id === e.from) &&
                  shown.some((n) => n.id === e.to),
              )
              .map((e) => (
                <line
                  key={e.from + e.to}
                  x1={points[e.from][0]}
                  y1={points[e.from][1]}
                  x2={points[e.to][0]}
                  y2={points[e.to][1]}
                  stroke={e.kind === 'hypothesis' ? '#e8b772' : '#67d9fa'}
                  strokeWidth={
                    e.from === selected || e.to === selected ? 1.5 : 0.7
                  }
                  opacity={e.from === selected || e.to === selected ? 0.7 : 0.2}
                  strokeDasharray={e.kind === 'hypothesis' ? '5 5' : undefined}
                />
              ))}
            {[...shown]
              .sort((a, b) => points[b.id][2] - points[a.id][2])
              .map((n) => (
                <g
                  key={n.id}
                  data-node={n.id}
                  transform={
                    'translate(' + points[n.id][0] + ',' + points[n.id][1] + ')'
                  }
                  className={
                    'atlas-graph-node ' +
                    (selected === n.id ? 'is-selected' : '')
                  }
                  onClick={() => choose(n.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={'Explore ' + n.title}
                  aria-pressed={selected === n.id}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      choose(n.id);
                    }
                  }}
                >
                  <circle
                    r={n.id === 'centre' ? 24 : 14}
                    fill="#0a1d28"
                    stroke={atlasColours[n.family]}
                    strokeWidth={selected === n.id ? 2 : 1}
                  />
                  <circle
                    r={selected === n.id ? 7 : 4}
                    fill={atlasColours[n.family]}
                  />
                  {selected === n.id && (
                    <circle
                      r={n.id === 'centre' ? 33 : 23}
                      fill="none"
                      stroke={atlasColours[n.family]}
                      strokeDasharray="3 5"
                    />
                  )}
                  <text y={n.id === 'centre' ? 48 : 33} textAnchor="middle">
                    {n.title}
                  </text>
                </g>
              ))}
          </svg>
          <div className="atlas-camera">
            <Button
              variant="ghost"
              onClick={() => setCamera((c) => ({ ...c, yaw: c.yaw - 0.25 }))}
            >
              Rotate left
            </Button>
            <label>
              Zoom
              <input
                aria-label="Atlas zoom"
                type="range"
                min=".65"
                max="1.15"
                step=".05"
                value={camera.zoom}
                onChange={(e) =>
                  setCamera((c) => ({ ...c, zoom: Number(e.target.value) }))
                }
              />
            </label>
            <Button
              variant="ghost"
              onClick={() => setCamera((c) => ({ ...c, yaw: c.yaw + 0.25 }))}
            >
              Rotate right
            </Button>
          </div>
          <p className="atlas-map-note">
            Drag the field to rotate. Positions are a curated navigation layout;
            distance, colour and glow do not measure truth or physical geometry.
          </p>
        </div>
        <aside className="atlas-dossier" aria-live="polite" ref={dossier}>
          <span className="atlas-kicker">
            {node.family === 'centre'
              ? 'THE ORGANISING QUESTION'
              : node.family.toUpperCase()}
          </span>
          <h2>{node.title}</h2>
          <p className="atlas-question">{node.question}</p>
          <Dossier node={node} />
          <a href={node.source} className="atlas-source">
            {node.sourceLabel}
            <ArrowUpRight size={17} />
          </a>
          <a href="#atlas-index" className="atlas-return">
            Choose another research line ↑
          </a>
        </aside>
      </section>
      <section className="atlas-relations">
        <h2>Why these lines connect</h2>
        <div>
          {related.map((e) => (
            <article key={e.from + e.to}>
              <span>{e.kind}</span>
              <strong>
                {
                  atlasNodes.find(
                    (n) => n.id === (e.from === selected ? e.to : e.from),
                  )?.title
                }
              </strong>
              <p>{e.label}</p>
            </article>
          ))}
        </div>
      </section>
      <DiscoveryLoop />
      <section className="atlas-evolution">
        <div>
          <span className="atlas-kicker">
            STABLE METHOD / REVISABLE EXPLANATIONS
          </span>
          <h2>
            The centre is a question.
            <br />
            The answer can change.
          </h2>
          <p>
            Preserve source, context, uncertainty and failed tests. Revise a
            model when a new observation distinguishes what it had treated as
            equal. Changing the test, assumptions or acceptance rule creates a
            new version.
          </p>
        </div>
        <div>
          <h3>What evolves now?</h3>
          <p>
            The simulation above updates beliefs and selects its next test. Its
            policy stays fixed. The published map changes through reviewed
            releases. It does not autonomously rewrite itself, certify a theorem
            or promote a visitor’s conclusion into shared knowledge.
          </p>
          <a href="/cell">
            Inspect the latest completed experiment <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
    </main>
  );
}
function Dossier({ node }: { node: AtlasNode }) {
  return (
    <dl>
      <dt>What we have</dt>
      <dd>{node.evidence}</dd>
      <dt>What remains open</dt>
      <dd>{node.limit}</dd>
      <dt>Next discriminating test</dt>
      <dd>{node.next}</dd>
    </dl>
  );
}
