import sharp from 'sharp';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const options = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  const value = process.argv[index + 1];
  if (!flag?.startsWith('--') || !value) throw new Error('Use --male PATH, --female PATH, --marker PATH, or --badges PATH. Optional --STYLE-row5 replaces the last row; --STYLE-cell1 replaces only the top-left cell of the accepted assembled master.');
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
  if (!options[style] && !options[`${style}-cell1`]) continue;
  if (options[`${style}-cell1`] && (options[style] || options[`${style}-row5`])) throw new Error('Cell-one mode uses the accepted assembled master. Omit the original style/row-five inputs to preserve every other cell.');
  const original = options[style] ? await preserve(options[style], style) : resolve(archive, `${style}-assembled.png`);
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
  if (options[`${style}-cell1`]) {
    const replacement = await preserve(options[`${style}-cell1`], `${style}-cell1`);
    const replacementMetadata = await sharp(replacement).metadata();
    if (replacementMetadata.width !== metadata.width || replacementMetadata.height !== metadata.height) throw new Error('Cell-one replacement must have the original atlas dimensions.');
    const before = await readFile(source);
    const hash = createHash('sha256').update(before).digest('hex').slice(0, 12);
    await writeFile(resolve(archive, `${style}-before-cell1-${hash}.png`), before);
    const cellWidth = metadata.width / 2;
    const cellHeight = rows[1];
    const beforePixels = await sharp(before).ensureAlpha().raw().toBuffer();
    const cellPixels = await sharp(replacement).extract({ left: 0, top: 0, width: cellWidth, height: cellHeight }).ensureAlpha().raw().toBuffer();
    const assembledPixels = Buffer.from(beforePixels);
    for (let y = 0; y < cellHeight; y++) {
      cellPixels.copy(assembledPixels, y * metadata.width * 4, y * cellWidth * 4, (y + 1) * cellWidth * 4);
    }
    const assembled = await sharp(assembledPixels, { raw: { width: metadata.width, height: metadata.height, channels: 4 } }).png().toBuffer();
    const afterPixels = await sharp(assembled).ensureAlpha().raw().toBuffer();
    for (let y = 0; y < metadata.height; y++) {
      const start = (y * metadata.width + (y < cellHeight ? cellWidth : 0)) * 4;
      const end = (y + 1) * metadata.width * 4;
      if (!beforePixels.subarray(start, end).equals(afterPixels.subarray(start, end))) throw new Error('Cell-one replacement changed pixels outside the selected cell.');
    }
    source = resolve(archive, `${style}-assembled.png`);
    await writeFile(source, assembled);
    console.log(`${style}: replaced only top-left ${cellWidth}×${cellHeight}; all other master RGBA pixels identical`);
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
