export type ExposureScenarioId = 'acute' | 'spaced' | 'uniform' | 'late';

export type TemporalPoint = {
  time: number;
  doseRate: number;
  undoneDamage: number;
  mortality: number;
};

export type TemporalRun = {
  id: ExposureScenarioId;
  label: string;
  totalDose: number;
  points: TemporalPoint[];
  finalMortality: number;
  peakDamage: number;
};

export type RateSntParameters = {
  lowEndSlope: number;
  inflectionDose: number;
  asymmetry: number;
  baselineMortality: number;
  infiniteDoseMortality: number;
};

export const publishedRateSntParameters: RateSntParameters = {
  lowEndSlope: 2.18,
  inflectionDose: 180,
  asymmetry: 0.02,
  baselineMortality: 0.12,
  infiniteDoseMortality: 1,
};

// Canonical value from the printed routine; derive every rate display from it.
export const referenceRepairTimeDays = 0.517;
export const referenceRepairRate = 1 / referenceRepairTimeDays;

export function acuteExcessMortality(dose: number, parameters = publishedRateSntParameters) {
  if (!Number.isFinite(dose) || dose < 0) throw new Error('dose must be a non-negative finite number');
  if (dose === 0) return 0;
  const { lowEndSlope, inflectionDose, asymmetry, baselineMortality, infiniteDoseMortality } = parameters;
  const term = Math.pow(dose / inflectionDose, lowEndSlope);
  return (baselineMortality - infiniteDoseMortality) * Math.expm1(-asymmetry * Math.log1p(term));
}

// d[-log(1-C(u))]/du, where C is the acute excess-mortality curve.
export function acuteCumulativeHazardSlope(undone: number, parameters = publishedRateSntParameters) {
  if (!Number.isFinite(undone) || undone < 0) throw new Error('undone damage must be a non-negative finite number');
  if (undone === 0) return 0;
  const { lowEndSlope, inflectionDose, asymmetry, baselineMortality, infiniteDoseMortality } = parameters;
  const mortalityDifference = infiniteDoseMortality - baselineMortality;
  const term = Math.pow(undone / inflectionDose, lowEndSlope);
  const numerator = mortalityDifference * asymmetry * Math.pow(1 + term, -asymmetry - 1)
    * (lowEndSlope / inflectionDose) * Math.pow(undone / inflectionDose, lowEndSlope - 1);
  const survival = 1 - mortalityDifference + mortalityDifference * Math.pow(1 + term, -asymmetry);
  return numerator / survival;
}

function gaussLegendre24() {
  const n = 24;
  const nodes = Array.from({ length: n }, () => 0);
  const weights = Array.from({ length: n }, () => 0);
  for (let i = 0; i < n / 2; i += 1) {
    let root = Math.cos(Math.PI * (i + 0.75) / (n + 0.5));
    let derivative = 0;
    for (let iteration = 0; iteration < 20; iteration += 1) {
      let p0 = 1;
      let p1 = root;
      for (let degree = 2; degree <= n; degree += 1) {
        const p = ((2 * degree - 1) * root * p1 - (degree - 1) * p0) / degree;
        p0 = p1;
        p1 = p;
      }
      derivative = n * (root * p1 - p0) / (root * root - 1);
      const next = root - p1 / derivative;
      if (Math.abs(next - root) < 1e-15) { root = next; break; }
      root = next;
    }
    const weight = 2 / ((1 - root * root) * derivative * derivative);
    nodes[i] = -root;
    nodes[n - 1 - i] = root;
    weights[i] = weight;
    weights[n - 1 - i] = weight;
  }
  return { nodes, weights };
}

const quadrature = gaussLegendre24();

function advanceInterval(undone: number, rate: number, span: number, tau: number) {
  if (span === 0) return { undone, hazard: 0 };
  const equilibrium = rate * tau;
  let integral = 0;
  for (let i = 0; i < quadrature.nodes.length; i += 1) {
    const time = span * (quadrature.nodes[i] + 1) / 2;
    const pathDamage = equilibrium + (undone - equilibrium) * Math.exp(-time / tau);
    integral += quadrature.weights[i] * acuteCumulativeHazardSlope(pathDamage);
  }
  return {
    undone: equilibrium + (undone - equilibrium) * Math.exp(-span / tau),
    hazard: rate * span * integral / 2,
  };
}

export function simulatePiecewiseRateSnt(rates: number[], spans: number[], tau = referenceRepairTimeDays, undone0 = 0) {
  if (rates.length !== spans.length || !rates.length) throw new Error('rates and spans must have the same non-zero length');
  if (!Number.isFinite(tau) || tau <= 0 || !Number.isFinite(undone0) || undone0 < 0) throw new Error('invalid initial state');
  let undone = undone0;
  let cumulativeHazard = 0;
  const mortalities: number[] = [];
  const undones: number[] = [];
  for (let i = 0; i < rates.length; i += 1) {
    if (!Number.isFinite(rates[i]) || rates[i] < 0 || !Number.isFinite(spans[i]) || spans[i] < 0) throw new Error('rates and spans must be non-negative finite numbers');
    const next = advanceInterval(undone, rates[i], spans[i], tau);
    undone = next.undone;
    cumulativeHazard += next.hazard;
    mortalities.push(-Math.expm1(-cumulativeHazard));
    undones.push(undone);
  }
  return { mortalities, undones, cumulativeHazard };
}

export function exposureRate(id: ExposureScenarioId, time: number) {
  if (id === 'acute') return time < 0.1 ? 1000 : 0;
  if (id === 'spaced') return [0, 2, 4, 6, 8].some(start => time >= start && time < start + 0.1) ? 200 : 0;
  if (id === 'late') return time < 9 ? 1 : 91;
  return 10;
}

export function simulateTemporalExposure(
  id: ExposureScenarioId,
  options: { repairRate?: number; duration?: number; dt?: number } = {},
): TemporalRun {
  const repairRate = options.repairRate ?? referenceRepairRate;
  const duration = options.duration ?? 10;
  const dt = options.dt ?? 0.05;
  const tau = 1 / repairRate;
  let undoneDamage = 0;
  let cumulativeHazard = 0;
  let totalDose = 0;
  let peakDamage = 0;
  const points: TemporalPoint[] = [];
  const steps = Math.round(duration / dt);

  for (let step = 0; step <= steps; step += 1) {
    const time = step * dt;
    const doseRate = step === steps ? 0 : exposureRate(id, time);
    points.push({ time, doseRate, undoneDamage, mortality: -Math.expm1(-cumulativeHazard) });
    if (step === steps) break;
    const next = advanceInterval(undoneDamage, doseRate, dt, tau);
    cumulativeHazard += next.hazard;
    totalDose += doseRate * dt;
    undoneDamage = next.undone;
    peakDamage = Math.max(peakDamage, undoneDamage);
  }

  const labels: Record<ExposureScenarioId, string> = {
    acute: 'One acute pulse',
    spaced: 'Five repaired pulses',
    uniform: 'Uniform exposure',
    late: 'Low background, late shock',
  };
  return { id, label: labels[id], totalDose, points, finalMortality: -Math.expm1(-cumulativeHazard), peakDamage };
}
