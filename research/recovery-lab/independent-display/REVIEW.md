# Independent Recovery Lab display review

Read-only review of the generated Site data, exporter and consuming component on 2026-09-10. No model was fitted, source changed, Site edited or public communication made.

**Numeric/data reconciliation passes.** `check_display.py` and `AUDIT.json` preserve the inputs' SHA256 hashes and executable checks:

- 214 distinct animals, each represented by the upper median chronological intended landmark. Selection uses dates and row counts; no performance/outcome filtering.
- All 3,852 displayed probability values exactly match the saved six-model predictions. Class order is low burden, high burden, death/euthanasia. All values are finite, within [0,1], and each distribution sums to one.
- All 1,785 displayed visit points match actual dates and raw ordinal measurements. Known-severe counts are independently recomputed as the number of observed items coded 1, and assessed counts match the number of nonmissing ordinal items.
- Day zero is each animal's first recorded assessment. Cutoff and target offsets are correct; target center is cutoff+7; included visit range is cutoff−60 through cutoff+9. Resolved burden dates lie in days5–9; terminal dates lie after cutoff through day9.
- All six displayed primary model scores equal the saved animal-macro Brier scores. The coverage fraction, gain, failed gate and population totals reconcile.
- Selected cases retain 44 unresolved outcomes and 11 terminal outcomes, alongside 40 low-burden and 119 high-burden outcomes. Unresolved outcomes are not displayed as healthy or zero.

## Actionable display findings

1. **Label the plotted count as a lower bound and expose missingness near the threshold.** There are 101 plotted visits with 28 of 30 ordinal items assessed, distributed across 26 cases. At 18 points, known severe count is below four but the upper bound including missing items reaches four. `RecoveryLab.tsx` currently labels the axis/table “Severe-coded items”, with a four-item threshold, while only listing an assessed count in the table/tooltip. That can visually imply a confidently low state. Use “Known severe-coded items (lower bound)” and “28/30 assessed; 2 missing”, preferably an unresolved-state indication wherever lower<4≤upper. The data are correct and no score or endpoint changes are needed.

2. **Use the exact origin label.** The axis says “Days after enrollment”, but the exporter subtracts the first recorded assessment date. Use “Days after first recorded assessment” unless enrollment equivalence is separately established.

3. **Clarify the endpoint on the interactive view.** “Target day N” is the nominal center of an observed window, not a latent day7 health measurement. A short caption can say: “Closest identifiable assessment in days5–9; recorded death/euthanasia through day9 takes priority.” The full report already states this, but the interactive view should not require opening it to interpret the forecast.

4. **Use “resolved outcomes only” for the metric.** Current wording “complete outcomes only” can be confused with the distinct `complete_items` sensitivity. The primary comparison uses the resolved outcome mask and permits identifiable state with incomplete current items.

These are presentation corrections. Exact data checks found zero mismatches. Historical lines are explicitly described as connecting observed visits, and future measurements are withheld by the reveal control; there is no displayed numerical forecast fabricated from the curve.

The independent metrics reviewer separately reconciled all three complete result sets. This display review does not turn the failed numerical/coverage gates into positive evidence.

Recheck command from the workspace root:

```powershell
& 'work/agent-biology/.venv/Scripts/python.exe' 'work/recovery-lab/independent-display/check_display.py'
```
