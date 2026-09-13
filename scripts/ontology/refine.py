"""Check and refine source-specific retirement flags; build the typed relation directory.
Run after compile.py. Standard-library only; never infers causal or physical facts.
"""
from pathlib import Path
from collections import defaultdict,Counter
import sys,json,gzip,hashlib
root=Path(sys.argv[1]).resolve();index=json.loads((root/'integrity.json').read_text(encoding='utf-8'));manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
def sha(b): return hashlib.sha256(b).hexdigest()
def save_shard(f,records):
    raw=json.dumps(records,ensure_ascii=False,separators=(',',':'),sort_keys=True).encode();packed=gzip.compress(raw,mtime=0);(root/f['kind']/(f['bucket']+'.json.gz')).write_bytes(packed);f.update(bytes=len(packed),sha256=sha(packed),expandedBytes=len(raw),expandedSha256=sha(raw),encoding='gzip')
counts=defaultdict(Counter);labels={};retired=set();changed=0;deprecated=Counter();kinds=Counter()
for f in index:
    if f['kind']!='records': continue
    b=(root/f['kind']/(f['bucket']+'.json.gz')).read_bytes();assert sha(b)==f['sha256'];records=json.loads(gzip.decompress(b));dirty=False
    for key,r in records.items():
        for a in r['assertions']:
            if a['source']=='physh':
                value=any(x['predicate']=='https://physh.org/rdf/2018/01/01/core#deprecated' and x['value'].lower() in ('true','1') for x in a['literals'])
                if value: retired.add(key)
                if value!=a['deprecated']:a['deprecated']=value;dirty=True;changed+=1
            deprecated[a['source']]+=bool(a['deprecated'])
            relation=any(t=='PROPERTY' or t.endswith('Property') for t in a['types'])
            if relation: labels.setdefault(r['iri'],[]).append({'source':a['source'],'label':a['label'],'definitions':a['definitions']})
            kind='relation-property' if relation else 'quantity-kind' if any(t.endswith('QuantityKind') for t in a['types']) else 'unit' if any(t.endswith('/Unit') for t in a['types']) else 'class-or-concept' if any(t=='CLASS' or t.endswith(('#Class','#Concept')) for t in a['types']) else 'other-named-resource'
            kinds[kind]+=1
            for edge in a['relations']:counts[edge['predicate']][a['source']]+=1
    if dirty:save_shard(f,records)
for f in index:
    if f['kind']!='search': continue
    b=(root/f['kind']/(f['bucket']+'.json.gz')).read_bytes();assert sha(b)==f['sha256'];rows=json.loads(gzip.decompress(b));dirty=False
    for row in rows:
        if row[2]=='physh' and row[1] in retired and not row[4]:row[4]=True;dirty=True
    if dirty:save_shard(f,rows)
for s in manifest['sources']:s['counts']['deprecated']=deprecated[s['id']]
manifest['relationDirectory']='/ledger-data/relations.json';manifest['kindCounts']=dict(kinds);manifest['shardEncoding']='gzip; integrity hashes cover compressed and expanded bytes';manifest['projectionRefinement']='Source-specific APS retirement flags checked by scripts/ontology/refine.py.'
directory={'schema':'observatory-source-predicates/1','policy':'Source predicates and frequencies, not proven causal verbs or executable operations. Structural RDF predicates and mathematical/biological relations remain distinct.','predicates':[{'iri':p,'sourceStatements':sum(cs.values()),'sources':dict(cs),'sourceDefinitions':labels.get(p,[])} for p,cs in sorted(counts.items())]}
for name,obj in [('integrity.json',index),('manifest.json',manifest),('relations.json',directory)]: (root/name).write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'),sort_keys=True),encoding='utf-8')
summary_path=root.parent.parent/'lib/ontology-summary.json';summary=json.loads(summary_path.read_text(encoding='utf-8'))
for s in summary['sources']:s['counts']['deprecated']=deprecated[s['id']]
summary.update(relationDirectory=manifest['relationDirectory'],kindCounts=dict(kinds));summary_path.write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print('Source-specific retirement corrections:',changed,'; distinct relation predicates:',len(counts),'; kind counts:',dict(kinds))
