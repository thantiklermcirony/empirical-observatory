'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The labelled overflow table region must receive keyboard focus for horizontal scrolling. */
/* oxlint-disable next/no-html-link-for-pages -- Native links preserve the existing Cell Explorer navigation contract. */

import { useId, useState } from 'react';

export type RiskCoverage = 1 | 0.9 | 0.75 | 0.5;
export type RiskValues = Partial<Record<RiskCoverage, number | null>>;
export type CellRiskEvidence = {
  status: 'not_started' | 'running' | 'completed' | 'failed' | 'blocked';
  statusDetail?: string;
  coverages: readonly RiskCoverage[];
  folds: readonly { id: string; label: string }[];
  methods: readonly {
    id: string;
    label: string;
    role: 'candidate' | 'conventional';
    overall: RiskValues;
    folds: Record<string, RiskValues>;
  }[];
  fullCoverageEqual: boolean | null;
  gate: {
    passed: boolean | null;
    criterion: string;
    /** 1 - candidate / strongest conventional at the frozen 75% endpoint. */
    relativeImprovement: number | null;
    foldWins: number | null;
    comparatorLabel?: string;
  };
  chosenParameters: readonly { foldId: string; description: string }[];
  /** Exact reviewed caveat; displayed verbatim, including the dataset scope. */
  scopeNote: string;
  limitations: readonly string[];
  source: { label: string; href: string };
  evidence: { label: string; href: string };
  download?: { label: string; href: string };
};

const coverageOrder: readonly RiskCoverage[] = [1, 0.9, 0.75, 0.5];
const statusLabels: Record<CellRiskEvidence['status'], string> = {
  not_started: 'Not run',
  running: 'Evaluation running',
  completed: 'Completed evaluation',
  failed: 'Evaluation failed',
  blocked: 'Evaluation blocked',
};
const numberFormat = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 6,
});
const percentFormat = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
});
const validMse = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const formatMse = (value: unknown) =>
  validMse(value) ? numberFormat.format(value) : 'Unavailable';
const safeHref = (href: string) =>
  /^(https?:\/\/|\/(?!\/))/.test(href) ? href : undefined;

function EvidenceLink({
  link,
  download = false,
}: {
  link: { label: string; href: string };
  download?: boolean;
}) {
  const href = safeHref(link.href);
  return href ? (
    <a href={href} download={download || undefined}>
      {link.label} <span aria-hidden="true">↗</span>
    </a>
  ) : (
    <span>{link.label} — link unavailable</span>
  );
}

export default function CellRiskFlight({
  evidence,
}: {
  evidence: CellRiskEvidence;
}) {
  const id = useId();
  const [requestedCoverage, setRequestedCoverage] =
    useState<RiskCoverage>(0.75);
  const [view, setView] = useState<'overall' | 'folds'>('overall');
  const suppliedCoverages = coverageOrder.filter((q) =>
    evidence.coverages.includes(q),
  );
  const coverage = suppliedCoverages.includes(requestedCoverage)
    ? requestedCoverage
    : (suppliedCoverages[0] ?? null);
  const completed = evidence.status === 'completed';
  const hasResults =
    completed && coverage !== null && evidence.methods.length > 0;
  const columns =
    view === 'overall'
      ? [{ id: 'overall', label: 'All cell lines' }]
      : evidence.folds;
  const valueFor = (
    method: CellRiskEvidence['methods'][number],
    column: string,
  ) =>
    coverage === null
      ? undefined
      : view === 'overall'
        ? method.overall[coverage]
        : method.folds[column]?.[coverage];
  const displayedValues = evidence.methods.flatMap((method) =>
    columns.map((column) => valueFor(method, column.id)).filter(validMse),
  );
  const barMaximum = Math.max(0, ...displayedValues);
  const gateReady = completed && evidence.fullCoverageEqual === true;
  const gateLabel =
    !completed || evidence.gate.passed === null
      ? 'Not evaluated'
      : !gateReady
        ? 'Comparison not verified'
        : evidence.gate.passed
          ? 'Passed'
          : 'Not met';
  const improvement = evidence.gate.relativeImprovement;
  const foldWins = evidence.gate.foldWins;

  return (
    <section
      id="flight02"
      className="cell-console cell-risk-flight"
      aria-labelledby={`${id}-title`}
    >
      <style>{`
        .cell-risk-flight { color: var(--foreground); }
        .cell-risk-flight .cell-console-head { align-items: flex-start; flex-wrap: wrap; }
        .cell-risk-flight .cell-kicker { font-size: .75rem; }
        .cell-risk-flight .cell-status { font-size: .8125rem; white-space: normal; }
        .cell-risk-flight .cell-controls { grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr)); }
        .cell-risk-flight .cell-controls label, .cell-risk-flight .cell-note { font-size: .875rem; }
        .cell-risk-flight .cell-controls select:focus-visible { outline: 2px solid var(--ring); outline-offset: 3px; }
        .cell-risk-flight .risk-checks { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr)); gap: 1rem; margin: 1.5rem 0; }
        .cell-risk-flight .risk-checks > div { border: 1px solid var(--border); padding: 1rem; background: var(--background); }
        .cell-risk-flight .risk-checks span { display: block; font-size: .875rem; color: var(--muted-foreground); }
        .cell-risk-flight .risk-checks strong { display: block; font-size: 1.25rem; margin: .5rem 0; }
        .cell-risk-flight .risk-checks .risk-pass { color: var(--primary); }
        .cell-risk-flight .risk-checks .risk-unmet { color: var(--amber); }
        .cell-risk-flight .cell-table-wrap table { font-size: .875rem; }
        .cell-risk-flight .cell-table-wrap th { font-size: .875rem; }
        .cell-risk-flight caption { text-align: left; color: var(--muted-foreground); line-height: 1.6; margin-bottom: .75rem; }
        .cell-risk-flight .risk-value { min-width: 8rem; font-variant-numeric: tabular-nums; }
        .cell-risk-flight .risk-track { width: 100%; height: .375rem; margin-top: .5rem; background: var(--muted); }
        .cell-risk-flight .risk-track span { height: 100%; display: block; background: var(--violet); }
        .cell-risk-flight .risk-candidate .risk-track span { background: var(--primary); }
        .cell-risk-flight .risk-role { display: block; color: var(--muted-foreground); font-family: var(--font-geist-sans), sans-serif; font-size: .8125rem; margin-top: .25rem; }
        .cell-risk-flight details { margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem; }
        .cell-risk-flight summary { cursor: pointer; font-size: 1rem; }
        .cell-risk-flight .risk-parameters { margin: 1rem 0; }
        .cell-risk-flight .risk-parameters > div { display: flex; flex-wrap: wrap; gap: .5rem 1rem; margin: .5rem 0; }
        .cell-risk-flight .risk-parameters dt { font-weight: 600; }
        .cell-risk-flight .risk-parameters dd { margin: 0; color: var(--muted-foreground); }
        .cell-risk-flight .risk-limitations { padding-left: 1.25rem; color: var(--muted-foreground); line-height: 1.7; }
        .cell-risk-flight .cell-evidence-links { margin-top: 1rem; }
        .cell-risk-flight .cell-evidence-links a { font-size: .875rem; }
      `}</style>
      <div className="cell-console-head">
        <div>
          <p className="cell-kicker">VIRTUAL CELL / FLIGHT 02</p>
          <h2 id={`${id}-title`}>Which predictions should we trust?</h2>
        </div>
        <span className="cell-status">{statusLabels[evidence.status]}</span>
      </div>
      <p>
        Compare rules for retaining predictions. Every rule uses the same
        source-mean predictor; the choice is which predictions to keep.
      </p>
      {evidence.statusDetail && (
        <p className="cell-note" role="status">
          {evidence.statusDetail}
        </p>
      )}

      <div className="cell-controls">
        <label htmlFor={`${id}-coverage`}>
          Nominal fraction retained
          <select
            id={`${id}-coverage`}
            value={coverage ?? ''}
            disabled={!hasResults}
            onChange={(event) =>
              setRequestedCoverage(Number(event.target.value) as RiskCoverage)
            }
          >
            {coverage === null && (
              <option value="">Coverage unavailable</option>
            )}
            {coverageOrder.map((q) => (
              <option
                key={q}
                value={q}
                disabled={!suppliedCoverages.includes(q)}
              >
                {percentFormat.format(q)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-view`}>
          Compare results
          <select
            id={`${id}-view`}
            value={view}
            disabled={!hasResults}
            onChange={(event) =>
              setView(event.target.value as 'overall' | 'folds')
            }
          >
            <option value="overall">All cell lines</option>
            <option value="folds" disabled={evidence.folds.length === 0}>
              Five held-out folds
            </option>
          </select>
        </label>
      </div>
      <p className="cell-note">
        Retained counts are rounded up within each cell line. The realized
        fraction can be slightly higher. Retention is not a calibrated
        confidence level.
      </p>

      {hasResults && columns.length > 0 ? (
        <div
          className="cell-table-wrap"
          role="region"
          aria-label="Retained prediction error"
          tabIndex={0}
        >
          <table>
            <caption>
              {percentFormat.format(coverage)} nominal retention · mean squared
              error, lower is better. Each cell line has equal weight.
            </caption>
            <thead>
              <tr>
                <th scope="col">Ranking rule</th>
                {columns.map((column) => (
                  <th key={column.id} scope="col">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evidence.methods.map((method) => (
                <tr
                  key={method.id}
                  className={
                    method.role === 'candidate' ? 'risk-candidate' : undefined
                  }
                >
                  <th scope="row">
                    {method.label}
                    <span className="risk-role">
                      {method.role === 'candidate'
                        ? 'Candidate'
                        : 'Conventional comparison'}
                    </span>
                  </th>
                  {columns.map((column) => {
                    const value = valueFor(method, column.id);
                    return (
                      <td
                        key={column.id}
                        className="risk-value"
                        title={validMse(value) ? String(value) : undefined}
                      >
                        {formatMse(value)}
                        {validMse(value) && (
                          <div className="risk-track" aria-hidden="true">
                            <span
                              style={{
                                width: `${barMaximum > 0 ? (value / barMaximum) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cell-note">
          No completed comparison has been supplied for this view.
        </p>
      )}

      <div className="risk-checks">
        <div>
          <span>Frozen success gate · 75% retention</span>
          <strong
            className={
              gateReady && evidence.gate.passed === true
                ? 'risk-pass'
                : 'risk-unmet'
            }
          >
            {gateLabel}
          </strong>
          <p className="cell-note">{evidence.gate.criterion}</p>
        </div>
        <div>
          <span>Full-coverage equality check</span>
          <strong>
            {!completed || evidence.fullCoverageEqual === null
              ? 'Not verified'
              : evidence.fullCoverageEqual
                ? 'Passed'
                : 'Failed'}
          </strong>
          <p className="cell-note">
            At 100% retention, ranking rules must recover the same
            mean-predictor error.
          </p>
        </div>
        <div>
          <span>Risk reduction at the frozen 75% endpoint</span>
          <strong>
            {gateReady &&
            typeof improvement === 'number' &&
            Number.isFinite(improvement)
              ? percentFormat.format(improvement)
              : 'Unavailable'}
          </strong>
          <p className="cell-note">
            {evidence.gate.comparatorLabel
              ? `Compared with ${evidence.gate.comparatorLabel}. `
              : 'Compared with the strongest conventional rule. '}
            {gateReady &&
            typeof foldWins === 'number' &&
            Number.isInteger(foldWins) &&
            foldWins >= 0 &&
            foldWins <= evidence.folds.length
              ? `Against each fold's best conventional rule, lower error in ${foldWins} of ${evidence.folds.length} folds.`
              : 'Fold advantage not supplied.'}{' '}
            A negative reduction means higher error.
          </p>
        </div>
      </div>
      <p className="cell-note">
        Changing the display does not change the frozen 75% success gate. A
        failed gate remains part of the result.
      </p>
      <p className="cell-note">{evidence.scopeNote}</p>

      <details>
        <summary>Chosen settings, scope and evidence</summary>
        {evidence.chosenParameters.length > 0 ? (
          <dl className="risk-parameters">
            {evidence.chosenParameters.map((setting) => (
              <div key={setting.foldId}>
                <dt>
                  {evidence.folds.find((fold) => fold.id === setting.foldId)
                    ?.label ?? setting.foldId}
                </dt>
                <dd>{setting.description}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="cell-note">No chosen settings supplied.</p>
        )}
        {evidence.limitations.length > 0 && (
          <ul className="risk-limitations">
            {evidence.limitations.map((limit, i) => (
              <li key={i}>{limit}</li>
            ))}
          </ul>
        )}
        <div className="cell-evidence-links">
          <EvidenceLink link={evidence.source} />
          <EvidenceLink link={evidence.evidence} />
          {evidence.download && (
            <EvidenceLink link={evidence.download} download />
          )}
        </div>
      </details>
    </section>
  );
}
