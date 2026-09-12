import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const packageName = readdirSync('node_modules/.pnpm').filter(n => n.startsWith('esbuild@')).sort().at(-1);
if (!packageName) throw new Error('Install the existing locked project dependencies before packaging the browser view.');
const { build } = await import(pathToFileURL(resolve('node_modules/.pnpm', packageName, 'node_modules/esbuild/lib/main.js')).href);
const built = await build({ absWorkingDir: root, entryPoints: ['scripts/family-world-offline.tsx'], bundle: true, minify: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
const css = readFileSync('app/families/families.css', 'utf8');
const extra = `html,body{margin:0;background:#0a141c;color-scheme:dark}.families-page button[data-slot=button]{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;background:#213b49;border:1px solid #4c6877;border-radius:8px;color:#e9f2f5;font:inherit;cursor:pointer}.families-page button:disabled{opacity:.45;cursor:default}.families-page button:focus-visible,.families-page input:focus-visible,.families-page summary:focus-visible{outline:2px solid #9ad6e6;outline-offset:4px}.families-page [data-slot=switch]{display:inline-flex;align-items:center;width:38px;height:22px;border-radius:20px;background:#425761;border:0;padding:3px;cursor:pointer}.families-page [data-slot=switch][data-checked]{background:#91cfdb}.families-page [data-slot=switch-thumb]{display:block;width:16px;height:16px;background:#0a141c;border-radius:50%}.families-page [data-slot=switch-thumb][data-checked]{transform:translateX(16px)}.families-page input[type=file]{padding:8px 0}`;
const javascript = built.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Two-family world — offline prototype</title><style>${css}\n${extra}</style></head><body><div id="root"></div><script>${javascript}</script></body></html>\n`;
mkdirSync('public/research/two-family-world', { recursive: true });
writeFileSync('public/research/two-family-world/Open_world.html', html);
for (const name of ['README.md', 'PROTOCOL.md', 'encyclopedia.json']) copyFileSync(`research/two-family-world/${name}`, `public/research/two-family-world/${name}`);
console.log(JSON.stringify({ file: 'public/research/two-family-world/Open_world.html', bytes: Buffer.byteLength(html), bundled: true, remoteLibraries: false }));
