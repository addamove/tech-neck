import sharp from 'sharp';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [male, female, marker] = process.argv.slice(2);
if (!male || !female || !marker) throw new Error('Pass the three Level 2 source sheets.');
// Native pixel crops measured on the 1254px source sheets. Keep the complete
// figure, not a blind grid split (the standing head crosses the nominal row).
const photo = {
  bridge: [0, 180, 435, 320], cat: [445, 180, 385, 320], cow: [835, 180, 407, 320],
  mountain: [55, 525, 325, 615], fold: [440, 680, 350, 450], neck: [865, 640, 350, 465],
};
const markerCrops = {
  bridge: [0, 125, 458, 380], cat: [458, 125, 398, 380], cow: [856, 125, 398, 380],
  mountain: [35, 520, 375, 645], fold: [440, 680, 370, 490], neck: [875, 620, 360, 540],
};
const report = [];
const archive = resolve('work/night-stretch/originals');
await mkdir(archive, { recursive: true });
for (const [style, source] of Object.entries({ male, female, marker })) {
  await copyFile(source, resolve(archive, `${style}-level2.png`));
  const { width, height } = await sharp(source).metadata();
  if (width !== 1254 || height !== 1254) throw new Error('Review crop coordinates for a different source size.');
  const output = resolve(`public/art/night/${style}`);
  await mkdir(output, { recursive: true });
  for (const [name, [left, top, cropWidth, cropHeight]] of Object.entries(style === 'marker' ? markerCrops : photo)) {
    let crop = await sharp(source).extract({ left, top, width: cropWidth, height: cropHeight }).png().toBuffer();
    if (name === 'cat' && style !== 'marker') crop = await sharp(crop).extend({ right: 40, left: 0, top: 0, bottom: 0, background: '#fff' }).png().toBuffer();
    if (name === 'cow' && style !== 'marker') crop = await sharp(crop).extend({ left: 18, right: 0, top: 0, bottom: 0, background: '#fff' }).png().toBuffer();
    const compressed = await sharp(crop).webp(style === 'marker' ? { lossless: true, effort: 6 } : { quality: 85, effort: 6 }).toBuffer();
    if (style === 'marker' && !(await sharp(crop).ensureAlpha().raw().toBuffer()).equals(await sharp(compressed).ensureAlpha().raw().toBuffer())) throw new Error(`Changed marker pixels: ${name}`);
    await writeFile(resolve(output, `${name}.webp`), compressed);
    report.push({ style, name, pngBytes: crop.length, webpBytes: compressed.length, losslessVerified: style === 'marker' });
  }
}
await writeFile(resolve(archive, 'compression-level2.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
