import sharp from 'sharp';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const options = {};
for (let i=2;i<process.argv.length;i+=2) {
  if (!process.argv[i]?.startsWith('--') || !process.argv[i+1]) throw new Error('Use --male PATH --female PATH --marker PATH.');
  options[process.argv[i].slice(2)] = process.argv[i+1];
}
const archive = resolve(root, 'work/arm-swings-art-originals');
await mkdir(archive,{recursive:true});
let records=[];
try { records=JSON.parse(await readFile(resolve(archive,'manifest.json'),'utf8')); } catch(error) { if(error.code!=='ENOENT') throw error; }
for(const style of ['male','female','marker']) {
  if(!options[style]) continue;
  const source=resolve(options[style]);
  const metadata=await sharp(source).metadata();
  if(metadata.width!==1774 || metadata.height!==887) throw new Error('Expected accepted native 1774×887 source; no resizing allowed.');
  const preserved=resolve(archive,`${style}-${basename(source)}`);
  if(source!==preserved) await copyFile(source,preserved);
  // Measured blank gaps retain the entire front-reaching hand even where
  // it crosses the nominal quarter-cell boundary. Column four is discarded.
  const edges=[0,443,970,1330];
  const outputDir=resolve(root,`public/art/neck-level2/${style}`);
  await mkdir(outputDir,{recursive:true});
  const outputs=[];
  for(let phase=1;phase<=3;phase++) {
    const width=edges[phase]-edges[phase-1];
    const crop=await sharp(source).extract({left:edges[phase-1],top:0,width,height:887}).png().toBuffer();
    const output=resolve(outputDir,`arm-circle-${phase}.webp`);
    await sharp(crop).webp(style==='marker'?{lossless:true,effort:6}:{quality:85,alphaQuality:100,effort:6}).toFile(output);
    const decoded=await sharp(output).ensureAlpha().raw().toBuffer();
    if(style==='marker' && !(await sharp(crop).ensureAlpha().raw().toBuffer()).equals(decoded)) throw new Error('Marker decoded RGBA changed.');
    outputs.push({phase,width,height:887,sourceLeft:edges[phase-1],bytes:(await readFile(output)).length});
  }
  records=records.filter(record=>record.style!==style);
  records.push({style,source:preserved,sha256:createHash('sha256').update(await readFile(source)).digest('hex'),outputs});
  console.log(`${style}: three native arm-swing crops; fourth column discarded${style==='marker'?'; decoded RGBA identical':'; WebP quality85'}`);
}
await writeFile(resolve(archive,'manifest.json'),`${JSON.stringify(records,null,2)}\n`);
