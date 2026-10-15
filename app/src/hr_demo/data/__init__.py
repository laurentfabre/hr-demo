"""Portable, generated synthetic demonstration resources.

These resources are a frozen local SQL calculation, not a live HR connector,
trained model, authorization grant or certification-gate result.
"""

from importlib.resources import files
import json


def load_snapshot() -> dict:
    """Return an independent copy of the packaged presentation snapshot."""
    return json.loads(files(__package__ or "hr_demo.data").joinpath("snapshot.json").read_text(encoding="utf-8"))


def load_document(document_id: str) -> dict:
    """Resolve only the four packaged synthetic job-evidence documents."""
    documents = json.loads(files(__package__ or "hr_demo.data").joinpath("documents.json").read_text(encoding="utf-8"))
    return documents[document_id]
