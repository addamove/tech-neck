#!/usr/bin/env python3
"""Generate and validate one static English voice set without touching the other.

Run: work/venv/bin/python scripts/generate-neural-audio.py --gender male
Add countdown clips only: append --countdown-only (preserves existing audio).
Add chin tips only: append --chin-tips-only (also preserves existing audio).
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
COUNTDOWN_TEXTS = {'Three.', 'Two.', 'One.', 'Start.'}
CHIN_TIP_TEXTS = {
    'Focus on creating length on the back of your neck.',
    'Consciously roll your shoulders down and back to keep the upper trapezius muscles from bunching up around the base of your skull.',
}
TRIMMED_TEXTS = COUNTDOWN_TEXTS | CHIN_TIP_TEXTS


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
    selected_texts = COUNTDOWN_TEXTS if args.countdown_only else CHIN_TIP_TEXTS if args.chin_tips_only else None
    if selected_texts:
        inputs = [item for item in inputs if item['text'] in selected_texts]
        if {item['text'] for item in inputs} != selected_texts:
            raise RuntimeError('Selected input catalog is incomplete; existing audio preserved.')
    staging = work / f'neural-audio-{args.gender}-{time.time_ns()}'
    staging.mkdir()
    raw_directory = work / f'neural-raw-{args.gender}'
    raw_directory.mkdir(exist_ok=True)
    semaphore = asyncio.Semaphore(3)
    manifest_path = target / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if selected_texts and manifest_path.exists() else {}
    generated = set()
    url_directory = '/' + target.relative_to(public).as_posix()

    async def synthesize(item):
        async with semaphore:
            text, maximum = item['text'], item['maxSeconds']
            name = hashlib.sha256(f"{voice}\n{args.rate}\n{text}".encode()).hexdigest()[:16]
            raw = raw_directory / f'{name}.mp3'
            output = staging / f'{name}.mp3'
            if not (args.reuse_raw and raw.exists()):
                for attempt in range(3):
                    try:
                        communication = edge_tts.Communicate(text, voice, rate=args.rate)
                        await asyncio.wait_for(communication.save(str(raw)), timeout=90)
                        break
                    except Exception:
                        if attempt == 2:
                            raise
                        await asyncio.sleep(2 ** attempt)
            if text in TRIMMED_TEXTS:
                # Retain a small natural margin around the word. Reverse the
                # signal to trim only trailing silence, including quiet endings.
                trimmed = staging / f'{name}.wav'
                trim_filter = ('silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB:start_silence=0.025,'
                               'areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB:start_silence=0.06,areverse')
                execute('/opt/homebrew/bin/ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(raw), '-af', trim_filter, str(trimmed))
                source = trimmed
            else:
                source = raw
            original_duration = duration(source)
            acceleration = max(1.0, original_duration / max(0.5, maximum - 0.10))
            if text in TRIMMED_TEXTS and acceleration > 1.5:
                raise RuntimeError(f'Audio would exceed natural 1.5x speed: {text!r}; current public audio preserved.')
            filters = []
            while acceleration > 2:
                filters.append('atempo=2')
                acceleration /= 2
            filters.append(f'atempo={acceleration:.6f}')
            execute('/opt/homebrew/bin/ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source), '-af', ','.join(filters), '-codec:a', 'libmp3lame', '-q:a', '3', str(output))
            if source != raw:
                source.unlink()
            actual = duration(output)
            if actual <= 0 or actual > maximum + (0 if text in TRIMMED_TEXTS else 0.05):
                raise RuntimeError(f'Audio deadline failed: {text!r}, {actual:.2f}s > {maximum:.2f}s')
            execute('/opt/homebrew/bin/ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(output), '-f', 'null', '-')
            manifest[text] = {'src': f'{url_directory}/{name}.mp3', 'duration': actual}
            generated.add(text)
            print(f'{name}: {actual:.2f}s / {maximum:.2f}s, {max(1.0, original_duration / max(0.5, maximum - 0.10)):.3f}x — {text[:55]}', flush=True)

    await asyncio.gather(*(synthesize(item) for item in inputs))
    if len(generated) != len(inputs):
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
    print(f'Installed {len(generated)} {voice} clips; {len(manifest)} manifest entries at {target}. Previous matching files: {backup}', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--gender', choices=['female', 'male'], default='female')
    parser.add_argument('--voice', help='Override the selected gender\'s default neural voice.')
    parser.add_argument('--target', help='Output directory inside public/audio (default: female root, male subdirectory).')
    parser.add_argument('--rate', default='+5%')
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument('--countdown-only', action='store_true', help='Add only Three/Two/One/Start clips; preserve other entries and recordings.')
    selection.add_argument('--chin-tips-only', action='store_true', help='Add only the two chin coaching tips; preserve other entries and recordings.')
    parser.add_argument('--reuse-raw', action='store_true', help='Reuse matching voice/rate/text recordings in ignored work instead of synthesizing them again.')
    asyncio.run(generate(parser.parse_args()))
