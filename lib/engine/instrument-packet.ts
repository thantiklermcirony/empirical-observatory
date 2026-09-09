import type { RecordSource } from './records.ts';
export interface Frame {
  timestamp: number;
  channels: number[];
}
export interface Packet {
  schema: string;
  source: RecordSource;
  device: string;
  unit: string;
  sampleRate: number;
  channels: string[];
  frames: Frame[];
}
const label = (x: unknown): x is string =>
  typeof x === 'string' && x.trim().length > 0 && x.length <= 128;
export function validatePacket(value: unknown): Packet {
  const p = value as Packet;
  if (
    !p ||
    p.schema !== 'observatory-stream/1' ||
    !['synthetic-signal', 'recorded-signal', 'eeg-hardware'].includes(
      p.source,
    ) ||
    !label(p.device) ||
    !label(p.unit) ||
    !Number.isFinite(p.sampleRate) ||
    p.sampleRate <= 0 ||
    !Array.isArray(p.channels) ||
    !p.channels.length ||
    p.channels.length > 128 ||
    p.channels.some((c) => !label(c)) ||
    new Set(p.channels).size !== p.channels.length ||
    !Array.isArray(p.frames) ||
    p.frames.length > 2048
  )
    throw new Error('The adapter returned invalid signal metadata.');
  let last = -Infinity;
  for (const f of p.frames) {
    if (
      !f ||
      !Number.isFinite(f.timestamp) ||
      f.timestamp <= last ||
      !Array.isArray(f.channels) ||
      f.channels.length !== p.channels.length ||
      f.channels.some((x) => !Number.isFinite(x))
    )
      throw new Error(
        'Signal frames need finite values and strictly increasing timestamps.',
      );
    last = f.timestamp;
  }
  return p;
}
