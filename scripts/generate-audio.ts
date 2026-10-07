// macOS build-time generator. Run: npx tsx scripts/generate-audio.ts
// The resulting MP3s are ordinary offline assets; users need no system TTS service.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { ROUTINES } from '../src/core/config';
import { cueTimeline } from '../src/core/engine';

const destination = resolve('public/audio');
const scratch = resolve('work/audio');
mkdirSync(destination, { recursive: true }); mkdirSync(scratch, { recursive: true });
const deadlines = new Map<string, number>();
function register(text: string, seconds: number) { deadlines.set(text, Math.min(deadlines.get(text) ?? Infinity, seconds)); }
for (const routine of ROUTINES) for (const exercise of routine.exercises) {
  register(exercise.description, Math.max(1, exercise.prepSeconds - 1));
  const cues = cueTimeline(exercise);
  cues.forEach((cue, index) => register(cue.text, Math.max(0.8, Math.min(cue.text.includes('Rest for two') ? 1.8 : 8, (cues[index + 1]?.atSeconds ?? exercise.durationSeconds) - cue.atSeconds - 0.15))));
}
if (process.argv.includes('--inputs-only')) {
  const argument = process.argv[process.argv.indexOf('--inputs-only') + 1] ?? 'work/audio-inputs.json';
  writeFileSync(resolve(argument), JSON.stringify([...deadlines].map(([text, maxSeconds]) => ({ text, maxSeconds })), null, 2));
  process.exit(0);
}
const manifest: Record<string, { src: string; duration: number }> = {};
for (const [text, deadline] of deadlines) {
  const name = createHash('sha256').update(text).digest('hex').slice(0, 16);
  const temporary = resolve(scratch, `${name}.aiff`);
  const output = resolve(destination, `${name}.mp3`);
  execFileSync('/usr/bin/say', ['-v', 'Samantha', '-r', '175', '-o', temporary, text]);
  const duration = Number(execFileSync('/opt/homebrew/bin/ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', temporary], { encoding: 'utf8' }).trim());
  let acceleration = Math.max(1, duration / deadline);
  const filters = [];
  while (acceleration > 2) { filters.push('atempo=2'); acceleration /= 2; }
  filters.push(`atempo=${acceleration.toFixed(6)}`);
  execFileSync('/opt/homebrew/bin/ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', temporary, '-af', filters.join(','), '-codec:a', 'libmp3lame', '-q:a', '4', output]);
  const actualDuration = Number(execFileSync('/opt/homebrew/bin/ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', output], { encoding: 'utf8' }).trim());
  manifest[text] = { src: `/audio/${name}.mp3`, duration: actualDuration };
  rmSync(temporary);
  process.stdout.write(`${name}: ${actualDuration.toFixed(2)}s / ${deadline.toFixed(2)}s\n`);
}
writeFileSync(resolve(destination, 'manifest.json'), JSON.stringify(manifest, null, 2));
process.stdout.write(`Generated ${Object.keys(manifest).length} audio files.\n`);
