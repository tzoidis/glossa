"""Creates the instruction and praise clips from src/content/audio.json with a
Microsoft neural voice (edge-tts), into src/audio/files/<kind>/<key>.mp3.

Runs once on the PC, never in the app. Needs network and `pip install edge-tts`
(keep it in a separate venv). Phonemes are not made here: a voice cannot say a
bare sound (PRD §6), so those stay real recordings.

    python scripts/voice/generate.py [--voice el-GR-AthinaNeural] [--rate -10%] [--only welcome,1]
"""

import argparse
import asyncio
import json
import unicodedata
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "src" / "content" / "audio.json"
OUT = ROOT / "src" / "audio" / "files"


def clips():
    data = json.loads(AUDIO.read_text(encoding="utf-8"))
    for key, text in data["instructions"].items():
        yield "instruction", key, text
    for i, text in enumerate(data["praise"], start=1):
        yield "praise", str(i), text


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", default="el-GR-AthinaNeural")
    parser.add_argument("--rate", default="-10%", help="slower for a 6-year-old")
    parser.add_argument("--pitch", default="+0Hz")
    parser.add_argument("--only", default="", help="comma-separated keys")
    args = parser.parse_args()
    only = {k for k in args.only.split(",") if k}

    for kind, key, text in clips():
        if only and key not in only:
            continue
        path = OUT / kind / f"{key}.mp3"
        path.parent.mkdir(parents=True, exist_ok=True)
        text = unicodedata.normalize("NFC", text)
        for attempt in range(1, 9):
            try:
                await edge_tts.Communicate(text, args.voice, rate=args.rate, pitch=args.pitch).save(str(path))
                break
            except edge_tts.exceptions.NoAudioReceived:
                # the service drops some requests; wait and retry
                if attempt == 8:
                    path.unlink(missing_ok=True)
                    raise
                await asyncio.sleep(2 * attempt)
        print(f"{kind}/{key}.mp3  {text}")


asyncio.run(main())
