import pygame
import sys
import math
import random
import array as _arr
import json
import os

pygame.mixer.pre_init(44100, -16, 1, 512)
pygame.init()

# ─── Screen ───────────────────────────────────────────────────────────────────
SCREEN_W, SCREEN_H = 1280, 720
screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
pygame.display.set_caption("CircleDash")
clock = pygame.time.Clock()
FPS = 60

# ─── Corridor ─────────────────────────────────────────────────────────────────
WALL_H = 130                       # height of each wall strip
CTOP   = WALL_H                    # y of corridor top
CBOT   = SCREEN_H - WALL_H        # y of corridor bottom

# ─── Player ───────────────────────────────────────────────────────────────────
PX         = 220                   # fixed x position
PY0        = (CTOP + CBOT) // 2   # starting y
PR         = 18                    # radius
GRAVITY    = 0.38
MAX_VY     = 9.0
BASE_SPEED = 4.5
TRAIL_LEN  = 20

# ─── Colors ───────────────────────────────────────────────────────────────────
BG       = (  6,   6,  20)
WALL_C   = ( 28,  28,  52)
WALL_E   = ( 65,  65, 115)   # wall edge highlight
GRID_C   = ( 13,  13,  33)
PC       = ( 90, 190, 255)   # player outer
PCI      = (200, 235, 255)   # player inner
PCG      = ( 45, 110, 210)   # player glow
SAW_C    = (230,  50,  50)
SAW_I    = (100,  20,  20)
SAW_E    = (255, 110,   0)
LAS_C    = (220,   0, 255)
LAS_OFF  = ( 50,   0,  65)
ORB_COLS = [
    ((255, 140,   0), (170,  55,   0)),
    ((  0, 220, 255), (  0,  90, 185)),
    ((200,   0, 255), ( 95,   0, 175)),
]
TEXTC    = (200, 220, 255)
DEATHC   = (255,  60,  60)
NOTEC    = (150, 170, 235)

# ─── Skins ────────────────────────────────────────────────────────────────────
# unlock_lv=None means always unlocked; otherwise (level, min_meters)
SKINS = [
    {"name": "Plasma",  "pc": ( 90, 190, 255), "pci": (200, 235, 255), "pcg": ( 45, 110, 210), "unlock_lv": None, "unlock_m": 0,   "unlock_desc": "Default"},
    {"name": "Inferno", "pc": (255, 110,  40), "pci": (255, 225, 160), "pcg": (210,  50,  10), "unlock_lv": 1,    "unlock_m": 200, "unlock_desc": "200 m on Lvl 1"},
    {"name": "Void",    "pc": (175,  55, 255), "pci": (225, 175, 255), "pcg": ( 95,  18, 210), "unlock_lv": 2,    "unlock_m": 150, "unlock_desc": "150 m on Lvl 2"},
    {"name": "Cyber",   "pc": ( 45, 255, 185), "pci": (185, 255, 235), "pcg": ( 12, 180, 135), "unlock_lv": 3,    "unlock_m": 100, "unlock_desc": "100 m on Lvl 3"},
    {"name": "Ghost",   "pc": (218, 218, 228), "pci": (255, 255, 255), "pcg": (150, 150, 172), "unlock_lv": 1,    "unlock_m": 450, "unlock_desc": "450 m on Lvl 1"},
    {"name": "Lava",    "pc": (255, 198,  38), "pci": (255, 240, 175), "pcg": (208, 128,   8), "unlock_lv": 2,    "unlock_m": 350, "unlock_desc": "350 m on Lvl 2"},
]

# ─── Persistence ──────────────────────────────────────────────────────────────
_SAVE_DIR      = os.path.dirname(os.path.abspath(__file__))
_PROGRESS_FILE = os.path.join(_SAVE_DIR, "progress.json")
_SETTINGS_FILE = os.path.join(_SAVE_DIR, "settings.json")

def _load_progress():
    try:
        with open(_PROGRESS_FILE) as f:
            d = json.load(f)
        return {
            "best":           {int(k): v for k, v in d.get("best", {}).items()},
            "unlocked_skins": d.get("unlocked_skins", [0]),
            "selected_skin":  d.get("selected_skin", 0),
        }
    except Exception:
        return {"best": {1: 0, 2: 0, 3: 0}, "unlocked_skins": [0], "selected_skin": 0}

def _save_progress(prog):
    try:
        with open(_PROGRESS_FILE, "w") as f:
            json.dump(prog, f)
    except Exception:
        pass

_DEFAULT_SETTINGS = {"fps": 60, "metrics": True, "resolution": [1280, 720], "window_mode": "windowed"}

def _load_settings():
    try:
        with open(_SETTINGS_FILE) as f:
            d = json.load(f)
        out = dict(_DEFAULT_SETTINGS)
        out.update({k: v for k, v in d.items() if k in _DEFAULT_SETTINGS})
        return out
    except Exception:
        return dict(_DEFAULT_SETTINGS)

def _save_settings(sett):
    try:
        with open(_SETTINGS_FILE, "w") as f:
            json.dump(sett, f)
    except Exception:
        pass


# ─── Level config (speed curves) ─────────────────────────────────────────────
# (base_speed, ramp_per_dist_unit, max_speed, surge_wave)
LEVEL_CONFIG = {
    1: (4.5,  0.00035, 11.5, False),
    2: (5.2,  0.00065, 13.0, False),
    3: (4.8,  0.00040, 12.5, True),
}

# ─── Audio synthesis ──────────────────────────────────────────────────────────
_SR = 44100

def _make_snd(buf):
    return pygame.mixer.Sound(buffer=_arr.array('h', buf))

def _level_music(level):
    dur = 2.0
    n   = int(_SR * dur)
    buf = [0] * n
    if level == 1:
        for i in range(n):
            t  = i / _SR
            p  = 0.62 + 0.38 * math.sin(2 * math.pi * 1.4 * t)
            v  = (math.sin(2 * math.pi * 55  * t) * 0.15
                + math.sin(2 * math.pi * 110 * t) * 0.07
                + math.sin(2 * math.pi * 165 * t) * 0.035) * p
            buf[i] = int(max(-32767, min(32767, v * 32767)))
    elif level == 2:
        for i in range(n):
            t  = i / _SR
            p  = 0.5 + 0.5 * abs(math.sin(2 * math.pi * 3.6 * t))
            sq = 1.0 if math.sin(2 * math.pi * 80 * t) > 0 else -1.0
            v  = (sq * 0.11 * p
                + math.sin(2 * math.pi * 160 * t) * 0.06
                + math.sin(2 * math.pi * 320 * t) * 0.03)
            v  = max(-1.0, min(1.0, v * 1.45))
            buf[i] = int(v * 32767)
    else:
        notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25]
        nd = dur / len(notes)
        for i in range(n):
            t  = i / _SR
            ni = int(t / nd) % len(notes)
            f  = notes[ni]
            fi = min(1.0, (t % nd) / 0.025)
            fo = min(1.0, max(0.0, (nd - t % nd) / 0.035))
            env = fi * fo
            v  = (math.sin(2 * math.pi * f       * t) * 0.10
                + math.sin(2 * math.pi * f * 2   * t) * 0.035
                + math.sin(2 * math.pi * f * 0.5 * t) * 0.055) * env
            v += math.sin(2 * math.pi * 60 * t) * 0.08
            buf[i] = int(max(-32767, min(32767, v * 32767)))
    return _make_snd(buf)

def _death_sfx():
    n   = int(_SR * 0.6)
    buf = [0] * n
    for i in range(n):
        t    = i / _SR
        prog = t / 0.6
        freq = 440 * (1 - prog * 0.72)
        env  = max(0.0, 1 - prog * 1.35)
        sq   = 1.0 if math.sin(2 * math.pi * freq * 2 * t) > 0 else -1.0
        v    = (math.sin(2 * math.pi * freq * t) * 0.5 + sq * 0.1) * env * 0.22
        buf[i] = int(max(-32767, min(32767, v * 32767)))
    return _make_snd(buf)

def _click_sfx():
    n   = int(_SR * 0.09)
    buf = [0] * n
    for i in range(n):
        t   = i / _SR
        env = max(0.0, 1 - t / 0.09)
        v   = math.sin(2 * math.pi * 920 * t) * 0.18 * env
        buf[i] = int(v * 32767)
    return _make_snd(buf)

LEVEL_THEMES = {
    1: {
        "bg": (6, 6, 20),
        "wall": (28, 28, 52),
        "wall_e": (65, 65, 115),
        "grid": (13, 13, 33),
        "pc": (90, 190, 255),
        "pci": (200, 235, 255),
        "pcg": (45, 110, 210),
        "hud_muted": (110, 120, 155),
        "speed_bg": (30, 30, 55),
    },
    2: {
        "bg": (11, 8, 18),
        "wall": (53, 28, 44),
        "wall_e": (165, 82, 120),
        "grid": (34, 19, 32),
        "pc": (255, 145, 175),
        "pci": (255, 220, 230),
        "pcg": (210, 72, 128),
        "hud_muted": (178, 110, 135),
        "speed_bg": (72, 32, 51),
    },
    3: {
        "bg": (6, 18, 17),
        "wall": (20, 57, 54),
        "wall_e": (85, 208, 187),
        "grid": (10, 38, 35),
        "pc": (115, 255, 228),
        "pci": (220, 255, 247),
        "pcg": (42, 196, 170),
        "hud_muted": (112, 188, 173),
        "speed_bg": (18, 66, 62),
    },
}

# ─── States ───────────────────────────────────────────────────────────────────
TITLE   = 0
PLAYING = 1
DEAD    = 2
LEVEL_SELECT = 3
SETTINGS     = 4
SKINS_MENU   = 5


# ─── Draw helpers ─────────────────────────────────────────────────────────────

def glow_circle(surf, color, cx, cy, r, alpha=70):
    """Draw a soft glowing circle with alpha."""
    s = pygame.Surface((r * 2 + 2, r * 2 + 2), pygame.SRCALPHA)
    pygame.draw.circle(s, (*color, alpha), (r + 1, r + 1), r)
    surf.blit(s, (int(cx) - r - 1, int(cy) - r - 1))


def circle_rect_hit(cx, cy, cr, rect):
    nx = max(rect.left, min(cx, rect.right))
    ny = max(rect.top, min(cy, rect.bottom))
    dx = cx - nx
    dy = cy - ny
    return dx * dx + dy * dy <= cr * cr


def draw_saw_blade(surf, cx, cy, r, angle, teeth=10):
    """Draw a jagged rotating saw blade."""
    pts = []
    for i in range(teeth * 2):
        radius = r if i % 2 == 0 else r * 0.58
        a = math.radians(angle + i * 180 / teeth)
        pts.append((cx + radius * math.cos(a), cy + radius * math.sin(a)))
    pygame.draw.polygon(surf, SAW_C, pts)
    pygame.draw.circle(surf, SAW_I, (int(cx), int(cy)), max(1, int(r * 0.36)))
    pygame.draw.circle(surf, SAW_E, (int(cx), int(cy)), max(1, int(r * 0.17)))


# ─── Obstacle: Swinging Saw ───────────────────────────────────────────────────

class Saw:
    def __init__(self, x, anchor='top', swing=60, r=26):
        self.x      = float(x)
        self.r      = r
        self.angle  = random.uniform(0, 360)
        self.spin   = random.choice([-5, -4, 4, 5])
        self.anchor = anchor          # 'top' or 'bottom'
        self.sw_t   = random.uniform(0, math.tau)
        self.sw_s   = random.uniform(0.024, 0.052)
        self.swing  = swing
        self.y      = 0.0
        self._calc_y()

    def _calc_y(self):
        off = math.sin(self.sw_t) * self.swing
        if self.anchor == 'top':
            self.y = CTOP + self.r + 12 + off
        else:
            self.y = CBOT - self.r - 12 + off

    def update(self, dx):
        self.x     -= dx
        self.angle += self.spin
        self.sw_t  += self.sw_s
        self._calc_y()

    def draw(self, surf):
        # Chain arm from wall
        ay = CTOP if self.anchor == 'top' else CBOT
        ey = int(self.y - self.r) if self.anchor == 'top' else int(self.y + self.r)
        pygame.draw.line(surf, (72, 72, 108), (int(self.x), ay), (int(self.x), ey), 3)
        glow_circle(surf, SAW_C, self.x, self.y, self.r + 10, 35)
        draw_saw_blade(surf, self.x, self.y, self.r, self.angle)

    def hits(self, cx, cy, cr):
        return math.hypot(self.x - cx, self.y - cy) < self.r + cr - 4

    def dead(self):
        return self.x < -self.r * 2


# ─── Obstacle: Pulsing Laser Gate ─────────────────────────────────────────────

class LaserGate:
    def __init__(self, x, gap_y, gap_h):
        self.x      = float(x)
        self.gap_y  = gap_y       # top of the safe gap
        self.gap_h  = gap_h       # height of the safe gap
        self.t      = random.uniform(0, 120)
        self.period = random.randint(80, 150)
        self.on_frac = 0.58       # fraction of period the laser is ON

    def update(self, dx):
        self.x -= dx
        self.t  += 1

    @property
    def on(self):
        return (self.t % self.period) / self.period < self.on_frac

    def draw(self, surf):
        c  = LAS_C if self.on else LAS_OFF
        ix = int(self.x)
        bot = self.gap_y + self.gap_h

        def beam(y0, y1):
            if self.on:
                gs = pygame.Surface((14, max(1, y1 - y0)), pygame.SRCALPHA)
                gs.fill((*LAS_C, 28))
                surf.blit(gs, (ix - 7, y0))
            pygame.draw.line(surf, c, (ix, y0), (ix, y1), 4)

        if self.gap_y > CTOP: beam(CTOP, self.gap_y)
        if bot < CBOT:        beam(bot,  CBOT)

        for ny in (CTOP, CBOT):
            pygame.draw.circle(surf, c, (ix, ny), 9)
            pygame.draw.circle(surf, (255, 255, 255), (ix, ny), 4)

    def hits(self, cx, cy, cr):
        if not self.on:
            return False
        if abs(cx - self.x) > cr + 4:
            return False
        bot = self.gap_y + self.gap_h
        if cy - cr < self.gap_y and cy + cr > CTOP:
            return True
        if cy + cr > bot and cy - cr < CBOT:
            return True
        return False

    def dead(self):
        return self.x < -20


# ─── Obstacle: Bouncing Energy Orb ────────────────────────────────────────────

class EnergyOrb:
    def __init__(self, x):
        self.x  = float(x)
        self.y  = float(random.randint(CTOP + 50, CBOT - 50))
        self.r  = 14
        self.vy = random.choice([-2.5, -2.0, 2.0, 2.5])
        self.t  = random.uniform(0, math.tau)
        self.co, self.ci = random.choice(ORB_COLS)

    def update(self, dx):
        self.x -= dx
        self.y += self.vy
        self.t += 0.08
        if self.y - self.r <= CTOP:
            self.y = CTOP + self.r
            self.vy = abs(self.vy)
        if self.y + self.r >= CBOT:
            self.y = CBOT - self.r
            self.vy = -abs(self.vy)

    def draw(self, surf):
        pulse = int(6 * math.sin(self.t))
        glow_circle(surf, self.co, self.x, self.y, self.r + 8 + pulse, 65)
        pygame.draw.circle(surf, self.ci, (int(self.x), int(self.y)), self.r)
        pygame.draw.circle(surf, self.co, (int(self.x), int(self.y)), self.r - 4)
        # Specular highlight
        pygame.draw.circle(surf, (255, 255, 255), (int(self.x) - 4, int(self.y) - 4), 4)
        pygame.draw.circle(surf, self.co, (int(self.x), int(self.y)), self.r, 2)

    def hits(self, cx, cy, cr):
        return math.hypot(self.x - cx, self.y - cy) < self.r + cr - 3

    def dead(self):
        return self.x < -self.r * 2


# ─── Obstacle: Heat Crusher (level 2) ────────────────────────────────────────

class HeatCrusher:
    def __init__(self, x, anchor='top', width=44, max_depth=170):
        self.x = float(x)
        self.anchor = anchor
        self.width = width
        self.max_depth = max_depth
        self.t = random.uniform(0, math.tau)
        self.ts = random.uniform(0.042, 0.075)
        self.phase = random.uniform(0, 1)

    def update(self, dx):
        self.x -= dx
        self.t += self.ts

    def _depth(self):
        swing = (math.sin(self.t) + 1) * 0.5
        return 42 + int((0.35 + 0.65 * swing) * self.max_depth)

    def _rect(self):
        d = self._depth()
        if self.anchor == 'top':
            return pygame.Rect(int(self.x - self.width // 2), CTOP, self.width, d)
        return pygame.Rect(int(self.x - self.width // 2), CBOT - d, self.width, d)

    def draw(self, surf):
        rect = self._rect()
        glow_circle(surf, (255, 100, 145), rect.centerx, rect.centery, max(rect.width, rect.height) // 2 + 24, 20)
        pygame.draw.rect(surf, (194, 65, 110), rect, border_radius=10)
        pygame.draw.rect(surf, (255, 160, 195), rect, width=3, border_radius=10)
        tip = 8
        if self.anchor == 'top':
            pygame.draw.line(surf, (255, 208, 220), (rect.left + tip, rect.bottom), (rect.right - tip, rect.bottom), 3)
        else:
            pygame.draw.line(surf, (255, 208, 220), (rect.left + tip, rect.top), (rect.right - tip, rect.top), 3)

    def hits(self, cx, cy, cr):
        return circle_rect_hit(cx, cy, cr, self._rect())

    def dead(self):
        return self.x < -self.width * 2


# ─── Obstacle: Pulse Gate (level 3) ─────────────────────────────────────────

class PulseGate:
    def __init__(self, x, base_gap_y, gap_h):
        self.x = float(x)
        self.base_gap_y = base_gap_y
        self.gap_h = gap_h
        self.amp = random.randint(28, 65)
        self.t = random.uniform(0, math.tau)
        self.ts = random.uniform(0.026, 0.048)
        self.w = 26

    def update(self, dx):
        self.x -= dx
        self.t += self.ts

    def _gap_y(self):
        gy = self.base_gap_y + int(math.sin(self.t) * self.amp)
        return max(CTOP + 18, min(CBOT - self.gap_h - 18, gy))

    def draw(self, surf):
        gy = self._gap_y()
        bot = gy + self.gap_h
        x0 = int(self.x - self.w // 2)
        top_rect = pygame.Rect(x0, CTOP, self.w, gy - CTOP)
        bot_rect = pygame.Rect(x0, bot, self.w, CBOT - bot)
        for rect in (top_rect, bot_rect):
            if rect.height > 0:
                glow_circle(surf, (95, 240, 220), rect.centerx, rect.centery, max(rect.width, rect.height) // 2 + 20, 16)
                pygame.draw.rect(surf, (42, 156, 141), rect, border_radius=8)
                pygame.draw.rect(surf, (130, 255, 242), rect, width=3, border_radius=8)

    def hits(self, cx, cy, cr):
        if abs(cx - self.x) > cr + self.w // 2 + 3:
            return False
        gy = self._gap_y()
        bot = gy + self.gap_h
        return cy - cr < gy or cy + cr > bot

    def dead(self):
        return self.x < -40


# ─── Obstacle: Arc Mine (level 3) ────────────────────────────────────────────

class ArcMine:
    def __init__(self, x, y=None):
        self.x = float(x)
        self.y = float(y) if y is not None else float(random.randint(CTOP + 85, CBOT - 85))
        self.r = 16
        self.arm = random.randint(38, 58)
        self.a = random.uniform(0, math.tau)
        self.spin = random.choice([-0.12, -0.1, 0.1, 0.12])
        self.t = random.uniform(0, math.tau)
        self.bob = random.uniform(0.04, 0.07)

    def update(self, dx):
        self.x -= dx
        self.a += self.spin
        self.t += self.bob
        self.y += math.sin(self.t) * 0.6
        self.y = max(CTOP + 70, min(CBOT - 70, self.y))

    def _sat_positions(self):
        s1 = (self.x + math.cos(self.a) * self.arm, self.y + math.sin(self.a) * self.arm)
        s2 = (self.x + math.cos(self.a + math.pi) * self.arm, self.y + math.sin(self.a + math.pi) * self.arm)
        return s1, s2

    def draw(self, surf):
        s1, s2 = self._sat_positions()
        glow_circle(surf, (70, 230, 205), self.x, self.y, self.r + 14, 36)
        pygame.draw.circle(surf, (66, 165, 153), (int(self.x), int(self.y)), self.r)
        pygame.draw.circle(surf, (190, 255, 244), (int(self.x), int(self.y)), self.r - 8)
        pygame.draw.line(surf, (74, 196, 178), (int(s1[0]), int(s1[1])), (int(s2[0]), int(s2[1])), 3)
        for sx, sy in (s1, s2):
            glow_circle(surf, (110, 255, 235), sx, sy, 15, 28)
            pygame.draw.circle(surf, (120, 255, 238), (int(sx), int(sy)), 9)

    def hits(self, cx, cy, cr):
        if math.hypot(self.x - cx, self.y - cy) < self.r + cr - 2:
            return True
        for sx, sy in self._sat_positions():
            if math.hypot(sx - cx, sy - cy) < 10 + cr:
                return True
        return False

    def dead(self):
        return self.x < -self.r * 3


# ─── Level generator ──────────────────────────────────────────────────────────

def gen_chunk(start_x, n=5, level=1):
    """Generate n obstacles starting beyond start_x for a specific level."""
    obs = []
    x = start_x + 300
    for _ in range(n):
        if level == 1:
            kind = random.randint(0, 2)

            if kind == 0:  # Swinging saw
                anchor = random.choice(['top', 'bottom'])
                obs.append(Saw(x, anchor, random.randint(35, 85), random.randint(22, 30)))
                x += random.randint(190, 340)

            elif kind == 1:  # Laser gate
                gap_h = random.randint(115, 165)
                gap_y = random.randint(CTOP + 25, CBOT - gap_h - 25)
                obs.append(LaserGate(x, gap_y, gap_h))
                x += random.randint(200, 360)

            else:  # Energy orbs
                n_orbs  = random.randint(1, 3)
                spacing = random.randint(80, 150)
                for j in range(n_orbs):
                    obs.append(EnergyOrb(x + j * spacing))
                x += n_orbs * spacing + random.randint(150, 260)

        elif level == 2:
            kind = random.randint(0, 3)

            if kind in (0, 1):
                n_crush = random.randint(1, 2)
                for j in range(n_crush):
                    anchor = random.choice(['top', 'bottom'])
                    obs.append(HeatCrusher(x + j * random.randint(96, 135), anchor, random.randint(36, 56), random.randint(120, 185)))
                x += n_crush * random.randint(120, 160) + random.randint(150, 240)

            elif kind == 2:
                # dual crushers top+bottom close together
                obs.append(HeatCrusher(x, 'top', random.randint(34, 50), random.randint(110, 160)))
                obs.append(HeatCrusher(x + random.randint(80, 130), 'bottom', random.randint(34, 50), random.randint(110, 160)))
                x += random.randint(220, 340)

            else:
                n_orbs = random.randint(2, 4)
                spacing = random.randint(74, 120)
                for j in range(n_orbs):
                    obs.append(EnergyOrb(x + j * spacing))
                x += n_orbs * spacing + random.randint(120, 210)

        else:
            kind = random.randint(0, 3)

            if kind == 0:
                gap_h = random.randint(105, 145)
                gap_y = random.randint(CTOP + 35, CBOT - gap_h - 35)
                obs.append(PulseGate(x, gap_y, gap_h))
                x += random.randint(200, 310)

            elif kind == 1:
                # PulseGate + trailing ArcMine (mine far enough away so the gate gap and mine don't overlap)
                gap_h = random.randint(115, 155)
                gap_y = random.randint(CTOP + 35, CBOT - gap_h - 35)
                obs.append(PulseGate(x, gap_y, gap_h))
                # Use the opposite side from the gate's gap so the mine is always off-path
                mine_y_top  = random.randint(CTOP + 90, CTOP + 155)
                mine_y_bot  = random.randint(CBOT - 155, CBOT - 90)
                mid_gap_y   = gap_y + gap_h // 2
                mine_y = mine_y_bot if mid_gap_y < (CTOP + CBOT) // 2 else mine_y_top
                obs.append(ArcMine(x + random.randint(200, 280), mine_y))
                x += random.randint(300, 400)

            elif kind == 2:
                n_mines = random.randint(1, 2)
                if n_mines == 1:
                    obs.append(ArcMine(x))
                else:
                    # Force one mine to top zone, one to bottom zone — guaranteed middle path
                    top_y = random.randint(CTOP + 90, CTOP + 155)
                    bot_y = random.randint(CBOT - 155, CBOT - 90)
                    obs.append(ArcMine(x, top_y))
                    obs.append(ArcMine(x + random.randint(130, 190), bot_y))
                x += random.randint(240, 360)

            else:
                gap_h2 = random.randint(105, 140)
                gap_y2 = random.randint(CTOP + 45, CBOT - gap_h2 - 45)
                obs.append(PulseGate(x, gap_y2, gap_h2))
                # Mine placed well clear of the gate, positioned near a wall
                mine_y2 = random.randint(CTOP + 90, CTOP + 150) if random.random() < 0.5 else random.randint(CBOT - 150, CBOT - 90)
                obs.append(ArcMine(x + random.randint(210, 290), mine_y2))
                x += random.randint(280, 380)

    return obs


# ─── Main Game class ──────────────────────────────────────────────────────────

class Game:
    def __init__(self):
        self.font_sm = pygame.font.SysFont("Consolas", 26, bold=True)
        self.font_md = pygame.font.SysFont("Consolas", 34)
        self.font_lg = pygame.font.SysFont("Consolas", 64, bold=True)
        self.font_xl = pygame.font.SysFont("Consolas", 88, bold=True)

        self.progress = _load_progress()
        self.settings = _load_settings()
        self._apply_display()

        self.stars = [
            (
                random.randint(0, SCREEN_W - 1),
                random.randint(CTOP + 1, CBOT - 1),
                random.uniform(0.08, 0.38),
            )
            for _ in range(220)
        ]

        self.best = self.progress["best"]
        self.unlocked_skins = list(self.progress["unlocked_skins"])
        self.selected_skin = self.progress["selected_skin"]
        self.state = TITLE
        self.title_t = 0
        self.selected_level = 1
        self.menu_notice = ""
        self.menu_notice_timer = 0

        self._build_menu_buttons()
        self._build_level_buttons()
        self.dead_home_rect = pygame.Rect(24, 24, 82, 82)
        self.dead_restart_rect = pygame.Rect(120, 24, 82, 82)

        self.snd_music = {lv: _level_music(lv) for lv in (1, 2, 3)}
        self.snd_death = _death_sfx()
        self.snd_click = _click_sfx()
        self.ch_music = pygame.mixer.Channel(0)
        self.ch_sfx = pygame.mixer.Channel(1)

        self._init_play()
        self.state = TITLE

    def _apply_display(self):
        global screen
        w, h = self.settings["resolution"]
        mode = self.settings["window_mode"]
        flags = pygame.FULLSCREEN if mode == "fullscreen" else (pygame.NOFRAME if mode == "borderless" else 0)
        screen = pygame.display.set_mode((w, h), flags)

    def _gpos(self, pos=None):
        p = pos if pos is not None else pygame.mouse.get_pos()
        sw, sh = screen.get_size()
        return (int(p[0] * SCREEN_W / sw), int(p[1] * SCREEN_H / sh))

    def _build_menu_buttons(self):
        bw, bh, gap = 170, 170, 52
        total = bw * 3 + gap * 2
        x0 = SCREEN_W // 2 - total // 2
        y = SCREEN_H // 2 + 70
        self.menu_buttons = [
            ("settings", pygame.Rect(x0, y, bw, bh)),
            ("play", pygame.Rect(x0 + bw + gap, y, bw, bh)),
            ("skins", pygame.Rect(x0 + (bw + gap) * 2, y, bw, bh)),
        ]
        self.login_rect = pygame.Rect(SCREEN_W - 200, 20, 180, 52)

    def _build_level_buttons(self):
        self.level_window = pygame.Rect(SCREEN_W // 2 - 290, SCREEN_H // 2 - 160, 580, 360)
        bw, bh, gap = 130, 150, 28
        x0 = self.level_window.centerx - (bw * 3 + gap * 2) // 2
        y = self.level_window.top + 118
        self.level_buttons = [pygame.Rect(x0 + i * (bw + gap), y, bw, bh) for i in range(3)]
        self.level_back_rect = pygame.Rect(self.level_window.left + 20, self.level_window.top + 20, 72, 56)

    def _init_play(self):
        base_theme = LEVEL_THEMES.get(self.selected_level, LEVEL_THEMES[1])
        self.theme = dict(base_theme)
        skin = SKINS[self.selected_skin]
        self.theme["pc"] = skin["pc"]
        self.theme["pci"] = skin["pci"]
        self.theme["pcg"] = skin["pcg"]

        bs, ramp, mx, surge = LEVEL_CONFIG[self.selected_level]
        self.base_speed = bs
        self.lv_ramp = ramp
        self.lv_max = mx
        self.lv_surge = surge

        self.py = float(PY0)
        self.pvy = 0.0
        self.hold = False
        self.scroll = 0.0
        self.dist = 0.0
        self.speed = self.base_speed
        self.trail = []
        self.obs = gen_chunk(SCREEN_W, 7, self.selected_level)
        self.parts = []
        self.d_timer = 0
        self.shake = 0
        self.ch_music.stop()
        self.ch_music.play(self.snd_music[self.selected_level], loops=-1, fade_ms=500)

    def event(self, ev):
        if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1:
            gp = self._gpos(ev.pos)
            if self.state == TITLE:
                if self.login_rect.collidepoint(gp):
                    self.ch_sfx.play(self.snd_click)
                    self.menu_notice = "Google login requires a backend. Progress is saved locally for now."
                    self.menu_notice_timer = 180
                else:
                    for kind, rect in self.menu_buttons:
                        if rect.collidepoint(gp):
                            self.ch_sfx.play(self.snd_click)
                            if kind == "play":
                                self.state = LEVEL_SELECT
                            elif kind == "settings":
                                self.state = SETTINGS
                            elif kind == "skins":
                                self.state = SKINS_MENU
                            break
            elif self.state == LEVEL_SELECT:
                if self.level_back_rect.collidepoint(gp):
                    self.ch_sfx.play(self.snd_click)
                    self.state = TITLE
                else:
                    for idx, rect in enumerate(self.level_buttons, start=1):
                        if rect.collidepoint(gp):
                            self.ch_sfx.play(self.snd_click)
                            self.selected_level = idx
                            self.state = PLAYING
                            self._init_play()
                            break
            elif self.state == SETTINGS:
                self._handle_settings_click(gp)
            elif self.state == SKINS_MENU:
                self._handle_skins_click(gp)
            elif self.state == DEAD and self.d_timer > 40:
                if self.dead_home_rect.collidepoint(gp):
                    self.ch_sfx.play(self.snd_click)
                    self.ch_music.stop()
                    self.state = TITLE
                elif self.dead_restart_rect.collidepoint(gp):
                    self.ch_sfx.play(self.snd_click)
                    self.state = PLAYING
                    self._init_play()
                else:
                    self.state = PLAYING
                    self._init_play()
            elif self.state == PLAYING:
                self.hold = True

        if ev.type == pygame.MOUSEBUTTONUP and ev.button == 1:
            self.hold = False

        if ev.type == pygame.KEYDOWN:
            if ev.key == pygame.K_r and self.state in (PLAYING, DEAD):
                self.state = PLAYING
                self._init_play()
            elif ev.key == pygame.K_ESCAPE and self.state in (LEVEL_SELECT, SETTINGS, SKINS_MENU):
                self.state = TITLE

    def update(self):
        self.title_t += 1

        if self.state in (TITLE, LEVEL_SELECT, SETTINGS, SKINS_MENU):
            if self.menu_notice_timer > 0:
                self.menu_notice_timer -= 1
            return

        if self.state == DEAD:
            self.d_timer += 1
            self.shake = max(0, self.shake - 1)
            for p in self.parts:
                p[0] += p[2]
                p[1] += p[3]
                p[3] += 0.22
                p[4] -= 1
            self.parts = [p for p in self.parts if p[4] > 0]
            return

        if self.hold:
            self.pvy -= GRAVITY * 2.1
        else:
            self.pvy += GRAVITY

        self.pvy = max(-MAX_VY, min(MAX_VY, self.pvy))
        self.py += self.pvy

        if self.py - PR <= CTOP or self.py + PR >= CBOT:
            self.py = max(CTOP + PR, min(CBOT - PR, self.py))
            self._die()
            return

        raw = self.base_speed + self.dist * self.lv_ramp
        if self.lv_surge:
            raw += 2.2 * max(0.0, math.sin(self.dist * 0.011)) ** 2
        self.speed = min(raw, self.lv_max)
        self.scroll += self.speed
        self.dist += self.speed

        self.trail.append((PX, self.py))
        if len(self.trail) > TRAIL_LEN:
            self.trail.pop(0)

        for obstacle in self.obs:
            obstacle.update(self.speed)
        self.obs = [obstacle for obstacle in self.obs if not obstacle.dead()]

        rightmost = max((obstacle.x for obstacle in self.obs), default=SCREEN_W)
        if rightmost < SCREEN_W + 300:
            self.obs.extend(gen_chunk(SCREEN_W + 450, 6, self.selected_level))

        for obstacle in self.obs:
            if obstacle.hits(PX, self.py, PR):
                self._die()
                return

    def _die(self):
        if self.state != PLAYING:
            return
        self.state = DEAD
        self.shake = 18
        self.d_timer = 0
        self.ch_music.stop()
        self.ch_sfx.play(self.snd_death)

        dist_m = int(self.dist / 10)
        level = self.selected_level
        self.best[level] = max(self.best.get(level, 0), dist_m)

        for idx, skin in enumerate(SKINS):
            if idx in self.unlocked_skins:
                continue
            if skin["unlock_lv"] is not None and self.best.get(skin["unlock_lv"], 0) >= skin["unlock_m"]:
                self.unlocked_skins.append(idx)

        self.progress["best"] = {str(k): v for k, v in self.best.items()}
        self.progress["unlocked_skins"] = self.unlocked_skins
        self.progress["selected_skin"] = self.selected_skin
        _save_progress(self.progress)

        for _ in range(42):
            angle = random.uniform(0, math.tau)
            speed = random.uniform(2, 11)
            life = random.randint(24, 56)
            color = random.choice([self.theme["pc"], self.theme["pci"], self.theme["pcg"], (255, 255, 255)])
            self.parts.append([PX, self.py, math.cos(angle) * speed, math.sin(angle) * speed, life, life, color])

    def draw(self):
        sdx = random.randint(-self.shake, self.shake) if self.shake else 0
        sdy = random.randint(-self.shake, self.shake) if self.shake else 0

        surf = pygame.Surface((SCREEN_W, SCREEN_H))
        self._draw_bg(surf)

        if self.state == TITLE:
            self._draw_menu(surf)
        elif self.state == LEVEL_SELECT:
            self._draw_level_select(surf)
        elif self.state == SETTINGS:
            self._draw_settings(surf)
        elif self.state == SKINS_MENU:
            self._draw_skins_menu(surf)
        else:
            for obstacle in self.obs:
                obstacle.draw(surf)
            self._draw_player(surf)
            dist_m = int(self.dist / 10)
            self._draw_hud(surf, dist_m)
            if self.state == DEAD and self.d_timer > 35:
                self._draw_dead(surf, dist_m)

        sw, sh = screen.get_size()
        if (sw, sh) == (SCREEN_W, SCREEN_H):
            screen.blit(surf, (sdx, sdy))
        else:
            scaled = pygame.transform.scale(surf, (sw, sh))
            screen.blit(scaled, (sdx, sdy))
        pygame.display.flip()

    def _draw_bg(self, surf):
        surf.fill(self.theme["bg"])

        for sx, sy, spd in self.stars:
            px = int(sx - self.scroll * spd) % SCREEN_W
            brightness = int(spd * 620)
            surf.set_at((px, sy), (brightness, brightness, min(255, brightness + 55)))

        go = int(self.scroll) % 100
        for gx in range(-go, SCREEN_W + 100, 100):
            pygame.draw.line(surf, self.theme["grid"], (gx, CTOP), (gx, CBOT))

        rh = 75
        rgo = int(self.scroll * 0.4) % rh
        for gy in range(CTOP + rgo, CBOT, rh):
            pygame.draw.line(surf, self.theme["grid"], (0, gy), (SCREEN_W, gy))

        pygame.draw.rect(surf, self.theme["wall"], (0, 0, SCREEN_W, CTOP))
        pygame.draw.rect(surf, self.theme["wall"], (0, CBOT, SCREEN_W, SCREEN_H - CBOT))

        for i in range(0, WALL_H, 12):
            t = 0.15 + 0.35 * (1 - i / WALL_H)
            color = (
                int(self.theme["wall_e"][0] * t),
                int(self.theme["wall_e"][1] * t),
                int(self.theme["wall_e"][2] * t),
            )
            pygame.draw.line(surf, color, (0, i), (SCREEN_W, i))
            pygame.draw.line(surf, color, (0, SCREEN_H - 1 - i), (SCREEN_W, SCREEN_H - 1 - i))

        for i in range(14):
            t = 1 - i / 14
            color = (
                int(self.theme["wall_e"][0] * t),
                int(self.theme["wall_e"][1] * t),
                int(self.theme["wall_e"][2] * t),
            )
            pygame.draw.line(surf, color, (0, CTOP + i), (SCREEN_W, CTOP + i))
            pygame.draw.line(surf, color, (0, CBOT - i), (SCREEN_W, CBOT - i))

    def _draw_player(self, surf):
        if self.state == DEAD:
            for p in self.parts:
                radius = max(1, int(5 * p[4] / p[5]))
                pygame.draw.circle(surf, p[6], (int(p[0]), int(p[1])), radius)
            return

        for i, (tx, ty) in enumerate(self.trail):
            ratio = (i + 1) / max(len(self.trail), 1)
            radius = max(1, int(PR * ratio * 0.46))
            color = (
                int(self.theme["pcg"][0] * ratio),
                int(self.theme["pcg"][1] * ratio),
                int(self.theme["pcg"][2] * ratio),
            )
            pygame.draw.circle(surf, color, (int(tx), int(ty)), radius)

        px, py = PX, int(self.py)
        glow_circle(surf, self.theme["pcg"], px, py, PR + 15, 65)
        pygame.draw.circle(surf, self.theme["pcg"], (px, py), PR)
        pygame.draw.circle(surf, self.theme["pc"], (px, py), PR - 3)
        pygame.draw.circle(surf, self.theme["pci"], (px, py), PR - 8)
        pygame.draw.circle(surf, (230, 245, 255), (px - 5, py - 5), 5)
        pygame.draw.circle(surf, (255, 255, 255), (px - 7, py - 7), 2)
        pygame.draw.circle(surf, self.theme["pci"], (px, py), PR, 2)

    def _draw_hud(self, surf, dist_m):
        lv_best = self.best.get(self.selected_level, 0)
        if self.settings.get("metrics", True):
            txt = self.font_sm.render(f"{dist_m} m", True, TEXTC)
            surf.blit(txt, (20, 8))
            bt = self.font_sm.render(f"Best: {lv_best} m", True, self.theme["hud_muted"])
            surf.blit(bt, (SCREEN_W - bt.get_width() - 20, 8))

        frac = min(1.0, max(0.0, (self.speed - self.base_speed) / max(0.001, self.lv_max - self.base_speed)))
        bar_w = 120
        bar_x, bar_y = SCREEN_W - bar_w - 20, 36
        pygame.draw.rect(surf, self.theme.get("speed_bg", (30, 30, 55)), (bar_x, bar_y, bar_w, 6), border_radius=3)
        pygame.draw.rect(surf, self.theme["pc"], (bar_x, bar_y, int(bar_w * frac), 6), border_radius=3)

    def _draw_menu_icon(self, surf, kind, cx, cy, pulse):
        glow = 6 if pulse else 0
        if kind == "play":
            tri = [(cx - 18, cy - 27), (cx - 18, cy + 27), (cx + 31, cy)]
            glow_circle(surf, PC, cx, cy, 48 + glow, 36)
            pygame.draw.polygon(surf, PCI, tri)
            pygame.draw.polygon(surf, PC, tri, 4)
            return

        if kind == "settings":
            glow_circle(surf, (140, 175, 255), cx, cy, 52 + glow, 30)
            pygame.draw.circle(surf, (125, 155, 240), (cx, cy), 40, 6)
            pygame.draw.circle(surf, PCI, (cx, cy), 16)
            for i in range(8):
                angle = i * math.tau / 8
                x1 = cx + int(math.cos(angle) * 26)
                y1 = cy + int(math.sin(angle) * 26)
                x2 = cx + int(math.cos(angle) * 44)
                y2 = cy + int(math.sin(angle) * 44)
                pygame.draw.line(surf, (165, 190, 255), (x1, y1), (x2, y2), 5)
            return

        glow_circle(surf, (245, 125, 40), cx - 10, cy + 4, 32 + glow, 38)
        glow_circle(surf, (75, 220, 255), cx + 18, cy + 8, 30 + glow, 38)
        glow_circle(surf, (214, 75, 255), cx + 5, cy - 20, 29 + glow, 38)
        pygame.draw.circle(surf, (250, 150, 70), (cx - 10, cy + 4), 20)
        pygame.draw.circle(surf, (110, 240, 255), (cx + 18, cy + 8), 18)
        pygame.draw.circle(surf, (225, 105, 255), (cx + 5, cy - 20), 17)

    def _draw_menu(self, surf):
        pulse = int(10 * math.sin(self.title_t * 0.035))
        title = self.font_xl.render("CIRCLEDASH", True, PC)
        tx = SCREEN_W // 2 - title.get_width() // 2
        ty = SCREEN_H // 2 - 210
        glow_circle(surf, PC, SCREEN_W // 2, ty + title.get_height() // 2, title.get_width() // 2 + 20 + pulse, 18)
        surf.blit(title, (tx, ty))

        mouse = self._gpos()
        for kind, rect in self.menu_buttons:
            hover = rect.collidepoint(mouse)
            base = (24, 33, 58) if not hover else (34, 47, 84)
            edge = (80, 105, 170) if not hover else (125, 155, 240)
            pygame.draw.rect(surf, base, rect, border_radius=26)
            pygame.draw.rect(surf, edge, rect, width=4, border_radius=26)
            if hover:
                glow_circle(surf, (120, 150, 255), rect.centerx, rect.centery, 94, 24)
            self._draw_menu_icon(surf, kind, rect.centerx, rect.centery, hover)

        hover = self.login_rect.collidepoint(mouse)
        base = (22, 34, 62) if not hover else (36, 54, 96)
        edge = (75, 100, 175) if not hover else (120, 155, 240)
        pygame.draw.rect(surf, base, self.login_rect, border_radius=14)
        pygame.draw.rect(surf, edge, self.login_rect, width=2, border_radius=14)
        cx, cy = self.login_rect.left + 32, self.login_rect.centery
        pygame.draw.circle(surf, (190, 215, 255), (cx, cy - 6), 9)
        pygame.draw.arc(surf, (190, 215, 255), (cx - 13, cy + 2, 26, 16), math.pi, 0, 3)
        label = self.font_sm.render("Log in", True, (180, 210, 255))
        surf.blit(label, (self.login_rect.left + 50, self.login_rect.centery - label.get_height() // 2))

        if self.menu_notice_timer > 0:
            notice = self.font_sm.render(self.menu_notice, True, NOTEC)
            surf.blit(notice, (SCREEN_W // 2 - notice.get_width() // 2, SCREEN_H // 2 + 330))

        hint = self.font_sm.render("R -> restart   ESC -> quit", True, (70, 80, 110))
        surf.blit(hint, (SCREEN_W // 2 - hint.get_width() // 2, SCREEN_H - 40))

    def _draw_level_select(self, surf):
        ov = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
        ov.fill((0, 0, 0, 120))
        surf.blit(ov, (0, 0))

        pygame.draw.rect(surf, (19, 26, 45), self.level_window, border_radius=24)
        pygame.draw.rect(surf, (86, 116, 188), self.level_window, width=4, border_radius=24)
        title = self.font_lg.render("LEVELS", True, (185, 210, 255))
        surf.blit(title, (self.level_window.centerx - title.get_width() // 2, self.level_window.top + 26))

        mouse = self._gpos()
        for idx, rect in enumerate(self.level_buttons, start=1):
            hover = rect.collidepoint(mouse)
            base = (26, 39, 72) if not hover else (36, 56, 102)
            edge = (92, 126, 205) if not hover else (130, 170, 255)
            pygame.draw.rect(surf, base, rect, border_radius=18)
            pygame.draw.rect(surf, edge, rect, width=4, border_radius=18)
            if hover:
                glow_circle(surf, (122, 160, 255), rect.centerx, rect.centery, 72, 20)
            pygame.draw.circle(surf, (72, 112, 210), (rect.centerx, rect.centery - 12), 28)
            pygame.draw.circle(surf, (210, 230, 255), (rect.centerx, rect.centery - 12), 16)
            num = self.font_md.render(str(idx), True, (210, 232, 255))
            surf.blit(num, (rect.centerx - num.get_width() // 2, rect.bottom - 48))

        back_hover = self.level_back_rect.collidepoint(mouse)
        back_base = (32, 45, 78) if not back_hover else (52, 72, 126)
        back_edge = (95, 125, 200) if not back_hover else (138, 172, 255)
        pygame.draw.rect(surf, back_base, self.level_back_rect, border_radius=12)
        pygame.draw.rect(surf, back_edge, self.level_back_rect, width=3, border_radius=12)
        x, y = self.level_back_rect.center
        arrow = [(x - 14, y), (x + 6, y - 12), (x + 6, y + 12)]
        pygame.draw.polygon(surf, (220, 235, 255), arrow)

    def _draw_dead(self, surf, dist_m):
        ov = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
        ov.fill((0, 0, 0, 135))
        surf.blit(ov, (0, 0))

        dead = self.font_lg.render("YOU  DIED", True, DEATHC)
        surf.blit(dead, (SCREEN_W // 2 - dead.get_width() // 2, SCREEN_H // 2 - 105))

        lv_best = self.best.get(self.selected_level, 0)
        info = self.font_md.render(f"Distance: {dist_m} m          Best: {lv_best} m", True, TEXTC)
        surf.blit(info, (SCREEN_W // 2 - info.get_width() // 2, SCREEN_H // 2 - 15))

        restart = self.font_md.render("Click or press R to restart", True, (130, 140, 185))
        surf.blit(restart, (SCREEN_W // 2 - restart.get_width() // 2, SCREEN_H // 2 + 52))

        mouse = self._gpos()
        hover = self.dead_home_rect.collidepoint(mouse)
        base = (28, 40, 68) if not hover else (45, 62, 106)
        edge = (90, 120, 195) if not hover else (130, 165, 255)
        pygame.draw.rect(surf, base, self.dead_home_rect, border_radius=14)
        pygame.draw.rect(surf, edge, self.dead_home_rect, width=3, border_radius=14)
        if hover:
            glow_circle(surf, (120, 150, 255), self.dead_home_rect.centerx, self.dead_home_rect.centery, 52, 24)

        cx, cy = self.dead_home_rect.center
        roof = [(cx - 21, cy - 3), (cx, cy - 24), (cx + 21, cy - 3)]
        body = pygame.Rect(cx - 15, cy - 3, 30, 23)
        door = pygame.Rect(cx - 5, cy + 6, 10, 14)
        pygame.draw.polygon(surf, (220, 235, 255), roof)
        pygame.draw.rect(surf, (220, 235, 255), body, border_radius=4)
        pygame.draw.rect(surf, (48, 70, 120), door, border_radius=2)

        r_hover = self.dead_restart_rect.collidepoint(mouse)
        r_base = (28, 40, 68) if not r_hover else (45, 62, 106)
        r_edge = (90, 120, 195) if not r_hover else (130, 165, 255)
        pygame.draw.rect(surf, r_base, self.dead_restart_rect, border_radius=14)
        pygame.draw.rect(surf, r_edge, self.dead_restart_rect, width=3, border_radius=14)
        if r_hover:
            glow_circle(surf, (120, 150, 255), self.dead_restart_rect.centerx, self.dead_restart_rect.centery, 52, 24)

        rx, ry = self.dead_restart_rect.center
        pygame.draw.arc(surf, (220, 235, 255), (rx - 20, ry - 20, 40, 40), math.radians(35), math.radians(335), 4)
        tip = [(rx + 18, ry - 14), (rx + 23, ry - 2), (rx + 10, ry - 6)]
        pygame.draw.polygon(surf, (220, 235, 255), tip)

    def _settings_rects(self):
        cx = SCREEN_W // 2
        y0 = 180
        rh = 72
        bw = 110
        bh = 44
        gap = 12
        rows = {}

        fps_opts = [30, 60, 120, 144, 240]
        fps_rects = []
        total = len(fps_opts) * bw + (len(fps_opts) - 1) * gap
        ox = cx - total // 2
        for val in fps_opts:
            fps_rects.append((val, pygame.Rect(ox, y0 + rh * 0, bw, bh)))
            ox += bw + gap
        rows["fps"] = fps_rects

        rows["metrics"] = [
            (True, pygame.Rect(cx - bw - gap // 2, y0 + rh * 1, bw, bh)),
            (False, pygame.Rect(cx + gap // 2, y0 + rh * 1, bw, bh)),
        ]

        res_opts = [(1280, 720), (1600, 900), (1920, 1080)]
        res_bw = 155
        res_rects = []
        total = len(res_opts) * res_bw + (len(res_opts) - 1) * gap
        ox = cx - total // 2
        for val in res_opts:
            res_rects.append((list(val), pygame.Rect(ox, y0 + rh * 2, res_bw, bh)))
            ox += res_bw + gap
        rows["resolution"] = res_rects

        wm_opts = ["windowed", "borderless", "fullscreen"]
        wm_bw = 148
        wm_rects = []
        total = len(wm_opts) * wm_bw + (len(wm_opts) - 1) * gap
        ox = cx - total // 2
        for val in wm_opts:
            wm_rects.append((val, pygame.Rect(ox, y0 + rh * 3, wm_bw, bh)))
            ox += wm_bw + gap
        rows["window_mode"] = wm_rects
        return rows

    def _handle_settings_click(self, gp):
        changed = False
        for key, options in self._settings_rects().items():
            for value, rect in options:
                if rect.collidepoint(gp):
                    self.ch_sfx.play(self.snd_click)
                    self.settings[key] = value
                    changed = True
                    break

        back = pygame.Rect(30, 30, 80, 50)
        if back.collidepoint(gp):
            self.ch_sfx.play(self.snd_click)
            self.state = TITLE

        if changed:
            _save_settings(self.settings)
            self._apply_display()

    def _draw_settings(self, surf):
        surf.fill((8, 10, 22))
        rows = self._settings_rects()
        mouse = self._gpos()
        back = pygame.Rect(30, 30, 80, 50)
        hover = back.collidepoint(mouse)
        pygame.draw.rect(surf, (30, 42, 72) if not hover else (46, 64, 108), back, border_radius=10)
        pygame.draw.rect(surf, (85, 115, 185) if not hover else (130, 165, 240), back, width=2, border_radius=10)
        bx, by = back.center
        pygame.draw.polygon(surf, (210, 228, 255), [(bx - 14, by), (bx + 6, by - 11), (bx + 6, by + 11)])

        title = self.font_lg.render("SETTINGS", True, (185, 215, 255))
        surf.blit(title, (SCREEN_W // 2 - title.get_width() // 2, 28))

        labels = {"fps": "FPS", "metrics": "Metrics", "resolution": "Resolution", "window_mode": "Window Mode"}
        bool_labels = {True: "On", False: "Off"}
        for key, options in rows.items():
            first_rect = options[0][1]
            label = self.font_sm.render(labels[key], True, (160, 185, 235))
            surf.blit(label, (30, first_rect.centery - label.get_height() // 2))
            current = self.settings[key]
            for value, rect in options:
                active = (value == current) or (isinstance(value, list) and value == list(current))
                rect_hover = rect.collidepoint(mouse)
                base = (26, 48, 88) if active else ((30, 42, 72) if not rect_hover else (38, 56, 96))
                edge = (100, 170, 255) if active else ((82, 112, 175) if not rect_hover else (130, 165, 240))
                pygame.draw.rect(surf, base, rect, border_radius=10)
                pygame.draw.rect(surf, edge, rect, width=3 if active else 2, border_radius=10)
                if isinstance(value, list):
                    text = f"{value[0]}x{value[1]}"
                elif isinstance(value, bool):
                    text = bool_labels[value]
                else:
                    text = str(value)
                rendered = self.font_sm.render(text, True, (130, 200, 255) if active else (190, 210, 245))
                surf.blit(rendered, (rect.centerx - rendered.get_width() // 2, rect.centery - rendered.get_height() // 2))

    def _skins_rects(self):
        cols = 3
        cw, ch, gap = 230, 190, 30
        total_w = cols * cw + (cols - 1) * gap
        total_h = 2 * ch + gap
        x0 = SCREEN_W // 2 - total_w // 2
        y0 = SCREEN_H // 2 - total_h // 2 + 30
        rects = []
        for idx in range(len(SKINS)):
            col = idx % cols
            row = idx // cols
            rects.append((idx, pygame.Rect(x0 + col * (cw + gap), y0 + row * (ch + gap), cw, ch)))
        return rects

    def _handle_skins_click(self, gp):
        back = pygame.Rect(30, 30, 80, 50)
        if back.collidepoint(gp):
            self.ch_sfx.play(self.snd_click)
            self.state = TITLE
            return

        for idx, rect in self._skins_rects():
            if rect.collidepoint(gp) and idx in self.unlocked_skins:
                self.ch_sfx.play(self.snd_click)
                self.selected_skin = idx
                self.progress["selected_skin"] = idx
                _save_progress(self.progress)
                break

    def _draw_skins_menu(self, surf):
        surf.fill((8, 10, 22))
        mouse = self._gpos()
        back = pygame.Rect(30, 30, 80, 50)
        hover = back.collidepoint(mouse)
        pygame.draw.rect(surf, (30, 42, 72) if not hover else (46, 64, 108), back, border_radius=10)
        pygame.draw.rect(surf, (85, 115, 185) if not hover else (130, 165, 240), back, width=2, border_radius=10)
        bx, by = back.center
        pygame.draw.polygon(surf, (210, 228, 255), [(bx - 14, by), (bx + 6, by - 11), (bx + 6, by + 11)])

        title = self.font_lg.render("SKINS", True, (185, 215, 255))
        surf.blit(title, (SCREEN_W // 2 - title.get_width() // 2, 28))

        unlock_font = pygame.font.SysFont("Consolas", 18)
        for idx, rect in self._skins_rects():
            skin = SKINS[idx]
            unlocked = idx in self.unlocked_skins
            selected = idx == self.selected_skin
            rect_hover = rect.collidepoint(mouse) and unlocked
            base = (26, 44, 80) if selected else ((30, 42, 68) if not rect_hover else (38, 54, 90))
            edge = (120, 190, 255) if selected else ((78, 108, 170) if not rect_hover else (130, 165, 240))
            pygame.draw.rect(surf, base, rect, border_radius=18)
            pygame.draw.rect(surf, edge, rect, width=3 if selected else 2, border_radius=18)

            pcx, pcy = rect.centerx, rect.top + 68
            if unlocked:
                glow_circle(surf, skin["pcg"], pcx, pcy, 28, 40)
                pygame.draw.circle(surf, skin["pcg"], (pcx, pcy), 24)
                pygame.draw.circle(surf, skin["pc"], (pcx, pcy), 21)
                pygame.draw.circle(surf, skin["pci"], (pcx, pcy), 13)
                pygame.draw.circle(surf, (230, 245, 255), (pcx - 5, pcy - 5), 4)
            else:
                pygame.draw.circle(surf, (36, 44, 70), (pcx, pcy), 24)
                pygame.draw.circle(surf, (55, 66, 100), (pcx, pcy), 24, 2)
                lock_r = pygame.Rect(pcx - 9, pcy - 4, 18, 16)
                pygame.draw.rect(surf, (110, 125, 165), lock_r, border_radius=4)
                pygame.draw.arc(surf, (110, 125, 165), (pcx - 7, pcy - 16, 14, 16), 0, math.pi, 3)

            name = self.font_sm.render(skin["name"], True, (200, 225, 255) if unlocked else (90, 100, 135))
            surf.blit(name, (rect.centerx - name.get_width() // 2, rect.top + 108))

            if selected and unlocked:
                text = self.font_sm.render("SELECTED", True, (100, 190, 255))
                surf.blit(text, (rect.centerx - text.get_width() // 2, rect.top + 140))
            elif not unlocked:
                text = unlock_font.render(skin["unlock_desc"], True, (110, 120, 160))
                surf.blit(text, (rect.centerx - text.get_width() // 2, rect.top + 148))

# ─── Entry point ──────────────────────────────────────────────────────────────

def main():
    game = Game()
    try:
        while True:
            for ev in pygame.event.get():
                if ev.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                if ev.type == pygame.KEYDOWN and ev.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit()
                game.event(ev)

            game.update()
            game.draw()
            clock.tick(game.settings.get("fps", 60))
    except KeyboardInterrupt:
        pygame.quit()
        sys.exit()


if __name__ == "__main__":
    main()
