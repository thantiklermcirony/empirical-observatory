"""Bounded downloads of selected CC BY 4.0 author-published datasets."""
from pathlib import Path
import argparse
import hashlib
import json
import time
import os
import urllib.request
from datetime import datetime, timezone

HERE=Path(__file__).resolve().parent
SELECTED={
 'paired':('replogle-figshare-record.json',['K562_essential_raw_bulk_01.h5ad','rpe1_raw_bulk_01.h5ad']),
 'lfc':('nadig-figshare-record.json',['K562Essential_Log2FoldChange.csv.gz','RPE1Essential_Log2FoldChange.csv.gz','HepG2Essential_Log2FoldChange.csv.gz','JurkatEssential_Log2FoldChange.csv.gz']),
}

def digest(path):
    md5=hashlib.md5()
    sha=hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1<<20),b''):
            md5.update(chunk);sha.update(chunk)
    return md5.hexdigest(),sha.hexdigest()

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('group',choices=SELECTED)
    args=parser.parse_args()
    metadata,names=SELECTED[args.group]
    record=json.loads((HERE/metadata).read_text())
    if record['license']['name']!='CC BY 4.0':raise ValueError('Review the actual data license')
    folder=Path(os.environ.get('VIRTUAL_CELL_WORKSPACE',str(HERE)))/'data';folder.mkdir(exist_ok=True)
    for name in names:
        file=next(x for x in record['files'] if x['name']==name)
        if Path(name).name!=name or file['size']>250_000_000:raise ValueError('File exceeds bounded selection')
        path=folder/name
        if path.exists():
            md5,sha=digest(path)
            if path.stat().st_size==file['size'] and md5==file['computed_md5']:
                print(name,'already verified',flush=True);continue
            raise ValueError('Existing file does not match; preserve it for inspection')
        started=time.monotonic();size=0;md5=hashlib.md5();sha=hashlib.sha256()
        request=urllib.request.Request(file['download_url'],headers={'User-Agent':'Empirical-Observatory-public-research/0.1'})
        partial=path.with_suffix(path.suffix+'.part')
        with urllib.request.urlopen(request,timeout=45) as response,partial.open('wb') as output:
            if response.status!=200:raise ValueError(f'Unexpected status {response.status}')
            length=response.headers.get('Content-Length')
            if length and int(length)!=file['size']:raise ValueError('Unexpected declared size')
            while chunk:=response.read(1<<20):
                size+=len(chunk)
                if size>file['size']:raise ValueError('Download exceeds declared size')
                md5.update(chunk);sha.update(chunk);output.write(chunk)
        if size!=file['size'] or md5.hexdigest()!=file['computed_md5']:raise ValueError('Source checksum mismatch')
        partial.rename(path)
        manifest={'file':name,'source_url':file['download_url'],'source_article':record['id'],'license':record['license'],'bytes':size,'md5':md5.hexdigest(),'sha256':sha.hexdigest(),'retrieved_at':datetime.now(timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-started}
        path.with_suffix(path.suffix+'.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
        print(name,size,'verified',sha.hexdigest(),flush=True)

if __name__=='__main__':main()
