"""Greybox layout for L_WadiAlSukoon_Mobile (fictional village, original layout).

Pure data: no `unreal` import, so it can be checked and previewed outside the editor
(see Tools/greybox_preview.py). otd_build_greybox.py turns it into actors.

Units: centimetres. Axes: +X = north, +Y = east, +Z = up. Ground top is Z = 0.
Map: 100 x 100 m, from -5000 to +5000 on X and Y.

Rows, north to south:
  1. Mountain edge with a cave          X  3800 .. 5000
  2. Mountain road (8 m), rising 4 m     X  1800 .. 3800
  3. Harat (W) | Wadi (C) | Cemetery (E) X  -200 .. 2200
  4. House (W) | Town+souq (C) | Falaj + palm grove (E)   X -4100 .. -1000
  5. Main entrance                        X -5000 .. -4100
Everything here is a PLACEHOLDER shape. Nothing is final architecture.
"""

MAP_HALF = 5000.0
TILE = 800.0  # 8 x 8 m road grid

# Colours (linear RGB) -> one material instance each.
COLORS = {
    'ground': (0.42, 0.33, 0.22),
    'road': (0.09, 0.09, 0.10),
    'plaza': (0.55, 0.50, 0.42),
    'wall': (0.60, 0.45, 0.30),
    'ruin': (0.35, 0.27, 0.20),
    'roof': (0.30, 0.22, 0.15),
    'rock': (0.22, 0.18, 0.15),
    'wadi': (0.50, 0.46, 0.40),
    'water': (0.10, 0.30, 0.45),
    'palm_trunk': (0.25, 0.16, 0.08),
    'palm_crown': (0.10, 0.28, 0.08),
    'prop': (0.45, 0.40, 0.33),
    'boundary': (0.80, 0.10, 0.10),
    'rashid': (0.05, 0.20, 0.80),
    'maryam': (0.90, 0.40, 0.05),
}

# Area rectangles (x0, x1, y0, y1) used for labels, the overlap check and the preview.
AREAS = {
    'Main Entrance': (-5000, -4100, -1600, 1600),
    "Maryam's House": (-2800, -1600, -4100, -2500),
    'Town Square': (-3400, -1000, -1200, 1200),
    'Souq Stalls': (-3350, -1550, 1400, 1800),
    'Palm Grove': (-3200, -1200, 2300, 4300),
    'Abandoned Quarter (Harat)': (-200, 2200, -4500, -2100),
    'Wadi (dry bed)': (600, 1800, -2000, 2400),
    'Old Cemetery (quiet area)': (400, 2000, 2600, 4200),
    'Mountain Road': (1800, 3800, -400, 400),
    'Mountain Edge + Cave': (3800, 5000, -5000, 5000),
}

LABEL_TEXT = {
    'Old Cemetery (quiet area)': 'Old Cemetery - quiet area, no events\n(cultural review required)',
    'Wadi (dry bed)': 'Wadi - dry bed, 12 m',
    'Mountain Edge + Cave': 'Mountain Edge + Cave',
}

PIECES = []   # dicts, see _add()
LABELS = []   # (text, x, y, z)


def _add(area, name, x, y, sx, sy, sz, z=0.0, color='wall', shape='box',
         pitch=0.0, yaw=0.0, collide=True, hidden=False, centered=False, tags=()):
    """z is the BOTTOM of the piece unless centered=True (used for the pitched ramp)."""
    PIECES.append(dict(area=area, name=name, shape=shape, x=float(x), y=float(y),
                       z=float(z) if centered else float(z) + sz / 2.0,
                       sx=float(sx), sy=float(sy), sz=float(sz), pitch=float(pitch), yaw=float(yaw),
                       color=color, collide=collide, hidden=hidden, tags=tuple(tags)))


def _segments(a, b, gaps):
    """Split [a, b] around gaps given as (centre, width)."""
    out, cur = [], a
    for c, w in sorted(gaps):
        if c - w / 2 > cur:
            out.append((cur, c - w / 2))
        cur = max(cur, c + w / 2)
    if cur < b:
        out.append((cur, b))
    return out


def enclosure(area, name, x0, x1, y0, y1, h, t=40, color='wall', gaps=None):
    """Four walls on a rectangle. gaps = {'N'|'S'|'E'|'W': [(centre, width), ...]}"""
    gaps = gaps or {}
    for side in 'NSEW':
        if side in 'NS':
            x = x1 - t / 2 if side == 'N' else x0 + t / 2
            for a, b in _segments(y0, y1, gaps.get(side, [])):
                _add(area, f'{name}_{side}', x, (a + b) / 2, t, b - a, h, color=color)
        else:
            y = y1 - t / 2 if side == 'E' else y0 + t / 2
            for a, b in _segments(x0 + t, x1 - t, gaps.get(side, [])):
                _add(area, f'{name}_{side}', (a + b) / 2, y, b - a, t, h, color=color)


def palm(area, name, x, y, h=700):
    _add(area, name + '_Trunk', x, y, 35, 35, h, color='palm_trunk', shape='cylinder')
    _add(area, name + '_Crown', x, y, 300, 300, 180, z=h - 60, color='palm_crown', shape='cone', collide=False)


def build():
    PIECES.clear()
    LABELS.clear()
    H = MAP_HALF

    # ---- Ground + invisible boundary --------------------------------------------------
    _add('Ground', 'Ground', 0, 0, 2 * H, 2 * H, 50, z=-50, color='ground')
    for nm, x, y, sx, sy in (('N', H + 50, 0, 100, 2 * H + 200), ('S', -H - 50, 0, 100, 2 * H + 200),
                             ('E', 0, H + 50, 2 * H, 100), ('W', 0, -H - 50, 2 * H, 100)):
        _add('Boundary', 'Boundary_' + nm, x, y, sx, sy, 1500, color='boundary', hidden=True)

    # ---- Road grid: 8 x 8 m tiles ------------------------------------------------------
    # Main north-south road on Y = 0 (entrance -> square -> ford -> mountain road).
    x = -H + TILE / 2
    while x < 1800:
        inside_square = -3400 < x < -1000
        crosses_wadi = 600 < x < 1800
        if not inside_square and not crosses_wadi:
            _add('Roads', f'Road_NS_{int(x)}', x, 0, TILE, TILE, 4, color='road')
        x += TILE
    # East-west road along the square's north edge (X -1000 .. -200).
    y = -5 * TILE
    while y <= 5 * TILE:
        if y != 0:  # the NS road tile already covers the junction
            _add('Roads', f'Road_EW_{int(y)}', -600, y, TILE, TILE, 4, color='road')
        y += TILE
    # Lane from the square to Maryam's gate.
    _add('Roads', 'Road_ToMaryamGate', -2200, -1850, TILE, 1300, 4, color='road')

    # ---- 5. Main entrance ---------------------------------------------------------------
    a = 'Main Entrance'
    for s in (-1, 1):
        _add(a, f'GatePillar_{s}', -4800, s * 600, 80, 80, 450, color='wall')
    _add(a, 'GateBeam', -4800, 0, 80, 1280, 60, z=450, color='wall')
    _add(a, 'SignBoard', -4500, 700, 20, 200, 120, z=120, color='prop')
    _add(a, 'SignPost', -4500, 700, 15, 15, 120, color='prop')
    _add(a, 'Parking', -4550, -1100, 900, 900, 3, color='plaza')

    # ---- 4. Town row ---------------------------------------------------------------------
    a = 'Town Square'
    _add(a, 'Plaza', -2200, 0, 2400, 2400, 5, color='plaza')
    _add(a, 'Well_Placeholder', -2200, 400, 160, 160, 80, color='prop', shape='cylinder')
    for i, (cx, cy) in enumerate(((-3000, -950), (-1450, -950))):
        _add(a, f'StallCanopy{i}_Table', cx, cy, 200, 100, 90, color='prop')
        for dx in (-110, 110):
            for dy in (-60, 60):
                _add(a, f'StallCanopy{i}_Pole', cx + dx, cy + dy, 8, 8, 230, color='prop', collide=False)
        _add(a, f'StallCanopy{i}_Roof', cx, cy, 260, 160, 6, z=230, color='roof', collide=False)
    # Fort tower placeholder at the square's NE corner.
    _add(a, 'FortTower', -1300, 1500, 500, 500, 900, color='wall', shape='cylinder')

    a = 'Souq Stalls'
    for i, cx in enumerate((-3150, -2700, -2250, -1800)):
        _add(a, f'Shop{i}', cx, 1650, 400, 300, 300, color='wall')
        _add(a, f'Shop{i}_Awning', cx, 1430, 400, 140, 6, z=260, color='roof', collide=False)

    # Neighbour houses (generic blocks, interior later).
    _add('Town Square', 'House_NeighbourW', -3100, -1900, 600, 800, 350, color='wall')
    _add('Town Square', 'House_NeighbourE', -1400, -1900, 600, 600, 350, color='wall')

    a = "Maryam's House"
    # Compound 12 m (N-S) x 16 m (E-W); gate on the EAST wall, facing the lane to the square.
    enclosure(a, 'Compound', -2800, -1600, -4100, -2500, 300, gaps={'E': [(-2200, 300)]})
    _add(a, 'House_Block', -2450, -3500, 600, 1000, 320, color='wall')
    _add(a, 'House_RoofParapet', -2450, -3500, 620, 1020, 40, z=320, color='roof')
    palm(a, 'CourtyardPalm', -1950, -3000, 550)

    a = 'Palm Grove'
    for i in range(5):
        for j in range(5):
            px, py = -3000 + i * 400 + (j % 2) * 60, 2500 + j * 400
            palm(a, f'Palm_{i}{j}', px, py, 600 + ((i * 3 + j * 5) % 4) * 60)

    # Falaj: a narrow open channel from the wadi bank south past the grove.
    a = 'Falaj Channel'
    _add(a, 'Falaj_WallW', -1300, 1965, 3800, 20, 40, color='wall')
    _add(a, 'Falaj_WallE', -1300, 2035, 3800, 20, 40, color='wall')
    _add(a, 'Falaj_Water', -1300, 2000, 3800, 50, 25, color='water', collide=False)

    # ---- 3. Middle row ------------------------------------------------------------------
    a = 'Abandoned Quarter (Harat)'
    cx0, cy0 = 1000, -3300
    for i, dx in enumerate((-900, 0, 900)):
        for j, dy in enumerate((-900, 0, 900)):
            h = 220 + ((i * 7 + j * 3) % 5) * 40   # uneven, ruined wall heights
            hx, hy = cx0 + dx, cy0 + dy
            enclosure(a, f'Ruin_{i}{j}', hx - 300, hx + 300, hy - 300, hy + 300, h, color='ruin',
                      gaps={'S': [(hy, 120)]})
            if (i + j) % 3 == 0:  # some houses keep part of a roof
                _add(a, f'Ruin_{i}{j}_Roof', hx + 100, hy, 400, 600, 20, z=h, color='roof')

    a = 'Wadi (dry bed)'
    _add(a, 'WadiBed', 1200, 200, 1200, 4400, 3, color='wadi')
    for side, x in (('S', 620), ('N', 1780)):
        gaps = [(0, 800)] + ([(2000, 120)] if side == 'S' else [])  # ford + falaj inlet
        for y0, y1 in _segments(-2000, 2400, gaps):
            _add(a, f'Bank_{side}', x, (y0 + y1) / 2, 40, y1 - y0, 60, color='rock')
    _add(a, 'Ford', 1200, 0, 1200, TILE, 6, color='wadi')
    for k, (bx, by, s) in enumerate(((900, -1500, 90), (1500, -800, 60), (1000, 900, 110),
                                     (1550, 1600, 70), (1300, -1900, 80), (850, 2200, 60))):
        _add(a, f'Boulder{k}', bx, by, s, s * 1.2, s * 0.7, color='rock')

    a = 'Old Cemetery (quiet area)'
    # A low wall only. No graves are modelled and no story event happens here.
    enclosure(a, 'Wall', 400, 2000, 2600, 4200, 100, color='wall', gaps={'W': [(1200, 200)]})

    # ---- 2. Mountain road -------------------------------------------------------------
    a = 'Mountain Road'
    _add(a, 'Road_Flat', 2200, 0, TILE, TILE, 4, color='road')
    # Ramp: X 2600 -> 3800 (12 m), rising 4 m (about 18 degrees, walkable).
    _add(a, 'Road_Ramp', 3200, 0, 1265, TILE, 30, z=185, pitch=18.43, color='road', centered=True)
    for k in range(5):
        gx = 2700 + k * 250
        gz = (gx - 2600) / 1200 * 400
        for s in (-1, 1):
            _add(a, f'GuardStone_{k}_{s}', gx, s * 440, 60, 40, 50, z=gz, color='rock')

    # ---- 1. Mountain edge + cave ------------------------------------------------------
    a = 'Mountain Edge + Cave'
    _add(a, 'Plateau', 4400, 0, 1200, 2 * H, 400, color='rock')       # 4 m step, top at Z 400
    heights = (1400, 1800, 1200, 2000)
    for side, (y0, y1) in (('W', (-H, -250)), ('E', (250, H))):
        step = (y1 - y0) / 4
        for k in range(4):
            hh = heights[k if side == 'E' else 3 - k]
            _add(a, f'Cliff_{side}{k}', 4600, y0 + step * (k + 0.5), 800, step, hh, z=400, color='rock')
    # Cave: 5 m wide opening, 3.5 m high, 7 m deep chamber.
    _add(a, 'Cave_Lintel', 4600, 0, 800, 500, 900, z=750, color='rock')
    _add(a, 'Cave_BackWall', 4950, 0, 100, 500, 350, z=400, color='rock')
    for k, (bx, by, s) in enumerate(((4050, 500, 120), (4100, -650, 90), (3950, 900, 70))):
        _add(a, f'Rockfall{k}', bx, by, s, s * 1.3, s * 0.8, z=400, color='rock')
    _add(a, 'SurveyMast', 4000, 1600, 20, 20, 600, z=400, color='prop', shape='cylinder')

    # ---- Character positions (placeholders only) --------------------------------------
    # Rashid: the player start is outside Maryam's gate, facing her (west, yaw -90).
    _add('Characters', 'Marker_Rashid', -2200, -2100, 70, 70, 175, color='rashid', shape='cylinder',
         collide=False, hidden=True, tags=('OTD.Spawn.Rashid',))
    _add('Characters', 'Marker_Maryam', -2200, -2330, 60, 60, 165, color='maryam', shape='cylinder',
         collide=False, tags=('OTD.NPC.Maryam',))
    _add('Characters', 'Marker_Maryam_Facing', -2200, -2290, 20, 30, 20, z=140, color='maryam',
         collide=False, tags=('OTD.NPC.Maryam',))

    # ---- Labels -----------------------------------------------------------------------
    for name, (x0, x1, y0, y1) in AREAS.items():
        z = 2200 if name.startswith('Mountain Edge') else 450
        LABELS.append((LABEL_TEXT.get(name, name), (x0 + x1) / 2, (y0 + y1) / 2, z))
    LABELS.append(('Falaj Channel', -2700, 2000, 250))
    LABELS.append(('Rashid spawn (1.75 m)', -2200, -2100, 230))
    LABELS.append(('Maryam (placeholder)', -2200, -2330, 210))
    return PIECES, LABELS


RASHID_SPAWN = (-2200.0, -2100.0, 100.0, -90.0)   # x, y, z (capsule centre), yaw
MARYAM_POSITION = (-2200.0, -2330.0, 0.0, 90.0)   # x, y, ground z, yaw (faces Rashid)


def self_check():
    """Returns a list of problems (empty = OK). Run outside the editor."""
    problems = []
    names = list(AREAS)
    for i, a in enumerate(names):
        ax0, ax1, ay0, ay1 = AREAS[a]
        if min(ax0, ay0) < -MAP_HALF or max(ax1, ay1) > MAP_HALF:
            problems.append(f'{a} leaves the map')
        for b in names[i + 1:]:
            bx0, bx1, by0, by1 = AREAS[b]
            if ax0 < bx1 and bx0 < ax1 and ay0 < by1 and by0 < ay1:
                problems.append(f'{a} overlaps {b}')
    sx, sy = RASHID_SPAWN[:2]
    for p in PIECES:
        if not p['collide'] or p['area'] in ('Ground', 'Roads') or p['name'] in ('Plaza',):
            continue
        if abs(p['x'] - sx) < p['sx'] / 2 + 40 and abs(p['y'] - sy) < p['sy'] / 2 + 40 and p['z'] - p['sz'] / 2 < 180:
            problems.append(f"Rashid spawn blocked by {p['name']}")
    return problems
