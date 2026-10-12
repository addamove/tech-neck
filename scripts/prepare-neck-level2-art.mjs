import sharp from 'sharp';
import { mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const options = {};
for (let i = 2; i < process.argv.length; i += 2) {
  if (!process.argv[i]?.startsWith('--') || !process.argv[i + 1]) throw new Error('Use --male PATH --female PATH --marker PATH; optional --prompt PATH.');
  options[process.argv[i].slice(2)] = process.argv[i + 1];
}
const archive = resolve(root, 'work/neck-level2-art-originals');
await mkdir(archive, { recursive: true });
const cells = ['head-turn-left', 'head-turn-center', 'head-turn-right', 'arm-circle-1', 'arm-circle-2', 'arm-circle-3'];
let records = [];
try { records = JSON.parse(await readFile(resolve(archive, 'manifest.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const style of ['male', 'female', 'marker']) {
  if (!options[style]) continue;
  const source = resolve(options[style]);
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height || metadata.width % 3 || metadata.height % 2) throw new Error(`${style}: expected a three-column, two-row atlas divisible by 3 and 2. No resizing is allowed.`);
  const width = metadata.width / 3;
  const rowBoundary = Math.round(700 * metadata.height / 1254);
  const preserved = resolve(archive, `${style}-${basename(source)}`);
  if (source !== preserved) await copyFile(source, preserved);
  const outputDir = resolve(root, `public/art/neck-level2/${style}`);
  await mkdir(outputDir, { recursive: true });
  const outputs = [];
  await rm(resolve(outputDir, 'head-turn-right.webp'), { force: true });
  for (const [index, name] of cells.entries()) {
    if (name === 'head-turn-right') continue;
    const top = index < 3 ? 0 : rowBoundary;
    const height = index < 3 ? rowBoundary : metadata.height - rowBoundary;
    const crop = await sharp(source).extract({ left: index % 3 * width, top, width, height }).png().toBuffer();
    const output = resolve(outputDir, `${name}.webp`);
    await sharp(crop).webp(style === 'marker' ? { lossless: true, effort: 6 } : { quality: 85, alphaQuality: 100, effort: 6 }).toFile(output);
    const decoded = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (decoded.info.width !== width || decoded.info.height !== height) throw new Error('Output dimensions changed.');
    if (style === 'marker') {
      const original = await sharp(crop).ensureAlpha().raw().toBuffer();
      if (!original.equals(decoded.data)) throw new Error(`Marker crop lost decoded RGBA pixels: ${name}`);
    }
    outputs.push({ name, bytes: (await readFile(output)).length, width, height, encoding: style === 'marker' ? 'lossless; decoded RGBA exact' : 'WebP quality 85' });
  }
  records = records.filter(record => record.style !== style);
  records.push({ style, source: preserved, sha256: createHash('sha256').update(await readFile(source)).digest('hex'), outputs });
  console.log(`${style}: five native crops (${width}px wide, row boundary ${rowBoundary}px); right head turn mirrors left${style === 'marker' ? '; decoded marker RGBA exact' : '; WebP quality 85'}`);
}
if (options.prompt) await copyFile(resolve(options.prompt), resolve(archive, 'generation-prompt.txt'));
if (records.length) await writeFile(resolve(archive, 'manifest.json'), `${JSON.stringify(records, null, 2)}\n`);
