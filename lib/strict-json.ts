/** Strict JSON value admission before the final JSON.parse call.
 * Rejects duplicate decoded keys, nonfinite JS numbers, excess nesting and malformed JSON.
 * Caller must bound incoming bytes before constructing this string.
 */
export const STRICT_JSON_LIMITS = Object.freeze({ maximumDepth: 64, maximumValues: 100000 });
export type StrictJsonErrorCode = 'INVALID_JSON' | 'DUPLICATE_KEY' | 'JSON_DEPTH_LIMIT' | 'JSON_VALUE_LIMIT' | 'NONFINITE_JSON_NUMBER';
export class StrictJsonError extends SyntaxError {
  readonly code: StrictJsonErrorCode;
  readonly position: number;
  constructor(code: StrictJsonErrorCode, position: number) {
    // Do not echo user field names/content into generic gateway errors or logs.
    super(`${code} at character ${position}.`);
    this.name = 'StrictJsonError'; this.code = code; this.position = position;
  }
}

/** A value-level result: numeric tokens use JavaScript number semantics.
 * It cannot preserve arbitrary-precision JSON integers; send exact rationals as strings.
 */
export function parseStrictJson(text: string): unknown {
  let position = 0, values = 0;
  const fail = (code: StrictJsonErrorCode = 'INVALID_JSON'): never => { throw new StrictJsonError(code, position); };
  if (typeof text !== 'string') fail();
  const digit = (c: number) => c >= 48 && c <= 57;
  function whitespace(): void {
    while (position < text.length && [9, 10, 13, 32].includes(text.charCodeAt(position))) position++;
  }
  function string(decode: boolean): string {
    if (text[position++] !== '"') fail();
    let decoded = '';
    while (position < text.length) {
      const c = text[position++];
      if (c === '"') return decoded;
      if (c.charCodeAt(0) < 32) fail();
      if (c !== '\\') { if (decode) decoded += c; continue; }
      const escaped = text[position++];
      if (escaped === 'u') {
        const hex = text.slice(position, position + 4);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail();
        if (decode) decoded += String.fromCharCode(parseInt(hex, 16));
        position += 4;
      } else {
        const escapes: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
        if (!Object.hasOwn(escapes, escaped)) fail();
        if (decode) decoded += escapes[escaped];
      }
    }
    return fail();
  }
  function number(): void {
    const start = position;
    if (text[position] === '-') position++;
    if (text[position] === '0') position++;
    else {
      if (text.charCodeAt(position) < 49 || text.charCodeAt(position) > 57 || position >= text.length) fail();
      do { position++; } while (digit(text.charCodeAt(position)));
    }
    if (text[position] === '.') {
      position++;
      if (!digit(text.charCodeAt(position))) fail();
      do { position++; } while (digit(text.charCodeAt(position)));
    }
    if (text[position] === 'e' || text[position] === 'E') {
      position++;
      if (text[position] === '+' || text[position] === '-') position++;
      if (!digit(text.charCodeAt(position))) fail();
      do { position++; } while (digit(text.charCodeAt(position)));
    }
    if (!Number.isFinite(Number(text.slice(start, position)))) fail('NONFINITE_JSON_NUMBER');
  }
  function value(depth: number): void {
    whitespace();
    if (++values > STRICT_JSON_LIMITS.maximumValues) fail('JSON_VALUE_LIMIT');
    const c = text[position];
    if (c === '"') { string(false); return; }
    if (c === '{' || c === '[') {
      if (depth >= STRICT_JSON_LIMITS.maximumDepth) fail('JSON_DEPTH_LIMIT');
      position++; whitespace();
      const end = c === '{' ? '}' : ']';
      if (text[position] === end) { position++; return; }
      const keys = new Set<string>();
      while (true) {
        if (c === '{') {
          const key = string(true);
          if (keys.has(key)) fail('DUPLICATE_KEY');
          keys.add(key); whitespace();
          if (text[position++] !== ':') fail();
        }
        value(depth + 1); whitespace();
        if (text[position] === end) { position++; return; }
        if (text[position++] !== ',') fail();
        whitespace();
      }
    }
    for (const literal of ['true', 'false', 'null']) if (text.startsWith(literal, position)) { position += literal.length; return; }
    if (c === '-' || digit(text.charCodeAt(position))) { number(); return; }
    fail();
  }
  value(0); whitespace();
  if (position !== text.length) fail();
  return JSON.parse(text) as unknown;
}
