"""Portable local paths; no module depends on its containing Git/Site checkout."""
import argparse
import os
from pathlib import Path


def resolve_paths(argv=None, *, description=None, verification=False):
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--workspace", type=Path,
                        default=Path(os.environ.get("VIRTUAL_CELL_WORKSPACE", str(Path.cwd() / "virtual-cell-workspace"))),
                        help="Local data/result root; default: VIRTUAL_CELL_WORKSPACE or ./virtual-cell-workspace")
    parser.add_argument("--data-dir", type=Path, help="Override workspace/data")
    parser.add_argument("--results-dir", type=Path, help="Override workspace/paired-results")
    if verification:
        parser.add_argument("--verification-output", type=Path,
                            help="Write verification here instead of into the result directory")
    args = parser.parse_args(argv)
    args.workspace = args.workspace.expanduser().resolve()
    args.data_dir = (args.data_dir or args.workspace / "data").expanduser().resolve()
    args.results_dir = (args.results_dir or args.workspace / "paired-results").expanduser().resolve()
    if verification and args.verification_output:
        args.verification_output = args.verification_output.expanduser().resolve()
    return args
