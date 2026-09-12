import { investigate, MODELS } from '@/lib/engine/question';
export function GET() {
  return Response.json({
    version: 'question-desk-2',
    method: 'POST',
    mode: 'stateless bounded numerical runner; no language model',
    input: {
      prompt: 'string, 1–2000 characters',
      model: MODELS.map((m) => m.id),
      parameter: 'optional finite number in selected model range',
      confirmed: 'explicit true after reviewing model assumptions',
      maxPasses: 'integer 1–6; default 6',
      objective: 'tracking (default) or effort (TAO only; MAE < 0.05)',
    },
    models: MODELS,
    limits: { bodyBytes: 8192, maxPasses: 6 },
    example: {
      prompt: MODELS[0].question,
      model: 'uhl',
      parameter: 0.25,
      confirmed: true,
      maxPasses: 6,
    },
  });
}
export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json'))
    return Response.json({ error: 'Use application/json.' }, { status: 415 });
  const reader = request.body?.getReader();
  if (!reader)
    return Response.json({ error: 'Missing question.' }, { status: 400 });
  try {
    let size = 0;
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192)
        return Response.json(
          { error: 'Question body exceeds 8 KB.' },
          { status: 413 },
        );
      chunks.push(value);
    }
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }
    const result = investigate(JSON.parse(new TextDecoder().decode(data)));
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Invalid question.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  } finally {
    await reader.cancel();
  }
}
