"""Run the MadisonBites backend. Usage: python3 run_backend.py"""
import sys
import os

# Make sure `import backend` resolves to ./backend/
sys.path.insert(0, os.path.dirname(__file__))

import uvicorn

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=2026, reload=True,
                reload_dirs=[os.path.dirname(__file__)])
