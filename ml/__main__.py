"""Main module entry point for running the WaterGuard AI ML job.

Enables invocation via:
    python -m ml
"""

import sys
from ml.cli import main

if __name__ == "__main__":
    sys.exit(main())
