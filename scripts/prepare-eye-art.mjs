import sharp from 'sharp';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

// Native crops + lossless WebP only; preserve every decoded drawing pixel.
const [sheet, circles] = process.argv.slice(2);
if (!sheet || !circles) throw new Error('Pass the four-cell sheet and circle illustration source paths.');
const output = resolve('public/art/eye-gym');
const archive = resolve('work/eye-gym/originals');
await mkdir(output, { recursive: true });
await mkdir(archive, { recursive: true });
const records = [];
for (const [name, source] of [['sheet', sheet], ['circles', circles]]) {
  const input = await readFile(source);
  await copyFile(source, resolve(archive, `${name}.png`));
  const { width, height } = await sharp(input).metadata();
  if (!width || !height || width !== height || width % 2) throw new Error('Expected an even square native source.');
  const cells = name === 'sheet' ? ['open', 'closed', 'distance', 'palming'] : ['circles'];
  for (const [index, cell] of cells.entries()) {
    const size = name === 'sheet' ? width / 2 : width;
    const crop = await sharp(input).extract({ left: name === 'sheet' ? index % 2 * size : 0, top: name === 'sheet' ? Math.floor(index / 2) * size : 0, width: size, height: size }).png().toBuffer();
    const webp = await sharp(crop).webp({ lossless: true, effort: 6 }).toBuffer();
    const before = await sharp(crop).ensureAlpha().raw().toBuffer();
    const after = await sharp(webp).ensureAlpha().raw().toBuffer();
    if (!before.equals(after)) throw new Error(`Changed pixels in ${cell}.`);
    await writeFile(resolve(output, `${cell}.webp`), webp);
    records.push({ file: `${cell}.webp`, width: size, height: size, pngBytes: crop.length, webpBytes: webp.length, losslessVerified: true, sourceSha256: createHash('sha256').update(input).digest('hex') });
  }
}
await writeFile(resolve(archive, 'compression.json'), JSON.stringify(records, null, 2));
console.log(JSON.stringify(records, null, 2));
