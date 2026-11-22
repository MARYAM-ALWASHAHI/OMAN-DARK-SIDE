"""Checks the greybox layout and draws a top-down preview, without Unreal.

    python3 Tools/greybox_preview.py            -> runs self_check(), writes Docs/Images/greybox_topdown.png
Requires Pillow. North is up, east is right (same as the in-engine layout: +X north, +Y east).
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'Content', 'Python'))
import otd_greybox_layout as L  # noqa: E402

from PIL import Image, ImageDraw, ImageFont  # noqa: E402

pieces, labels = L.build()
problems = L.self_check()
print(f'{len(pieces)} pieces, {len(labels)} labels')
print('self-check:', 'OK' if not problems else problems)

S = 1400 / (2 * L.MAP_HALF)   # px per cm
PAD = 40
W = int(2 * L.MAP_HALF * S) + 2 * PAD


def to_px(x, y):
    return PAD + (y + L.MAP_HALF) * S, PAD + (L.MAP_HALF - x) * S


def rgb(key, k=1.0):
    r, g, b = L.COLORS[key]
    return tuple(int(min(1, (c ** (1 / 2.2)) * k) * 255) for c in (r, g, b))


img = Image.new('RGB', (W, W), (20, 20, 20))
d = ImageDraw.Draw(img)
order = sorted(pieces, key=lambda p: p['z'] + p['sz'] / 2)  # draw low things first
for p in order:
    if p['hidden'] and p['area'] == 'Boundary':
        continue
    hx = p['sx'] / 2 * (0.948 if p['pitch'] else 1)  # ramp footprint (cos 18.4)
    x0, y0 = to_px(p['x'] + hx, p['y'] - p['sy'] / 2)
    x1, y1 = to_px(p['x'] - hx, p['y'] + p['sy'] / 2)
    shade = 0.75 + min(0.5, (p['z'] + p['sz'] / 2) / 4000)
    fill = rgb(p['color'], shade)
    if p['shape'] in ('cylinder', 'cone'):
        d.ellipse([x0, y0, x1, y1], fill=fill, outline=(0, 0, 0))
    else:
        d.rectangle([x0, y0, x1, y1], fill=fill, outline=(0, 0, 0) if p['area'] != 'Ground' else None)

try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
    small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
except OSError:
    font = small = ImageFont.load_default()
legend = []
for text, x, y, _z in labels:
    px, py = to_px(x, y)
    if 'spawn' in text or 'placeholder' in text:  # character markers: dot here, text in the legend
        col = rgb('rashid' if 'Rashid' in text else 'maryam', 1.6)
        d.ellipse([px - 7, py - 7, px + 7, py + 7], fill=col, outline=(255, 255, 255), width=2)
        legend.append((text, col))
        continue
    f = font
    d.multiline_text((px, py), text, font=f, fill=(255, 255, 255), anchor='mm', align='center',
                     stroke_width=3, stroke_fill=(0, 0, 0))
for i, (text, col) in enumerate(legend):
    ly = W - 70 + i * 22
    d.ellipse([W - 330, ly - 7, W - 316, ly + 7], fill=col, outline=(255, 255, 255), width=2)
    d.text((W - 306, ly), text, font=small, fill=(255, 255, 255), anchor='lm')
# 10 m scale bar + north arrow
d.line([PAD, W - 15, PAD + 1000 * S, W - 15], fill=(255, 255, 255), width=3)
d.text((PAD + 1000 * S + 8, W - 24), '10 m', font=small, fill=(255, 255, 255))
d.text((W - PAD - 30, 8), 'N ^', font=font, fill=(255, 255, 255))
d.text((PAD, 10), 'L_WadiAlSukoon_Mobile - greybox 100 x 100 m (placeholder shapes only)', font=font, fill=(255, 255, 255))

out = os.path.join(ROOT, 'Docs', 'Images', 'greybox_topdown.png')
img.save(out)
print('wrote', out)
sys.exit(1 if problems else 0)
