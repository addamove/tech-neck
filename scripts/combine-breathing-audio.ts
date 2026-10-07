// Reuse the shipped recordings without a network request or a voice change.
// Run: npx tsx scripts/combine-breathing-audio.ts
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BREATHING_GUIDANCE } from '../src/core/config';

type Manifest = Record<string, { src: string; duration: number }>;
const scratch = resolve('work/combined-breathing');
mkdirSync(scratch, { recursive: true });
const prepared = ['female', 'male'].map(gender => {
  const directory = gender === 'male' ? 'audio/male' : 'audio';
  const manifestPath = resolve('public', directory, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  const sources = ['Inhale while lifting up.', 'Exhale while moving down.'].map(text => {
    if (!manifest[text]?.src) throw new Error(`Missing ${gender} recording: ${text}`);
    return resolve('public', manifest[text].src.replace(/^\//, ''));
  });
  const hash = createHash('sha256').update(gender).update(BREATHING_GUIDANCE);
  sources.forEach(source => hash.update(readFileSync(source)));
  const filename = `${hash.digest('hex').slice(0, 16)}.mp3`;
  const output = resolve(scratch, filename);
  execFileSync('/opt/homebrew/bin/ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', sources[0], '-i', sources[1], '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1[out]', '-map', '[out]', '-codec:a', 'libmp3lame', '-q:a', '3', output]);
  const duration = Number(execFileSync('/opt/homebrew/bin/ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', output], { encoding: 'utf8' }).trim());
  if (!Number.isFinite(duration) || duration <= 0 || duration > 8) throw new Error(`Invalid combined ${gender} duration: ${duration}`);
  execFileSync('/opt/homebrew/bin/ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', output, '-f', 'null', '-']);
  manifest[BREATHING_GUIDANCE] = { src: `/${directory}/${filename}`, duration };
  return { output, filename, directory, manifestPath, manifest, gender, duration };
});
// Both clips are validated before either manifest is updated.
for (const item of prepared) {
  copyFileSync(item.output, resolve('public', item.directory, item.filename));
  writeFileSync(`${item.manifestPath}.tmp`, `${JSON.stringify(item.manifest, null, 2)}\n`);
  renameSync(`${item.manifestPath}.tmp`, item.manifestPath);
  process.stdout.write(`${item.gender}: ${item.duration.toFixed(3)}s — ${item.filename}\n`);
}
