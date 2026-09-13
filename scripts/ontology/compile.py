"""Compile captured ontology releases. No reasoning, network imports or lexical identity merges.
Usage: python compile.py CAPTURE_DIRECTORY SITE_DIRECTORY
Dependency: rdflib==7.6.0. Raw files must match sources.json SHA-256.
"""
import sys, json, hashlib, zipfile, gzip, re, unicodedata, gc
from pathlib import Path
from collections import defaultdict, Counter
ROOT=Path(sys.argv[1]).resolve(); SITE=Path(sys.argv[2]).resolve()
sys.path.insert(0,str(ROOT/'runtime'))
from rdflib import Graph, URIRef, Literal, BNode, RDF, RDFS, OWL, SKOS
OUT=SITE/'public'/'ledger-data'; OUT.mkdir(parents=True,exist_ok=True)
for sub in ['records','search','sources','licenses']: (OUT/sub).mkdir(exist_ok=True)
DEF={'http://purl.obolibrary.org/obo/IAO_0000115',str(SKOS.definition),'http://qudt.org/schema/qudt/description'}
LABEL={str(RDFS.label),str(SKOS.prefLabel),'http://www.w3.org/2008/05/skos-xl#literalForm'}
SYN={str(SKOS.altLabel),'http://www.geneontology.org/formats/oboInOwl#hasExactSynonym','http://www.geneontology.org/formats/oboInOwl#hasBroadSynonym','http://www.geneontology.org/formats/oboInOwl#hasNarrowSynonym','http://www.geneontology.org/formats/oboInOwl#hasRelatedSynonym'}
ROOMS={'bfo':['archive','mathematics'],'ro':['archive','biology'],'iao':['archive','computing'],'obi':['biology','medicine','archive'],'go':['biology'],'cl':['biology','medicine'],'uberon':['biology','medicine'],'envo':['earth','biology'],'pato':['biology'],'stato':['mathematics','social'],'agro':['agriculture'],'po':['agriculture','biology'],'doid':['medicine'],'mf':['psychology'],'chmo':['chemistry'],'fobi':['biology','chemistry'],'foodon':['agriculture','biology'],'so':['biology','computing'],'eco':['archive','biology'],'sepio':['archive'],'qudt':['physics','engineering','mathematics','chemistry'],'sweet':['earth','physics','chemistry','engineering'],'uat':['astronomy'],'lexinfo':['language'],'stw':['social'],'mondo':['medicine'],'nbo':['psychology','biology'],'cmo':['medicine'],'oba':['biology']}
def sha(b): return hashlib.sha256(b).hexdigest()
def dump(path,obj):
    data=json.dumps(obj,ensure_ascii=False,separators=(',',':'),sort_keys=True).encode(); path.write_bytes(data); return {'bytes':len(data),'sha256':sha(data)}
def dump_shard(path,obj):
    data=json.dumps(obj,ensure_ascii=False,separators=(',',':'),sort_keys=True).encode(); packed=gzip.compress(data,mtime=0); path.write_bytes(packed)
    return {'bytes':len(packed),'sha256':sha(packed),'encoding':'gzip','expandedBytes':len(data),'expandedSha256':sha(data)}
def normal(s): return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',s).lower()).strip()
def bucket(s):
    # Stable UTF-8 hash, shared with the browser. No transliteration identity assumptions.
    return hashlib.sha256(s.encode()).hexdigest()[:2]
def literal(p,v,lang='',datatype=''): return {'predicate':str(p),'value':str(v),'language':lang or '', 'datatype':datatype or ''}
def pick(ls,iri):
    if ls:
        ranked=sorted(ls,key=lambda x:(0 if x['language']=='en' else 1 if not x['language'] else 2, x['value']))
        return ranked[0]['value'],'source-label'
    return re.split('[/#]',iri)[-1] or iri,'identifier-fallback'
def rdf_records(g):
    named={s for s in g.subjects() if isinstance(s,URIRef)}
    subjects=sorted((s for s in named if any(g.objects(s,RDF.type)) or any(g.objects(s,RDFS.label)) or any(g.objects(s,SKOS.prefLabel))),key=str)
    for s in subjects:
        ls=[]; defs=[]; aliases=[]; values=[]; edges=[]; restrictions=[]; blank=0
        for p,o in sorted(g.predicate_objects(s),key=lambda t:(str(t[0]),str(t[1]))):
            if isinstance(o,Literal):
                v=literal(p,o,o.language,str(o.datatype or '')); values.append(v)
                if str(p) in LABEL: ls.append(v)
                if str(p) in DEF: defs.append(v)
                if str(p) in SYN: aliases.append(v)
            elif isinstance(o,URIRef): edges.append({'predicate':str(p),'target':str(o),'semantics':'source-RDF-assertion'})
            else:
                blank+=1
                if (o,RDF.type,OWL.Restriction) in g:
                    on=list(g.objects(o,OWL.onProperty))
                    for q in [OWL.someValuesFrom,OWL.allValuesFrom,OWL.hasValue,OWL.cardinality,OWL.minCardinality,OWL.maxCardinality]:
                        for filler in g.objects(o,q):
                            if len(on)==1 and isinstance(on[0],URIRef) and isinstance(filler,(URIRef,Literal)):
                                restrictions.append({'via':str(p),'property':str(on[0]),'quantifier':str(q),'filler':str(filler),'fillerKind':'iri' if isinstance(filler,URIRef) else 'literal','datatype':str(getattr(filler,'datatype','') or ''),'semantics':'OWL-restriction; not an individual event or causal observation'})
        label,origin=pick(ls,str(s)); types=sorted(str(x) for x in g.objects(s,RDF.type) if isinstance(x,URIRef))
        yield {'iri':str(s),'label':label,'labelOrigin':origin,'labels':ls,'definitions':defs,'aliases':aliases,'types':types,'literals':values,'relations':edges,'restrictions':restrictions,'blankNodeLinks':blank,'deprecated':any(str(x).lower()=='true' for x in g.objects(s,OWL.deprecated))}
def obo_records(data):
    for graph in data.get('graphs',[]):
        edges=defaultdict(list)
        for e in graph.get('edges',[]):
            p={'is_a':str(RDFS.subClassOf),'subPropertyOf':str(RDFS.subPropertyOf),'inverseOf':str(OWL.inverseOf)}.get(e['pred'],e['pred'])
            edges[e['sub']].append({'predicate':p,'target':e['obj'],'semantics':'source-OBO-graph-edge; retain OBO graph interpretation'})
        for n in graph.get('nodes',[]):
            iri=n['id']
            if not iri.startswith(('http://','https://','urn:')): continue
            m=n.get('meta',{}); ls=[literal(RDFS.label,n['lbl'])] if n.get('lbl') else []
            defs=[literal('http://purl.obolibrary.org/obo/IAO_0000115',m['definition']['val'])] if m.get('definition',{}).get('val') else []
            aliases=[literal(x.get('pred','synonym'),x['val']) for x in m.get('synonyms',[]) if x.get('val')]
            label,origin=pick(ls,iri)
            yield {'iri':iri,'label':label,'labelOrigin':origin,'labels':ls,'definitions':defs,'aliases':aliases,'types':[n.get('type','UNSPECIFIED')],'literals':ls+defs+aliases,'relations':edges[iri],'restrictions':[],'blankNodeLinks':0,'deprecated':m.get('deprecated',False),'sourceMeta':m,'oboPropertyType':n.get('propertyType')}
def get_graph(source,path):
    g=Graph(); members=[]; licenses=[]
    if source['format']=='zip':
        with zipfile.ZipFile(path) as z:
            names=z.namelist(); sid=source['id']
            licenses=[n for n in names if Path(n).name.lower() in ('license','license.md','notice')]
            for i,n in enumerate(licenses): (OUT/'licenses'/f'{sid}-{i}.txt').write_bytes(z.read(n))
            if sid=='qudt': members=['QUDT-all-in-one-OWL.ttl']
            elif sid=='sweet': members=[n for n in names if '/src/' in n and n.endswith('.ttl')]
            elif sid=='uat': members=[n for n in names if n.endswith('/UAT.rdf')]
            elif sid=='lexinfo': members=[n for n in names if n.endswith('/ontology/3.0/lexinfo.owl') and '/docs/' not in n]
            elif sid=='stw': members=[n for n in names if n.endswith('.ttl')]
            elif sid=='physh': members=[n for n in names if n.endswith('/physh.ttl')]
            elif sid=='ontomath': members=[n for n in names if n.endswith('/OntoMathPro_v2.owl')]
            if not members: raise ValueError('No declared graph members: '+sid)
            for n in members:
                if z.getinfo(n).file_size>200_000_000: raise ValueError('Oversize ZIP member')
                data=z.read(n)
                if b'<!ENTITY' in data: raise ValueError('External/entity XML forbidden')
                g.parse(data=data,format='turtle' if n.endswith('.ttl') else 'xml',publicID=source['homepage'])
    else:
        data=path.read_bytes()
        # Internal XML namespace entity declarations in official OBO are common. Reject external entities.
        if re.search(br'<!ENTITY\s+[^>]*(?:SYSTEM|PUBLIC)',data): raise ValueError('External XML entity forbidden')
        g.parse(data=data,format=source['format'],publicID=source['url']); members=[path.name]
    return g,members,[f'/ledger-data/licenses/{source["id"]}-{i}.txt' for i in range(len(licenses))]

def main():
    sources=json.loads((ROOT/'sources.json').read_text(encoding='utf-8')); records={}; manifest=[]; hist=Counter(); warnings=[]; reuse={}
    ROOMS.update({'edam':['computing','biology','archive'],'physh':['physics','astronomy','engineering'],'ontomath':['mathematics']})
    if '--reuse' in sys.argv and (OUT/'manifest.json').exists():
        prior=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))
        reuse={s['id']:s for s in prior['sources'] if any(n['id']==s['id'] and n.get('sha256')==s['sha256'] for n in sources)}
        for f in json.loads((OUT/'integrity.json').read_text(encoding='utf-8')):
            if f['kind']!='records': continue
            b=(OUT/'records'/(f['bucket']+('.json.gz' if f.get('encoding')=='gzip' else '.json'))).read_bytes()
            if sha(b)!=f['sha256']: raise ValueError('Compiled reuse integrity failure')
            if f.get('encoding')=='gzip': b=gzip.decompress(b)
            for r in json.loads(b).values():
                r['assertions']=[a for a in r['assertions'] if a['source'] in reuse]
                if r['assertions']: records[r['iri']]=r
        for r in records.values():
            for a in r['assertions']: hist.update(e['predicate'] for e in a['relations'])
        print('Verified reusable source projections:',len(reuse),flush=True)
    for source in sources:
        if source['status']!='captured': warnings.append({'source':source['id'],'reason':source.get('error','not captured')}); continue
        if source['license']['label'] not in ['CC0 1.0','CC BY 3.0','CC BY 4.0','CC BY-SA 3.0','CC BY-SA 4.0','Apache-2.0']: raise ValueError('Unverified licence '+source['id'])
        sid=source['id']; path=ROOT/source['file']; b=path.read_bytes()
        if sha(b)!=source['sha256']: raise ValueError('Source SHA mismatch '+sid)
        # Release download redirects may carry temporary public tokens. They are not permanent provenance URLs.
        source['resolvedUrl']=source.get('resolvedUrl',source['url']).split('?')[0]
        if sid in reuse:
            summary={**reuse[sid],**source,'rooms':ROOMS.get(sid,['archive'])};manifest.append(summary);del b;continue
        rawname=sid+('.zip' if source['format']=='zip' else Path(source['file']).suffix+'.gz')
        raw=b if source['format']=='zip' else gzip.compress(b,mtime=0)
        (OUT/'sources'/rawname).write_bytes(raw); del raw,b
        summary={**source,'rooms':ROOMS.get(sid,['archive']),'captureDownload':'/ledger-data/sources/'+rawname,'admission':'source vocabulary assertions; no new executable law','projection':'Named RDF statements and simple OWL restrictions, or OBO nodes/edges. Not an OWL reasoner; full axioms remain in the original capture.'}
        if source['format']=='obojson':
            data=json.loads(path.read_text(encoding='utf-8')); iterable=obo_records(data)
            summary['graphVersions']=[{'id':g.get('id'),'meta':g.get('meta',{}),'axiomCounts':{k:len(v) for k,v in g.items() if k not in ('nodes','edges','id','meta') and isinstance(v,list)}} for g in data.get('graphs',[])]
            g=None
        else:
            g,members,licenses=get_graph(source,path); iterable=rdf_records(g)
            summary.update({'members':members,'licenseFiles':licenses,'sourceTriples':len(g),'blankNodeTriples':sum(1 for s,p,o in g if isinstance(s,BNode) or isinstance(o,BNode)),'imports':sorted(set(str(x) for x in g.objects(None,OWL.imports))),'declaredVersions':sorted(set(str(x) for p in [OWL.versionIRI,OWL.versionInfo] for x in g.objects(None,p)))})
        counts=Counter()
        for record in iterable:
            iri=record.pop('iri'); counts['records']+=1; counts['relations']+=len(record['relations']); counts['restrictions']+=len(record['restrictions']); counts['withoutDefinition']+=not bool(record['definitions']); counts['deprecated']+=bool(record['deprecated']); counts['identifierLabels']+=record['labelOrigin']=='identifier-fallback'
            record['source']=sid
            if iri not in records: records[iri]={'iri':iri,'assertions':[]}
            records[iri]['assertions'].append(record)
            hist.update(e['predicate'] for e in record['relations'])
        summary['counts']=dict(counts); manifest.append(summary)
        print(sid,dict(counts),flush=True)
        del iterable
        if g is not None: del g
        if source['format']=='obojson': del data
        gc.collect()
    print('Indexing',len(records),'distinct IRIs',flush=True)
    shards=defaultdict(dict); search=defaultdict(dict); labels=defaultdict(set); overlaps=Counter(); dangling=Counter()
    for iri,r in sorted(records.items()):
        key=hashlib.sha256(iri.encode()).hexdigest(); shards[key[:2]][key]=r
        for a in r['assertions']:
            names=set(normal(x['value']) for x in a['labels']+a['aliases'] if x['value'])
            if a['labelOrigin']=='identifier-fallback': names.add(normal(a['label']))
            for name in names:
                labels[name].add(iri)
                # Search by prefix of any label/synonym word, after NFKC + lowercasing.
                prefixes={w[:2] for w in re.findall(r'[^\W_]+',name,flags=re.UNICODE) if len(w)>=2}
                for pre in prefixes:
                    search[bucket(pre)][(name,iri,a['source'])]=[name,key,a['source'],a['label'],a['deprecated']]
            for e in a['relations']:
                if e['target'] not in records: dangling[e['predicate']]+=1
        ss=sorted(set(a['source'] for a in r['assertions']))
        for i,s in enumerate(ss):
            for t in ss[i+1:]: overlaps[s+' / '+t]+=1
    index=[]
    for key,rs in sorted(shards.items()): index.append({'kind':'records','bucket':key,**dump_shard(OUT/'records'/(key+'.json.gz'),rs)})
    del shards; gc.collect()
    for key,rs in sorted(search.items()): index.append({'kind':'search','bucket':key,**dump_shard(OUT/'search'/(key+'.json.gz'),sorted(rs.values()))})
    collisions=[{'label':k,'distinctIris':len(v),'examples':sorted(v)[:8]} for k,v in labels.items() if len(v)>1]
    collisions.sort(key=lambda x:(-x['distinctIris'],x['label']))
    totals={'sources':len(manifest),'distinctIris':len(records),'sourceRecords':sum(s['counts']['records'] for s in manifest),'relations':sum(s['counts']['relations'] for s in manifest),'restrictions':sum(s['counts']['restrictions'] for s in manifest),'ambiguousLabels':len(collisions),'sharedIris':sum(len(set(a['source'] for a in r['assertions']))>1 for r in records.values()),'newExecutableOperations':0}
    audit={'totals':totals,'sourceOverlaps':[{'sources':k,'sharedIris':v} for k,v in overlaps.most_common()],'ambiguousLabelExamples':collisions[:150],'predicateCounts':dict(hist.most_common()),'externalTargetsByPredicate':dict(dangling.most_common()),'warnings':warnings,'policy':'Shared IRI aggregates source assertions; shared label does not merge concepts. Source overlaps are not independent corroboration. No inference from ontology membership to physical truth.'}
    dump(OUT/'audit.json',audit); dump(OUT/'integrity.json',index)
    result={'schema':'observatory-ontology-ledger/1','totals':totals,'sources':manifest,'audit':'/ledger-data/audit.json','integrity':'/ledger-data/integrity.json','searchPolicy':'NFKC/lowercase label or synonym word-prefix lookup. Ambiguity retained, results paginated; definitions are not full-text searched. English preferred for display; supplied language tags retained. OBO export language omissions remain unknown.','boundary':'Imported scientific vocabulary and source assertions. Not complete science, a theorem proof, an observation or a new executable operation. Raw captures preserve omitted OWL axioms.','warnings':warnings}
    dump(OUT/'manifest.json',result)
    (SITE/'lib'/'ontology-summary.json').write_text(json.dumps({'schema':result['schema'],'totals':totals,'sources':[{k:s[k] for k in ['id','title','rooms','license','counts','homepage']} for s in manifest],'manifest':'/ledger-data/manifest.json','audit':result['audit'],'boundary':result['boundary']},ensure_ascii=False,indent=2),encoding='utf-8')
    print('COMPLETE',totals,flush=True)
if __name__=='__main__': main()
