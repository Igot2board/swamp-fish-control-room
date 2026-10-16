"""Derive launcher sizes from Eric's exact approved art. Requires Pillow.

Usage: python scripts/prepare-icons.py /absolute/path/to/selected-original.png
The original stays outside the deployed icons directory.
"""
from pathlib import Path
import hashlib
import sys
from PIL import Image

source = Path(sys.argv[1])
expected = '4deff47496d446ea76df529374201198b7ec33e552fc9e8116fc0e30e5321b98'
if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
    raise SystemExit('This is not the approved source icon.')
image = Image.open(source).convert('RGB')
if image.size != (1254, 1254):
    raise SystemExit('Unexpected source size.')
destination = Path(__file__).resolve().parent.parent / 'icons'
for size in (192, 512):
    image.resize((size, size), Image.Resampling.LANCZOS).save(
        destination / f'rex-phoenix-v1-{size}.png', optimize=True)
# 72px padding keeps Rex, his gills, the Phoenix and circular reactor inside
# the central safe circle. Outer decorative tile corners may be masked.
maskable = Image.new('RGB', (512, 512), (8, 27, 38))
maskable.paste(image.resize((368, 368), Image.Resampling.LANCZOS), (72, 72))
maskable.save(destination / 'rex-phoenix-v1-maskable-512.png', optimize=True)
