#!/usr/bin/env python3
"""Convert Lab MD files to Colab-suitable Jupyter notebooks."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# Colab metadata to add to each notebook
COLAB_NOTEBOOK_METADATA = {
    "colab": {
        "name": "",  # filled per notebook
        "provenance": [],
        "toc_visible": True,
    },
    "kernelspec": {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3",
    },
    "language_info": {
        "name": "python",
        "version": "3.10.0",
    },
}


def md_to_cells(md_text: str) -> list[dict]:
    """Split markdown content into alternating markdown and code cells."""
    cells = []
    # Only match ```python ... ``` blocks (require explicit 'python' tag so that
    # bare ``` fences used in Mermaid diagrams and other non-Python blocks are left
    # as markdown and do not cascade cell-type mismatches).
    # Closing fence must be ``` on a line by itself (^```[ \t]*$).
    pattern = re.compile(r"^```python[ \t]*\n(.*?)\n^```[ \t]*$", re.MULTILINE | re.DOTALL)
    last_end = 0
    for match in pattern.finditer(md_text):
        # Markdown before this code block
        before = md_text[last_end : match.start()]
        before = re.sub(r"\s*```python[ \t]*\n?$", "", before).strip()
        if before:
            cells.append({"cell_type": "markdown", "metadata": {}, "source": to_source(before)})
        # Code block
        code = match.group(1).rstrip()
        cells.append({"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": to_source(code)})
        last_end = match.end()
    # Remaining markdown after last code block
    after = md_text[last_end:].strip()
    if after:
        cells.append({"cell_type": "markdown", "metadata": {}, "source": to_source(after)})
    return cells


def to_source(text: str) -> list[str]:
    """Convert string to Jupyter source format (list of lines with trailing newline)."""
    if not text:
        return []
    lines = text.split("\n")
    return [line + "\n" for line in lines[:-1]] + ([lines[-1] + "\n"] if lines[-1] else [])


def get_notebook_title(md_path: Path) -> str:
    """Extract first # title from markdown file."""
    text = md_path.read_text(encoding="utf-8")
    m = re.match(r"^#\s+(.+)$", text, re.MULTILINE)
    return m.group(1).strip() if m else md_path.stem


def convert_lab(md_name: str) -> None:
    """Convert one Lab MD file to ipynb."""
    md_path = ROOT / md_name
    if not md_path.exists():
        print(f"Skip (not found): {md_path}")
        return
    md_text = md_path.read_text(encoding="utf-8")
    cells = md_to_cells(md_text)
    if not cells:
        # No code blocks: single markdown cell
        cells = [{"cell_type": "markdown", "metadata": {}, "source": to_source(md_text)}]
    title = get_notebook_title(md_path)
    metadata = dict(COLAB_NOTEBOOK_METADATA)
    metadata["colab"]["name"] = f"{Path(md_name).stem}.ipynb"
    nb = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": metadata,
        "cells": cells,
    }
    ipynb_path = md_path.with_suffix(".ipynb")
    ipynb_path.write_text(json.dumps(nb, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {ipynb_path.name} ({len(cells)} cells)")


def main():
    labs = [
        "Lab0_Build_an_EOP_Agent_Prototype.md",
        "Lab1_Anatomy_of_a_Decision.md",
        "Lab2_Contract_of_a_Tool.md",
        "Lab3_The_Persistent_Agent.md",
        "Lab4_Graphs_Cycles_and_Recovery.md",
        "Lab5_Evidence_Chain_Extraction.md",
        "Lab6_Claim_Contingent_Disclosure.md",
        "Lab7_EOP_Spokesperson.md",
    ]
    for lab in labs:
        convert_lab(lab)


if __name__ == "__main__":
    main()
