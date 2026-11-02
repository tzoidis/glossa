"""Builds the reading font (src/assets/fonts/GlossaReading-*.woff2) from Andika
(SIL, OFL 1.1), PRD §8. Keeps only Latin, Greek and punctuation, so the font is
~40 KB a weight instead of ~670 KB. Under the OFL a subset is a Modified Version
and may not keep the Reserved Font Name, hence «Glossa Reading»; the copyright
and licence stay (public/licenses/OFL.txt, shipped with the app; credit on the parent screen).

Runs once on the PC: `pip install fonttools brotli` in a separate venv, then

    python scripts/fonts/build.py <folder with Andika-Regular.ttf and Andika-Bold.ttf>

The TTFs are in the Google Fonts repository (ofl/andika) or at software.sil.org.
"""

import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

OUT = Path(__file__).resolve().parents[2] / "src" / "assets" / "fonts"
# Basic Latin, Latin-1 («»), combining accents, Greek, general punctuation, €
UNICODES = "U+0020-007E,U+00A0-00FF,U+0300-036F,U+0370-03FF,U+2010-2027,U+2030-205E,U+20AC"

src = Path(sys.argv[1])
for weight in ["Regular", "Bold"]:
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    font = TTFont(src / f"Andika-{weight}.ttf")
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=subset.parse_unicodes(UNICODES))
    subsetter.subset(font)
    for record in font["name"].names:
        try:
            text = record.toUnicode()
        except UnicodeDecodeError:
            continue
        if "Andika" in text:
            record.string = text.replace("Andika", "Glossa Reading")
    font.flavor = "woff2"
    font.save(OUT / f"GlossaReading-{weight}.woff2")
    print(OUT / f"GlossaReading-{weight}.woff2")
