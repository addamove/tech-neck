#!/usr/bin/env python3
"""Generate and validate one static English voice set without touching the other.

Run: work/venv/bin/python scripts/generate-neural-audio.py --gender male
Female defaults to the existing /audio/ set; male defaults to /audio/male/.
Dependency: edge-tts. Generation uses the network; playback is fully local.
"""
import argparse
import asyncio
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

import edge_tts

VOICES = {'female': 'en-US-JennyNeural', 'male': 'en-US-AndrewNeural'}


def execute(*arguments):
    return subprocess.run(arguments, check=True, capture_output=True, text=True).stdout.strip()


def duration(path):
    return float(execute('/opt/homebrew/bin/ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(path)))


async def generate(args):
    root = Path(__file__).resolve().parent.parent
    os.chdir(root)
    voice = args.voice or VOICES[args.gender]
    public = root / 'public'
    audio_root = (public / 'audio').resolve()
    target = Path(args.target).resolve() if args.target else audio_root / ('male' if args.gender == 'male' else '')
    if target != audio_root and audio_root not in target.parents:
        raise ValueError('--target must be inside public/audio.')
    if args.gender == 'male' and target == audio_root:
        raise ValueError('The root audio directory is reserved for the existing female voice.')
    if args.gender == 'female' and target == audio_root / 'male':
        raise ValueError('The male directory is reserved for the male voice.')
    work = root / 'work'
    work.mkdir(exist_ok=True)
    inputs_path = work / f'neural-inputs-{args.gender}.json'
    execute('npx', 'tsx', 'scripts/generate-audio.ts', '--inputs-only', str(inputs_path))
    inputs = json.loads(inputs_path.read_text())
    staging = work / f'neural-audio-{args.gender}-{time.time_ns()}'
    staging.mkdir()
    raw_directory = work / f'neural-raw-{args.gender}'
    raw_directory.mkdir(exist_ok=True)
    semaphore = asyncio.Semaphore(3)
    manifest = {}
    url_directory = '/' + target.relative_to(public).as_posix()

    async def synthesize(item):
        async with semaphore:
            text, maximum = item['text'], item['maxSeconds']
            name = hashlib.sha256(f"{voice}\n{args.rate}\n{text}".encode()).hexdigest()[:16]
            raw = raw_directory / f'{name}.mp3'
            output = staging / f'{name}.mp3'
            for attempt in range(3):
                try:
                    communication = edge_tts.Communicate(text, voice, rate=args.rate)
                    await asyncio.wait_for(communication.save(str(raw)), timeout=90)
                    break
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2 ** attempt)
            original_duration = duration(raw)
            acceleration = max(1.0, original_duration / max(0.5, maximum - 0.10))
            filters = []
            while acceleration > 2:
                filters.append('atempo=2')
                acceleration /= 2
            filters.append(f'atempo={acceleration:.6f}')
            execute('/opt/homebrew/bin/ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(raw), '-af', ','.join(filters), '-codec:a', 'libmp3lame', '-q:a', '3', str(output))
            actual = duration(output)
            if actual > maximum + 0.05:
                raise RuntimeError(f'Audio deadline failed: {text!r}, {actual:.2f}s > {maximum:.2f}s')
            manifest[text] = {'src': f'{url_directory}/{name}.mp3', 'duration': actual}
            print(f'{name}: {actual:.2f}s / {maximum:.2f}s — {text[:55]}', flush=True)

    await asyncio.gather(*(synthesize(item) for item in inputs))
    if len(manifest) != len(inputs):
        raise RuntimeError('Missing audio entries; current public audio preserved.')
    (staging / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    target.mkdir(parents=True, exist_ok=True)
    backup = work / f'audio-previous-{args.gender}-{time.time_ns()}'
    backup.mkdir()
    # Replace only this set's files; never rename a parent containing another
    # voice. Publish the manifest last so it cannot refer to missing new clips.
    installed = []
    try:
        for source in [*sorted(staging.glob('*.mp3')), staging / 'manifest.json']:
            destination = target / source.name
            if destination.exists():
                shutil.copy2(destination, backup / source.name)
            os.replace(source, destination)
            installed.append(destination)
    except Exception:
        for destination in reversed(installed):
            previous = backup / destination.name
            if previous.exists():
                os.replace(previous, destination)
            else:
                destination.unlink(missing_ok=True)
        raise
    staging.rmdir()
    print(f'Installed {len(manifest)} {voice} clips at {target}. Previous matching files: {backup}', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--gender', choices=['female', 'male'], default='female')
    parser.add_argument('--voice', help='Override the selected gender\'s default neural voice.')
    parser.add_argument('--target', help='Output directory inside public/audio (default: female root, male subdirectory).')
    parser.add_argument('--rate', default='+5%')
    asyncio.run(generate(parser.parse_args()))
