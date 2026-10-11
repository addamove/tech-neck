import sharp from 'sharp';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const options = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  const value = process.argv[index + 1];
  if (!flag?.startsWith('--') || !value) throw new Error('Use --male PATH, --female PATH, --marker PATH, or --badges PATH. Optional --STYLE-row5 PATH replaces only the last row.');
  options[flag.slice(2)] = value;
}
const archive = resolve(root, 'work/hands-art-originals');
await mkdir(archive, { recursive: true });
await mkdir(resolve(root, 'public/art'), { recursive: true });
await mkdir(resolve(root, 'public/badges'), { recursive: true });
const layoutPath = resolve(root, 'src/components/handsArtLayout.json');
let layouts = {};
try { layouts = JSON.parse(await readFile(layoutPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }

async function preserve(input, name) {
  const target = resolve(archive, `${name}-${basename(input)}`);
  if (resolve(input) !== target) await copyFile(input, target);
  return target;
}

async function verifyLossless(input, output) {
  const before = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const after = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (before.info.width !== after.info.width || before.info.height !== after.info.height || !before.data.equals(after.data)) {
    throw new Error(`Decoded RGBA changed in lossless output: ${output}`);
  }
}

for (const style of ['male', 'female', 'marker']) {
  if (!options[style]) continue;
  const original = await preserve(options[style], style);
  const metadata = await sharp(original).metadata();
  if (!metadata.width || !metadata.height || metadata.width % 2 !== 0) throw new Error(`Invalid two-column atlas: ${original}`);
  const referenceRows = style === 'marker' ? [0, 310, 615, 882, 1200, 1536] : [0, 310, 610, 900, 1205, 1536];
  const rows = referenceRows.map((y) => Math.round(y * metadata.height / 1536));
  let source = original;
  if (options[`${style}-row5`]) {
    const replacement = await preserve(options[`${style}-row5`], `${style}-row5`);
    const replacementMetadata = await sharp(replacement).metadata();
    if (replacementMetadata.width !== metadata.width || replacementMetadata.height !== metadata.height) throw new Error('Row-five replacement must have the original atlas dimensions.');
    const top = rows[4];
    const strip = await sharp(replacement).extract({ left: 0, top, width: metadata.width, height: metadata.height - top }).toBuffer();
    source = resolve(archive, `${style}-assembled.png`);
    await sharp(original).composite([{ input: strip, left: 0, top }]).png().toFile(source);
  }
  const output = resolve(root, `public/art/hands-${style}.webp`);
  await sharp(source).webp(style === 'marker' ? { lossless: true, effort: 6 } : { quality: 85, alphaQuality: 100, effort: 6 }).toFile(output);
  const outputMetadata = await sharp(output).metadata();
  if (outputMetadata.width !== metadata.width || outputMetadata.height !== metadata.height) throw new Error('Atlas dimensions changed.');
  if (style === 'marker') await verifyLossless(source, output);
  // Register the right cell to the left cell's wrist/cuff anchor. Supported
  // wrists already share the same table edge and need no translation.
  const rightOffsets = {
    male: [-6, -4.5, 0, 21, 35],
    female: [-6, -4.5, 0, 22, 36],
    marker: [-5.5, -9.5, 0, 16, 22],
  };
  layouts[style] = { width: metadata.width, height: metadata.height, rows, rightOffsets: rightOffsets[style].map((x) => x * metadata.width / 1024) };
  const bytes = (await readFile(output)).length;
  console.log(`${style}: ${metadata.width}×${metadata.height}, ${bytes} bytes${style === 'marker' ? ', decoded RGBA identical' : ''}`);
}

if (options.badges) {
  const original = await preserve(options.badges, 'badges');
  const metadata = await sharp(original).metadata();
  if (!metadata.width || !metadata.height || metadata.width % 2 || metadata.height % 2) throw new Error('Badge atlas must have even dimensions.');
  const width = metadata.width / 2;
  const height = metadata.height / 2;
  for (const [index, id] of ['hands-first', 'hands-five', 'hands-ten', 'hands-days-7'].entries()) {
    const output = resolve(root, `public/badges/${id}.webp`);
    await sharp(original).extract({ left: index % 2 * width, top: Math.floor(index / 2) * height, width, height }).webp({ quality: 85, alphaQuality: 100, effort: 6 }).toFile(output);
    console.log(`${id}: ${width}×${height}, ${(await readFile(output)).length} bytes`);
  }
}
await writeFile(layoutPath, `${JSON.stringify(layouts, null, 2)}\n`);
