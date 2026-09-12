/** Reviewed, finite model checks. A successful check is never empirical admission. */
export type FrameworkTestId = 'bounded-selector' | 'passive-membrane';
export type TestReceipt = { id: FrameworkTestId; version: string; classification: 'model_check'; outcome: string; passed: boolean; inputs: Record<string, number | string>; baseline: string; criterion: string; metrics: Record<string, number>; points: { x: number; baseline: number; candidate: number }[]; conclusion: string; limits: string[] };
export const TEST_IDS: FrameworkTestId[] = ['bounded-selector', 'passive-membrane'];
export function runFrameworkTest(id: FrameworkTestId): TestReceipt {
  if (id === 'bounded-selector') {
    const h = (x: number) => x / (1 - x * x);
    const inverse = (z: number) => 2 * z / (1 + Math.sqrt(1 + 4 * z * z));
    const alternative = (x: number, u: number) => inverse(h(x) + h(u));
    const uhl = (x: number, u: number) => (x + u) / (1 + x * u);
    let maxAbsolute = 0; const points = [];
    for (let i = -19; i <= 19; i++) for (let j = -19; j <= 19; j++) maxAbsolute = Math.max(maxAbsolute, Math.abs(uhl(i / 20, j / 20)), Math.abs(alternative(i / 20, j / 20)));
    for (let i = -19; i <= 19; i++) points.push({ x: i / 20, baseline: uhl(i / 20, .5), candidate: alternative(i / 20, .5) });
    const a = uhl(.5, .5), b = alternative(.5, .5);
    return { id, version: 'framework-tests/1', classification: 'model_check', passed: maxAbsolute < 1 && Math.abs(a - b) > .1, outcome: 'Counterexample to selection by boundedness', inputs: { x: .5, u: .5, gridPairs: 1521, alternative:'B(x,u)=h⁻¹(h(x)+h(u)); h(x)=x/(1−x²); h⁻¹(z)=2z/(1+√(1+4z²))' }, baseline: 'UHL: A(x,u)=(x+u)/(1+xu)', criterion: 'Both constructions stay inside the open bound; at x=u=0.5 their outputs differ by more than 0.1.', metrics: { uhl: a, alternative: b, difference: a - b, sampledMaxAbsolute: maxAbsolute }, points, conclusion: 'Boundedness alone does not choose UHL. The alternative also has identity, inverses and associativity because it transports addition through an invertible coordinate.', limits: ['The finite grid is a numerical check. Global closure follows from the displayed invertible construction, not from sampling.', 'Both laws reparameterize addition; this distinguishes coordinate formulas, not their shared abstract group. Physical discrimination needs an independently calibrated coordinate.', 'This does not reject UHL in a system with additional justified premises.', 'No measured physical state or calibration is supplied.'] };
  }
  if (id !== 'passive-membrane') throw new Error('Unknown framework test');
  const resting = -65, resistance = 20, capacitance = 1, current = .3, tau = resistance * capacitance, duration = 5 * tau;
  const exact = (t: number) => resting + resistance * current * (1 - Math.exp(-t / tau));
  const integrate = (dt: number) => { let v = resting, maxError = 0; const values = [{ x: 0, baseline: resting, candidate: resting }]; for (let i = 1; i <= Math.round(duration / dt); i++) { v += dt * (-(v - resting) / resistance + current) / capacitance; const t = i * dt; maxError = Math.max(maxError, Math.abs(v - exact(t))); if (i % Math.round(tau / dt / 10) === 0) values.push({ x: t, baseline: exact(t), candidate: v }); } return { maxError, values }; };
  const coarse = integrate(tau / 100), fine = integrate(tau / 200);
  return { id, version: 'framework-tests/1', classification: 'model_check', passed: fine.maxError < coarse.maxError * .6 && fine.maxError / Math.abs(resistance * current) < .0015, outcome: 'Passive membrane integration check', inputs: { resting_mV: resting, resistance_MOhm: resistance, capacitance_nF: capacitance, current_nA: current, duration_ms: duration, coarseStep_ms: tau / 100, fineStep_ms: tau / 200 }, baseline: 'Analytic RC solution: V(t)=E_L+IR(1−exp(−t/RC))', criterion: 'Halving the step reduces maximum error by at least 40%; fine-step error is below 0.15% of the voltage response.', metrics: { timeConstant_ms: tau, asymptote_mV: resting + resistance * current, coarseMaxError_mV: coarse.maxError, fineMaxError_mV: fine.maxError }, points: fine.values, conclusion: 'The numerical passive-circuit calculation agrees with its analytic baseline under the declared parameters.', limits: ['Illustrative parameters, not measurements of the selected organ or person.', 'Passive, spatially lumped membrane only. No voltage-gated channels, action potentials or tissue conduction.', 'Agreement between two implementations does not validate the model in a living specimen.'] };
}
