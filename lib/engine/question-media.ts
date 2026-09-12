import type { Frame, Investigation } from './question.ts';
export function frameScale(frame: Frame) {
  const points = frame.series.flatMap((s) => s.points);
  return {
    min: frame.yDomain?.[0] ?? Math.min(0, ...points.map((p) => p.y)),
    max:
      frame.yDomain?.[1] ??
      Math.max(1e-8, frame.threshold ?? 0, ...points.map((p) => p.y)) * 1.1,
    maxx:
      Math.max(1e-8, ...points.map((p) => p.x)) *
      (frame.kind === 'scatter' ? 1.1 : 1),
    bars:
      frame.kind === 'bars' ||
      (!frame.kind && frame.series.every((s) => s.points.length === 1)),
    scatter: frame.kind === 'scatter',
  };
}
const esc = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
export function questionSvg(
  run: Investigation,
  index = run.passes.length - 1,
): string {
  const p = run.passes[index];
  if (!p) throw new Error('Run a check before exporting a graphic.');
  const colors = [
    '#f5bd77',
    '#79e6d5',
    '#b4a5fa',
    '#8bc5ff',
    '#ef8db8',
    '#bac87d',
  ];
  const { max, min, maxx, bars, scatter } = frameScale(p.frame);
  const y = (n: number) => 575 - (255 * (n - min)) / (max - min);
  const text = (
    s: string,
    x: number,
    y: number,
    size = 20,
    color = '#e3ecee',
  ) =>
    `<text x="${x}" y="${y}" fill="${color}" font-size="${size}">${esc(s)}</text>`;
  const wrap = (s: string, line: number) =>
    s
      .match(/.{1,85}(?:\s|$)|.{1,85}/g)
      ?.slice(0, 3)
      .map((t, i) => text(t.trim(), 50, line + i * 28))
      .join('') ?? '';
  const plot = p.frame.series
    .map((s, i) =>
      bars
        ? `<rect x="${85 + (i * 950) / p.frame.series.length}" y="${y(s.points[0].y)}" width="75" height="${Math.max(1, y(0) - y(s.points[0].y))}" fill="${colors[i % 6]}"/>`
        : scatter
          ? s.points
              .map(
                (pt) =>
                  `<circle cx="${80 + (950 * pt.x) / maxx}" cy="${y(pt.y)}" r="7" fill="${colors[i % 6]}"/>`,
              )
              .join('')
          : `<path fill="none" stroke="${colors[i % 6]}" stroke-width="3" d="${s.points.map((pt, j) => `${j ? 'L' : 'M'}${80 + (950 * pt.x) / maxx},${y(pt.y)}`).join(' ')}"/>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><desc>${esc('Original prompt (not established): ' + run.prompt + '. Executable interpretation: ' + run.effectiveQuestion)}</desc><rect width="1200" height="900" fill="#071018"/><g font-family="monospace">${text('THE EMPIRICAL OBSERVATORY / QUESTION DESK', 50, 48, 17, '#79e6d5')}${text(`PASS ${index + 1} / ${run.model} / ${run.status}`, 50, 80, 15, '#a0b2bd')}${wrap('Computed question: ' + p.question, 125)}${text(p.frame.title, 50, 245, 27)}${text(p.frame.yLabel, 50, 280, 16, '#a0b2bd')}${[0, 0.5, 1].map((t) => `<line x1="80" x2="1090" y1="${575 - 255 * t}" y2="${575 - 255 * t}" stroke="#304650"/>${text(Number((min + t * (max - min)).toPrecision(3)).toString(), 15, 580 - 255 * t, 13, '#a0b2bd')}`).join('')}${plot}${p.frame.threshold === undefined ? '' : `<line x1="80" x2="1090" y1="${y(p.frame.threshold)}" y2="${y(p.frame.threshold)}" stroke="#ef8db8" stroke-dasharray="8 6"/>${text('Error threshold < ' + p.frame.threshold, 820, y(p.frame.threshold) - 10, 14)}`}${!bars ? [0, 0.5, 1].map((t) => text(Number((maxx * t).toPrecision(3)).toString(), 80 + 950 * t, 596, 13)).join('') : ''}${text(p.frame.xLabel, 80, 610, 16, '#a0b2bd')}${p.frame.series.map((s, i) => text(s.label, 60 + (i % 3) * 370, 650 + Math.floor(i / 3) * 25, 15, colors[i % 6])).join('')}${wrap(p.answer, 737)}${text('Conditional model calculation · illustration is not new experimental evidence', 50, 850, 15, '#a0b2bd')}${text(`Replay: /question · ${run.version} · base parameter ${run.parameter}${p.values.tau === undefined ? '' : ` · effective τ ${p.values.tau}`} · original unverified`, 50, 875, 14, '#a0b2bd')}</g></svg>`;
}
