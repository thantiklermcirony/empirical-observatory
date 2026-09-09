'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ChartContainer } from '@/components/ui/chart';
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
} from 'recharts';
export function Choice({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="control-field">
      <span>{label}</span>
      <Select
        value={value}
        onValueChange={(v) => {
          if (typeof v === 'string') onChange(v);
        }}
        disabled={disabled}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue>
            {options.find((o) => o.value === value)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
export function Range({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  disabled = false,
  format,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  format?: (n: number) => string;
}) {
  return (
    <div className="control-field">
      <div className="control-label">
        <span>{label}</span>
        <output>{format ? format(value) : value.toFixed(2)}</output>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}
export function Trace({
  data,
  keys,
  domain = [0, 1],
  target,
  label = 'Experiment trace',
}: {
  data: Record<string, unknown>[];
  keys: { key: string; label: string; color: string }[];
  domain?: [number, number];
  target?: number;
  label?: string;
}) {
  return (
    <div className="trace-wrap">
      <ChartContainer
        className="trace"
        aria-label={label}
        role="img"
        config={Object.fromEntries(
          keys.map((k) => [k.key, { label: k.label, color: k.color }]),
        )}
      >
        <LineChart
          data={data}
          margin={{ top: 10, right: 12, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            tickFormatter={(x) => `${Math.round(x)}s`}
            domain={['dataMin', 'dataMax']}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={domain}
            width={38}
            tickLine={false}
            axisLine={false}
            tickFormatter={(x) => Number(x).toFixed(1)}
          />
          <Tooltip
            contentStyle={{
              background: '#11232d',
              border: '1px solid #45616e',
              fontSize: 13,
            }}
            formatter={(v) =>
              typeof v === 'number' ? v.toFixed(3) : String(v)
            }
            labelFormatter={(v) => `${Number(v).toFixed(2)} s`}
          />
          {target !== undefined && (
            <ReferenceLine y={target} stroke="#f5bd77" strokeDasharray="4 4" />
          )}
          {keys.map((k) => (
            <Line
              key={k.key}
              dataKey={k.key}
              name={k.label}
              stroke={k.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <div className="trace-legend">
        {keys.map((k) => (
          <span key={k.key}>
            <i style={{ background: k.color }} />
            {k.label}
          </span>
        ))}
      </div>
    </div>
  );
}
export function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
    </div>
  );
}
