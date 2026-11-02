"""Creates the instruction and praise clips from src/content/audio.json, the
word clips from words.json and the syllable clips, into
src/audio/files/<kind>/<key>.mp3.

Runs once on the PC, never in the app. Needs network and, in a separate venv,
`pip install requests` (ElevenLabs, the default) or `pip install edge-tts`
(--engine edge, the Microsoft Athina voice used before). ElevenLabs reads its
key from ~/.elevenlabs-key (one line, outside the repo); the voice is a library
voice, so the account needs a paid plan (Starter is enough, and its licence
covers the app). Phonemes are not made here: a voice cannot say a bare sound
(PRD §6), so those stay real recordings.

    python scripts/voice/generate.py [--only welcome,1]          # instructions and praise
    python scripts/voice/generate.py --words [--only duck,pie]
    python scripts/voice/generate.py --sentences [--only bird-yes]
    node scripts/voice/syllable-list.ts > syllables.json
    python scripts/voice/generate.py --syllables syllables.json [--skip-existing]

Words and sentences are stored by id (word/duck.mp3, sentence/bird-yes.mp3), syllables by sound (syllableSoundKey:
«τή», «τι» → syllable/τι.mp3).
"""

import argparse
import asyncio
import json
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "src" / "content" / "audio.json"
WORDS = ROOT / "src" / "content" / "words.json"
SENTENCES = ROOT / "src" / "content" / "sentences.json"
OUT = ROOT / "src" / "audio" / "files"

# «Eleni – a calm female youthful voice», chosen by the parent over Athina
ELEVEN_VOICE = "aTP4J5SJLQl74WTSRXKW"
ELEVEN_MODEL = "eleven_multilingual_v2"
# Alone, multilingual v2 says some syllables wrong («γκε» as «γε»); turbo v2.5
# told the language is Greek says these right (checked by ear by the parent).
TURBO = ("eleven_turbo_v2_5", "el")
MODEL_FOR = {k: TURBO for k in ["γκε", "γκι", "γο", "αρ", "γου", "λι", "ου", "πια", "τζου", "τσου", "χου", "δελ"]}
# «γό» still came out as «γκο»; with a capital it does not. «δέλ» came out as «ντελ»;
# trailing dots keep the δ soft
TEXT_FOR = {"γο": "Γό", "δελ": "δέλ…"}
# 24 kHz, 48 kbps (as the Athina clips were) keeps the whole app near 3.4 MB (PRD §8: first load under 4 MB)
ELEVEN_FORMAT = "mp3_24000_48"


ACCENT = dict(zip("αεηιουω", "άέήίόύώ"))


def stressed(text):
    """Stress on the last vowel letter («κα» → «κά», «ου» → «ού»). Unstressed, the
    voice reads a syllable as text: «κα» as «κυρία», «ρι» or «α» as letter names."""
    if any(c in ACCENT.values() for c in text):
        return text
    for i in range(len(text) - 1, -1, -1):
        if text[i] in ACCENT:
            return text[:i] + ACCENT[text[i]] + text[i + 1 :]
    return text


def syllable_clips(path):
    for key, text in json.loads(Path(path).read_text(encoding="utf-8")).items():
        key = unicodedata.normalize("NFC", key)
        yield "syllable", key, TEXT_FOR.get(key) or stressed(unicodedata.normalize("NFC", text))


def word_clips():
    for w in json.loads(WORDS.read_text(encoding="utf-8")):
        yield "word", w["id"], w["text"]


def sentence_clips():
    for s in json.loads(SENTENCES.read_text(encoding="utf-8")):
        text = ""
        for tok in s["tokens"]:  # as sentenceText in src/exercises/trueFalse/generate.ts
            text += f" {tok}" if text and tok[0].isalpha() else tok
        yield "sentence", s["id"], text


def clips():
    data = json.loads(AUDIO.read_text(encoding="utf-8"))
    for key, text in data["instructions"].items():
        yield "instruction", key, text
    for i, text in enumerate(data["praise"], start=1):
        yield "praise", str(i), text


async def edge(text, path, args):
    import edge_tts

    for attempt in range(1, 9):
        try:
            await edge_tts.Communicate(text, args.voice or "el-GR-AthinaNeural", rate=args.rate, pitch=args.pitch).save(str(path))
            return True
        except edge_tts.exceptions.NoAudioReceived:
            # the service drops some requests; wait and retry
            path.unlink(missing_ok=True)
            await asyncio.sleep(2 * attempt)
    return False


def eleven(text, path, args, clip_key):
    import requests

    api_key = (Path.home() / ".elevenlabs-key").read_text(encoding="utf-8").strip()
    model, language = MODEL_FOR.get(clip_key, (ELEVEN_MODEL, None))
    body = {"text": text, "model_id": model}
    if language:
        body["language_code"] = language
    for attempt in range(1, 5):
        r = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{args.voice or ELEVEN_VOICE}",
            params={"output_format": ELEVEN_FORMAT},
            headers={"xi-api-key": api_key},
            json=body,
            timeout=60,
        )
        if r.status_code == 200:
            path.write_bytes(r.content)
            return True
        print(f"  {r.status_code} {r.text[:200]}", flush=True)
        if r.status_code not in (429, 500, 502, 503):
            return False
    return False


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--engine", choices=["eleven", "edge"], default="eleven")
    parser.add_argument("--voice", default="", help="ElevenLabs voice id or edge voice name")
    parser.add_argument("--rate", default="-10%", help="edge only: slower for a 6-year-old")
    parser.add_argument("--pitch", default="+0Hz", help="edge only")
    parser.add_argument("--only", default="", help="comma-separated keys")
    parser.add_argument("--syllables", default="", help="JSON from scripts/voice/syllable-list.ts")
    parser.add_argument("--words", action="store_true", help="one clip per word of words.json")
    parser.add_argument("--sentences", action="store_true", help="one clip per sentence of sentences.json")
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args()
    only = {k for k in args.only.split(",") if k}

    source = syllable_clips(args.syllables) if args.syllables else word_clips() if args.words else sentence_clips() if args.sentences else clips()
    for kind, key, text in source:
        if only and key not in only:
            continue
        path = OUT / kind / f"{key}.mp3"
        if args.skip_existing and path.exists() and path.stat().st_size > 1000:
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        text = unicodedata.normalize("NFC", text)
        ok = await edge(text, path, args) if args.engine == "edge" else eleven(text, path, args, key)
        print(f"{kind}/{key}.mp3  {text}" if ok else f"FAILED {kind}/{key}", flush=True)


asyncio.run(main())
