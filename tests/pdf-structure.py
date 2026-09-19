"""Strict parsing plus pixel/content comparison; never rewrite the editorial content."""
from pathlib import Path
from io import BytesIO
import hashlib
import re
import subprocess
import fitz
from pypdf import PdfReader

source = Path('assets/guides/deca-2026-v2.1-original.pdf')
fixed = Path('assets/guides/prepared/guia-deca-2026-gauna-v2.1.1.pdf')
proof = Path('test-output/pdf-structure')
proof.mkdir(parents=True, exist_ok=True)

failed = False
try:
    old_reader = PdfReader(source, strict=True)
    _ = len(old_reader.pages)
except Exception as exc:
    failed = True
    print(f'BEFORE: strict parser rejects original PDF: {type(exc).__name__}: {exc}')
assert failed, 'Diagnostic baseline changed; investigate before trusting the repair'

reader = PdfReader(fixed, strict=True)
assert reader.trailer['/Root']['/Lang'] == 'es-ES'
assert len(reader.pages) == 28
for page in reader.pages:
    assert len(page.extract_text().strip()) > 40
    for font_ref in page['/Resources']['/Font'].values():
        font = font_ref.get_object()
        if '/ToUnicode' in font:
            cmap = font['/ToUnicode'].get_data()
            for block in re.findall(rb'(\d+) beginbfchar', cmap):
                assert 0 < int(block) <= 100

before, after = fitz.open(source), fitz.open(fixed)
assert before.get_toc() == after.get_toc(), 'Bookmarks changed'
assert before.metadata == after.metadata, 'Editorial metadata changed'
for i in range(28):
    a, b = before[i], after[i]
    assert a.get_text() == b.get_text(), f'Page {i+1}: text changed'
    assert a.get_links() == b.get_links(), f'Page {i+1}: links changed'
    assert a.rect == b.rect, f'Page {i+1}: dimensions changed'
    ap = a.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    bp = b.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    assert ap.samples == bp.samples, f'Page {i+1}: rendered pixels changed'
    if i in (0, 10, 27):
        bp.save(str(proof / f'page-{i+1}.png'))

check = subprocess.run(['gs', '-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dPDFSTOPONERROR', '-sDEVICE=nullpage', str(fixed)], text=True, capture_output=True)
assert check.returncode == 0, check.stdout + check.stderr
assert not re.search(r'warning|error|repaired|ignored', check.stdout + check.stderr, re.I), check.stdout + check.stderr
print('AFTER: pypdf strict and Ghostscript pass without repair warnings. All 28 pages pixel-identical at 144 dpi; text, links, bookmarks and metadata unchanged.')
print('CORRECTED SHA-256:', hashlib.sha256(fixed.read_bytes()).hexdigest())
