import sharp from 'sharp';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [male, female, marker] = process.argv.slice(2);
if (!male || !female || !marker) throw new Error('Pass male, female and marker six-cell source sheets.');
const names = ['side', 'child', 'quad', 'knees', 'twist', 'butterfly'];
const archive = resolve('work/night-stretch/originals');
await mkdir(archive, { recursive: true });
const report = [];
for (const [style, source] of Object.entries({ male, female, marker })) {
  await copyFile(source, resolve(archive, `${style}.png`));
  const { width, height } = await sharp(source).metadata();
  const output = resolve(`public/art/night/${style}`);
  await mkdir(output, { recursive: true });
  for (const [index, name] of names.entries()) {
    const col = index % 3, row = Math.floor(index / 3);
    const columns = style === 'marker' ? [0, Math.round(width * 390 / 1254), Math.round(width * 822 / 1254), width] : [0, Math.round(width / 3), Math.round(width * 2 / 3), width];
    const rowBounds = style === 'marker' ? [[130, 590], [700, 1120]] : [[120, 565], [690, 1100]];
    const top = Math.round(rowBounds[row][0] * height / 1254);
    const bottom = Math.round(rowBounds[row][1] * height / 1254);
    const left = columns[col];
    const cell = { left, top, width: columns[col + 1] - left, height: bottom - top };
    const crop = await sharp(source).extract(cell).png().toBuffer();
    const compressed = await sharp(crop).webp(style === 'marker' ? { lossless: true, effort: 6 } : { quality: 85, effort: 6 }).toBuffer();
    if (style === 'marker') {
      const before = await sharp(crop).ensureAlpha().raw().toBuffer();
      const after = await sharp(compressed).ensureAlpha().raw().toBuffer();
      if (!before.equals(after)) throw new Error(`Marker pixels changed: ${name}`);
    }
    await writeFile(resolve(output, `${name}.webp`), compressed);
    report.push({ style, name, ...cell, pngBytes: crop.length, webpBytes: compressed.length, losslessVerified: style === 'marker' });
  }
}
await writeFile(resolve(archive, 'compression.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
