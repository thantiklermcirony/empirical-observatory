import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const site=path.resolve(process.env.LAB_SITE_ROOT ?? process.cwd());
const {parseStrictJson, StrictJsonError, STRICT_JSON_LIMITS}=await import(pathToFileURL(path.join(site,'lib/strict-json.ts')).href);
const rejects=(source,code='INVALID_JSON')=>assert.throws(()=>parseStrictJson(source),error=>error instanceof StrictJsonError&&error.code===code);
const valid=['null','true','false','0','-0','1','-19','2.4','1e3','1E-3','-2.1e+4','[]','{}','[1,null,true,false,{},[]]',
  '{"a":1,"b":{"a":2},"c":[{"a":3},{"a":4}]}','{"__proto__":{"polluted":true},"constructor":0}',
  JSON.stringify('a\\b/c"d'),JSON.stringify('\u0000\b\f\n\r\t'),'{"\uD83D\uDE00":1}', '"\ud800"','"\udfff"','"line\u2028separator"',' \r\n\t{"a" : [ -0 , 3e+2 ] } \t'];
for(const [i,text] of valid.entries())test(`valid JSON ${i}`,()=>assert.deepEqual(parseStrictJson(text),JSON.parse(text)));
const duplicates=['{"a":1,"a":2}','{"a":1,"\\u0061":2}','{"x":{"a":1,"a":2}}','[{"a":1,"a":2}]',
  '{"\\uD83D\\uDE00":1,"😀":2}','{"/":1,"\\/":2}','{"\\n":1,"\\u000A":2}',
  '{"__proto__":1,"__proto__":2}','{"":1,"":2}','{"a":{},"a":[]}'];
for(const [i,text] of duplicates.entries())test(`duplicate decoded key ${i}`,()=>rejects(text,'DUPLICATE_KEY'));
const invalid=['',' ','undefined','NaN','Infinity','+1','01','-01','1.','-.1','.1','1e','1e+','--1','-',
  '[1,]','[,1]','{a:1}','{"a" 1}','{"a":}','{"a":1,}','{"a":1 "b":2}', 'true false', '{}[]',
  '"unterminated','"bad\\x"','"bad\\u12"','"bad\\u12gg"','"bad\nline"','/*hi*/0','0//x','[false true]',
  '\ufeff{}','[}', '{]', '[1', '{"a":1'];
for(const [i,text] of invalid.entries())test(`invalid syntax ${i}`,()=>rejects(text));
test('nonfinite numeric literals declined',()=>{rejects('1e400','NONFINITE_JSON_NUMBER');rejects('{"n":-1e400}','NONFINITE_JSON_NUMBER');});
test('finite but unsafe integer retains documented JS semantics',()=>assert.equal(parseStrictJson('9007199254740993'),JSON.parse('9007199254740993')));
test('keys are Unicode code-unit strings, not Unicode normalization',()=>assert.deepEqual(parseStrictJson('{"é":1,"é":2}'),{'é':1,'é':2}));
test('prototype key does not mutate object prototypes',()=>{const r=parseStrictJson('{"__proto__":{"polluted":true}}');assert.ok(Object.hasOwn(r,'__proto__'));assert.equal({}.polluted,undefined);});
test('maximum depth accepted and next level declined',()=>{const n=STRICT_JSON_LIMITS.maximumDepth;parseStrictJson('['.repeat(n)+'0'+']'.repeat(n));rejects('['.repeat(n+1)+'0'+']'.repeat(n+1),'JSON_DEPTH_LIMIT');});
test('bounded number of values',()=>rejects('['+Array(STRICT_JSON_LIMITS.maximumValues).fill('0').join(',')+']','JSON_VALUE_LIMIT'));
test('duplicate detection occurs before final JSON.parse',()=>{const original=JSON.parse;let count=0;JSON.parse=()=>{count++;throw Error('Unexpected final parse');};try{rejects('{"a":1,"\\u0061":2}','DUPLICATE_KEY');assert.equal(count,0);}finally{JSON.parse=original;}});
test('errors do not echo secret keys',()=>{try{parseStrictJson('{"secret-password":1,"secret-password":2}');assert.fail();}catch(error){assert.ok(!error.message.includes('secret-password'));}});
test('seeded valid JSON round-trips without result drift',()=>{
  let state=0x6d2b79f5;const random=()=>{state=Math.imul(state^state>>>15,1|state);state^=state+Math.imul(state^state>>>7,61|state);return((state^state>>>14)>>>0)/4294967296;};
  const chars=['a','"','\\','\n','\u0000','😀','é','\ud800','/','\t'];
  function item(depth){const kind=Math.floor(random()*(depth<4?7:5));if(kind===0)return null;if(kind===1)return random()<.5;if(kind===2)return(random()-.5)*1e12;if(kind===3)return Array.from({length:6},()=>chars[Math.floor(random()*chars.length)]).join('');if(kind===4)return Math.floor(random()*1000);if(kind===5)return Array.from({length:Math.floor(random()*5)},()=>item(depth+1));return Object.fromEntries(Array.from({length:Math.floor(random()*5)},(_,i)=>[String(i)+chars[Math.floor(random()*chars.length)],item(depth+1)]));}
  for(let i=0;i<300;i++){const text=JSON.stringify(item(0));assert.deepEqual(parseStrictJson(text),JSON.parse(text));}
});
