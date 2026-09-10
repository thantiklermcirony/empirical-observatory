"""Absolute-path MCP launcher; no package installation or PYTHONPATH required."""
import sys
sys.dont_write_bytecode = True
from active_context.mcp import main

if __name__ == '__main__':
    raise SystemExit(main())
