'use client';
import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import type { ExperimentRecord } from './engine/records';
interface Context {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
}
export function useStationTools(state: {
  view: string;
  records: ExperimentRecord[];
  navigate: (v: string) => void;
}) {
  const current = useRef(state);
  useEffect(() => {
    current.current = state;
  }, [state]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Parameters<Context['registerTool']>[0]) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    };
    register({
      name: 'read_station_state',
      description:
        'Read the current laboratory and local experiment metadata. Does not expose raw human recordings.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        if (!input || typeof input !== 'object' || Object.keys(input).length)
          throw new Error('Expected an empty object.');
        return {
          view: current.current.view,
          records: current.current.records.map((r) => ({
            id: r.id,
            room: r.room,
            source: r.source,
            completed: r.completed,
            seed: r.seed,
          })),
        };
      },
    });
    register({
      name: 'open_observatory_laboratory',
      description:
        'Navigate to a laboratory, the instrument dock or the logbook. This does not start an experiment or connect hardware.',
      inputSchema: {
        type: 'object',
        properties: {
          laboratory: {
            type: 'string',
            enum: [
              'deck',
              'tao',
              'behaviour',
              'quantum',
              'instrument',
              'expeditions',
              'logbook',
            ],
          },
        },
        required: ['laboratory'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (
          !input ||
          typeof input !== 'object' ||
          Object.keys(input).length !== 1
        )
          throw new Error('Supply only laboratory.');
        const v = (input as { laboratory?: unknown }).laboratory;
        if (
          typeof v !== 'string' ||
          ![
            'deck',
            'tao',
            'behaviour',
            'quantum',
            'instrument',
            'expeditions',
            'logbook',
          ].includes(v)
        )
          throw new Error('Unknown laboratory.');
        flushSync(() => current.current.navigate(v));
        return { view: v, experimentStarted: false };
      },
    });
    return () => lifecycle.abort();
  }, []);
}
