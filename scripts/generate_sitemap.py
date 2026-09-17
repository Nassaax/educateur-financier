#!/usr/bin/env python3
"""Régénère sitemap.xml à partir des fichiers .html présents à la racine.

Exclut automatiquement toute page marquée <meta name="robots" content="noindex">.
Les priorités sont fixées dans PRIORITY_OVERRIDES ; toute page absente de ce
dict reçoit DEFAULT_PRIORITY (à ajuster manuellement ici si besoin).
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = "https://educateur-financier.vercel.app"
DEFAULT_PRIORITY = 0.7

PRIORITY_OVERRIDES = {
    "index.html": 1.0,
    "commencer.html": 0.9,
    "outils.html": 0.9,
    "quiz.html": 0.9,
    "pack-investisseur.html": 0.9,
    "coaching.html": 0.9,
    "simulateur-epargne.html": 0.8,
    "fire.html": 0.8,
    "calculateur-plus-value.html": 0.8,
    "conseils.html": 0.8,
    "comparateurs.html": 0.8,
    "apropos.html": 0.6,
    "mentions-legales.html": 0.3,
    "confidentialite.html": 0.3,
    "cgv.html": 0.3,
}

NOINDEX_RE = re.compile(r'<meta\s+name="robots"\s+content="[^"]*noindex[^"]*"', re.IGNORECASE)


def is_noindex(path: Path) -> bool:
    return bool(NOINDEX_RE.search(path.read_text(encoding="utf-8")))


def build_sitemap() -> str:
    pages = []
    for path in sorted(ROOT.glob("*.html")):
        if is_noindex(path):
            continue
        priority = PRIORITY_OVERRIDES.get(path.name, DEFAULT_PRIORITY)
        pages.append((priority, path.name))

    pages.sort(key=lambda p: (-p[0], p[1]))

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for priority, name in pages:
        lines.append(f'  <url><loc>{BASE_URL}/{name}</loc><priority>{priority}</priority></url>')
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    sitemap_path = ROOT / "sitemap.xml"
    sitemap_path.write_text(build_sitemap(), encoding="utf-8")
    print(f"sitemap.xml régénéré ({sitemap_path})")
