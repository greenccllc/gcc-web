"""
GCC Proposal Theme System
==========================

A Theme is a bundle of (palette + fonts + page chrome) that the bundler
applies to any intake YAML. Content, structure, and voice stay constant —
only the visual layer changes.

Themes live under ``proposal-generator/themes/<theme-name>/theme.py``
and export a module-level constant called ``THEME`` of type ``Theme``.

Core rule: the numbers, scope, warranty text, and legal language are
identical across themes. Only color, font, and chrome change.
"""
from __future__ import annotations

import importlib.util
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, Optional

from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


# =====================================================================
# FONT LIBRARIES
# =====================================================================
LIBERATION_DIR = Path("/usr/share/fonts/truetype/liberation")
CANVAS_FONTS   = Path("/sessions/gifted-compassionate-gates/mnt/.claude/skills/canvas-design/canvas-fonts")
WINDOWS_FONTS  = Path("C:/Windows/Fonts")
LOCAL_FONTS    = Path(__file__).resolve().parent / "fonts"

# When a theme asks for a font file the host doesn't have (Windows boxes
# in particular only ship Liberation Sans, not Serif), fall back to the
# closest equivalent already installed system-wide. Order matters — first
# entry that resolves wins.
FONT_SUBSTITUTES = {
    "LiberationSerif-Regular.ttf":    ["times.ttf"],
    "LiberationSerif-Bold.ttf":       ["timesbd.ttf"],
    "LiberationSerif-Italic.ttf":     ["timesi.ttf"],
    "LiberationSerif-BoldItalic.ttf": ["timesbi.ttf"],
}


def _resolve_font(filename):
    candidates = [filename] + FONT_SUBSTITUTES.get(filename, [])
    bases = [CANVAS_FONTS, LIBERATION_DIR, WINDOWS_FONTS, LOCAL_FONTS]
    for cand in candidates:
        for base in bases:
            p = base / cand
            if p.exists():
                return p
    return None


def register_fonts(font_map: Dict[str, str]) -> None:
    """Register a dict of ReportLab font names -> TTF filenames.

    Filenames are resolved against the legacy canvas-fonts dir, the
    Linux Liberation dir, the Windows Fonts dir, and a project-local
    fonts/ — in that order. Liberation Serif filenames fall back to
    Times-* equivalents via FONT_SUBSTITUTES when the originals
    aren't on the host (typical on Windows).

    Registration is idempotent — ReportLab silently tolerates
    re-registering the same name, but we guard anyway.
    """
    already = set(pdfmetrics.getRegisteredFontNames())
    for name, fn in font_map.items():
        if name in already:
            continue
        path = _resolve_font(fn)
        if path is None:
            raise FileNotFoundError(
                f"Theme font '{fn}' not found in {CANVAS_FONTS}, {LIBERATION_DIR}, {WINDOWS_FONTS}, or {LOCAL_FONTS}"
            )
        pdfmetrics.registerFont(TTFont(name, str(path)))


# =====================================================================
# THEME DATACLASS
# =====================================================================
@dataclass
class Palette:
    """10-color palette every theme must provide."""
    primary:      Color   # brand color — headings, table header bg
    primary_dark: Color   # deeper shade — titles, total row
    accent:       Color   # highlight color — rule, kicker tick
    accent_tint:  Color   # background wash for highlighted blocks
    paper:        Color   # page background (can == WHITE)
    cream:        Color   # warm surface — callout blocks
    ink:          Color   # primary text
    ink_mid:      Color   # secondary text
    ink_lt:       Color   # meta / labels
    rule:         Color   # horizontal separator lines


@dataclass
class Fonts:
    """Required font roles. Values are the ReportLab font names registered
    via ``register_fonts``."""
    display:  str  # large headline face (e.g. 28pt title)
    serif:    str  # body serif
    serif_b:  str  # body serif bold
    serif_i:  str  # body serif italic
    sans:     str  # body sans
    sans_b:   str  # body sans bold
    sans_i:   str  # body sans italic (optional — fall back to sans)
    mono:     str  # numerics / codes (optional — fall back to sans)


@dataclass
class Theme:
    name:        str                          # slug, e.g. "forest-canopy"
    label:       str                          # human name, e.g. "Forest Canopy"
    philosophy:  str                          # one-line description
    palette:     Palette
    fonts:       Fonts
    # Theme-specific page chrome (header/footer). Receives (canv, doc, intake, theme).
    draw_frame:  Callable
    # Optional tweak hooks — let a theme customize specific blocks without
    # forking the whole renderer. Each is given (theme, intake, ctx) and
    # returns a dict of override values merged into the default render ctx.
    scope_table_style: Optional[Callable] = None
    totals_style:      Optional[Callable] = None
    warranty_style:    Optional[Callable] = None


# =====================================================================
# REGISTRY — lazy discovery of themes/<name>/theme.py
# =====================================================================
THEMES_DIR = Path(__file__).parent / "themes"


def available_themes() -> Dict[str, Path]:
    """Map theme-name -> path to theme.py by directory discovery."""
    out: Dict[str, Path] = {}
    if not THEMES_DIR.exists():
        return out
    for child in sorted(THEMES_DIR.iterdir()):
        theme_py = child / "theme.py"
        if child.is_dir() and theme_py.exists():
            out[child.name] = theme_py
    return out


def load_theme(name: str) -> Theme:
    """Import themes/<name>/theme.py and return its THEME constant."""
    registry = available_themes()
    if name not in registry:
        available = ", ".join(sorted(registry.keys())) or "(none)"
        raise ValueError(f"Unknown theme '{name}'. Available: {available}")
    path = registry[name]
    spec = importlib.util.spec_from_file_location(f"gcc_theme_{name.replace('-', '_')}", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    theme: Theme = mod.THEME
    # Register the theme's fonts (idempotent).
    register_fonts(mod.FONT_MAP)
    return theme
