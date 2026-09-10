"""One command for the public CPU reproduction, with explicit download opt-in."""
from pathlib import Path
import argparse
import os
import subprocess
import sys

HERE=Path(__file__).resolve().parent
def run(name,*args):
    subprocess.run([sys.executable,str(HERE/name),*args],check=True,cwd=HERE)

def main():
    parser=argparse.ArgumentParser(description='Four-context author-data benchmark; about697MB download and3GB working disk.')
    parser.add_argument('--download',action='store_true',help='Download the four checksum-pinned public LFC files if absent.')
    args=parser.parse_args()
    run('test_transfer.py')
    if args.download:run('download_public.py','lfc')
    root=Path(os.environ.get('VIRTUAL_CELL_WORKSPACE',str(HERE)))
    if not all((root/'data'/f'{c}Essential_Log2FoldChange.csv.gz').exists() for c in ['K562','RPE1','HepG2','Jurkat']):
        raise SystemExit('Input files missing. Run again with --download to fetch about697MB of public author data, or set VIRTUAL_CELL_WORKSPACE to an existing cache.')
    run('ingest.py');run('run_benchmark.py')

if __name__=='__main__':main()
