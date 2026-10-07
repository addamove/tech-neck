import sharp from "sharp";
import {
  readdir,
  mkdir,
  stat,
  copyFile,
  writeFile,
  unlink,
} from "node:fs/promises";
import { join, dirname } from "node:path";

// Never resize sprite sheets: source-space crops and arrows depend on their dimensions.
const publicDir = "public";
const originalsDir = "work/image-originals";
const reviewDir = "work/image-compression";
const apply = process.argv.includes("--apply");
const photoOptions = {
  quality: 85,
  alphaQuality: 100,
  effort: 6,
  smartSubsample: true,
};
const markerOptions = {
  lossless: true,
  exact: true,
  alphaQuality: 100,
  effort: 6,
};
const sampleFiles = [
  "art/chin-v2.png",
  "art/female/chin.png",
  "art/marker/chin.png",
  "badges/first-workout.png",
];
const exists = async (path) =>
  stat(path).then(
    () => true,
    () => false,
  );
async function pngFiles(folder, prefix = "") {
  const entries = await readdir(folder, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const path = join(prefix, entry.name);
    if (entry.isDirectory())
      results.push(...(await pngFiles(join(folder, entry.name), path)));
    else if (entry.name.endsWith(".png")) results.push(path);
  }
  return results.sort();
}
async function validate(source, output, lossless) {
  const before = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const after = await sharp(output)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    before.info.width !== after.info.width ||
    before.info.height !== after.info.height
  )
    throw new Error(`Dimensions changed: ${source}`);
  if (lossless && !before.data.equals(after.data))
    throw new Error(`Lossless RGBA pixels changed: ${source}`);
  for (let index = 3; index < before.data.length; index += 4) {
    if (before.data[index] !== after.data[index])
      throw new Error(`Alpha changed: ${source}`);
  }
  return { width: before.info.width, height: before.info.height };
}
async function convert(path, destination) {
  const archived = join(originalsDir, path);
  const source = (await exists(archived)) ? archived : join(publicDir, path);
  const lossless = path.startsWith("art/marker/");
  await mkdir(dirname(destination), { recursive: true });
  await sharp(source)
    .webp(lossless ? markerOptions : photoOptions)
    .toFile(destination);
  const dimensions = await validate(source, destination, lossless);
  const before = (await stat(source)).size;
  const after = (await stat(destination)).size;
  console.log(
    `${path}: ${(before / 1024).toFixed(1)} → ${(after / 1024).toFixed(1)} KiB (${lossless ? "lossless RGBA" : "quality85, exact alpha"})`,
  );
  return {
    path,
    ...dimensions,
    before,
    after,
    mode: lossless ? "lossless RGBA" : "quality85, exact alpha",
  };
}
await mkdir(reviewDir, { recursive: true });
const sourceDir = (await exists(join(publicDir, "art/chin-v2.png")))
  ? publicDir
  : originalsDir;
if (!(await exists(join(sourceDir, "art/chin-v2.png"))))
  throw new Error(
    "Original PNGs are missing. Restore public/art and public/badges from commit 6971858 into work/image-originals as described in README.",
  );
const files = apply
  ? [
      ...(await pngFiles(join(sourceDir, "art"), "art")),
      ...(await pngFiles(join(sourceDir, "badges"), "badges")),
    ].filter((path) => path !== "art/chin.png")
  : sampleFiles;
const rows = [];
for (const path of files)
  rows.push(
    await convert(path, join(reviewDir, path.replace(/\.png$/, ".webp"))),
  );
if (apply) {
  // Archive every original before installing or removing any public image.
  for (const folder of ["art", "badges"]) {
    for (const path of await pngFiles(join(sourceDir, folder), folder)) {
      const archived = join(originalsDir, path);
      await mkdir(dirname(archived), { recursive: true });
      if (!(await exists(archived)))
        await copyFile(join(sourceDir, path), archived);
    }
  }
  for (const row of rows) {
    await copyFile(
      join(reviewDir, row.path.replace(/\.png$/, ".webp")),
      join(publicDir, row.path.replace(/\.png$/, ".webp")),
    );
  }
  for (const folder of ["art", "badges"]) {
    for (const path of await pngFiles(join(publicDir, folder), folder))
      await unlink(join(publicDir, path));
  }
  for (const icon of ["icon-192.png", "icon-512.png"]) {
    const source = join(publicDir, icon);
    const optimized = await sharp(source)
      .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
      .toBuffer();
    if (optimized.length < (await stat(source)).size) {
      const archived = join(originalsDir, icon);
      if (!(await exists(archived))) await copyFile(source, archived);
      await validate(source, optimized, true);
      await writeFile(source, optimized);
    }
  }
}
await writeFile(
  join(reviewDir, apply ? "report.json" : "samples.json"),
  JSON.stringify(rows, null, 2) + "\n",
);
const originalUrls = new Map();
for (const { path } of rows) {
  originalUrls.set(
    path,
    (await exists(join(originalsDir, path)))
      ? `/work/image-originals/${path}`
      : `/${path}`,
  );
}
await writeFile(
  join(reviewDir, "index.html"),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Image compression review</title><style>body{margin:0;padding:24px;background:#eef5f3;font:14px Arial;color:#203b3b}h1{font-size:22px}section{padding:18px;background:white;border-radius:16px;margin:18px auto;max-width:1100px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:15px}figure{margin:0;text-align:center}img{width:100%;max-height:420px;object-fit:contain;background:white}figcaption{padding:10px;color:#6a8178}h2{font-size:16px}@media(max-width:600px){body{padding:10px}.pair{grid-template-columns:1fr}}</style><h1>Original PNG / compressed WebP</h1>${rows.map((row) => `<section><h2>${row.path} · ${row.width}×${row.height} · ${row.mode}</h2><div class="pair"><figure><img src="${originalUrls.get(row.path)}"><figcaption>Original · ${(row.before / 1024).toFixed(1)} KiB</figcaption></figure><figure><img src="/work/image-compression/${row.path.replace(/\.png$/, ".webp")}"><figcaption>WebP · ${(row.after / 1024).toFixed(1)} KiB</figcaption></figure></div></section>`).join("")}</html>`,
);
console.log(`Review: /${reviewDir}/index.html`);
