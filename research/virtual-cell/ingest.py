"""Stream author LFC tables to disk, preserving labels and exact source lineage."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import time
import os
import numpy as np
import pandas as pd

HERE=Path(__file__).resolve().parent
ROOT=Path(os.environ.get('VIRTUAL_CELL_WORKSPACE',str(HERE)))
CONTEXTS=['K562','RPE1','HepG2','Jurkat']

def sha(path:Path)->str:
    digest=hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1<<20),b''):digest.update(chunk)
    return digest.hexdigest()

def main()->None:
    prepared=ROOT/'prepared';prepared.mkdir(exist_ok=True)
    source_info={};manifest={'protocol_sha256':sha(HERE/'protocol.json'),'contexts':{}}
    for context in CONTEXTS:
        start=time.monotonic()
        source=ROOT/'data'/f'{context}Essential_Log2FoldChange.csv.gz'
        pin=json.loads(source.with_suffix(source.suffix+'.manifest.json').read_text())
        if sha(source)!=pin['sha256']:raise ValueError('Source hash changed')
        genes=[];targets=None;bad=0;infinite=0
        raw=prepared/f'{context}.all.f32'
        with raw.open('wb') as destination:
            for chunk in pd.read_csv(source,index_col=0,chunksize=512):
                names=[str(x) for x in chunk.columns]
                if targets is None:targets=names
                if targets!=names:raise ValueError('Column identity changed within file')
                values=chunk.to_numpy(dtype=np.float32)
                bad+=int((~np.isfinite(values)).sum())
                infinite+=int(np.isinf(values).sum())
                genes.extend(str(x) for x in chunk.index)
                destination.write(values.tobytes(order='C'))
        if targets is None or not genes:raise ValueError('Empty author matrix')
        if len(set(genes))!=len(genes) or len(set(targets))!=len(targets):raise ValueError('Duplicate labels')
        source_info[context]={'genes':genes,'targets':targets,'raw':str(raw),'nonfinite_values':bad,'infinite_values':infinite,'input':pin}
        print(context,'shape',(len(genes),len(targets)),'nonfinite',bad,'seconds',round(time.monotonic()-start,2),flush=True)
    (prepared/'source-axes.json').write_text(json.dumps(source_info,indent=2)+'\n')
    if any(v['infinite_values'] for v in source_info.values()):
        raise ValueError('Infinite author estimates require inspection; NaNs remain missing under protocol0.3')
    genes=sorted(set.intersection(*(set(v['genes']) for v in source_info.values())))
    targets=sorted(set.intersection(*(set(v['targets']) for v in source_info.values())))
    if not genes or not targets:raise ValueError('No common gene/target panel')
    for context,info in source_info.items():
        raw=np.memmap(info['raw'],dtype=np.float32,mode='r',shape=(len(info['genes']),len(info['targets'])))
        gi={name:i for i,name in enumerate(info['genes'])};ti={name:i for i,name in enumerate(info['targets'])}
        rows=np.asarray([gi[g] for g in genes]);columns=np.asarray([ti[t] for t in targets])
        output=prepared/f'{context}.npy'
        result=np.lib.format.open_memmap(output,mode='w+',dtype=np.float32,shape=(len(targets),len(genes)))
        for start in range(0,len(genes),512):
            selection=raw[rows[start:start+512]][:,columns]
            result[:,start:start+512]=selection.T
        result.flush();del result
        manifest['contexts'][context]={'source':info['input'],'source_shape':[len(info['genes']),len(info['targets'])],'matrix_sha256':sha(output),'excluded_gene_labels':len(info['genes'])-len(genes),'excluded_target_labels':len(info['targets'])-len(targets),'nonfinite_values':info['nonfinite_values']}
    manifest.update(genes=genes,targets=targets,shape=[len(targets),len(genes)],selection='All common labels; no response-value or significance filter')
    (prepared/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('Common panel',manifest['shape'],'protocol',manifest['protocol_sha256'],flush=True)

if __name__=='__main__':main()
