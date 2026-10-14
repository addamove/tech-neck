import sharp from 'sharp';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Reviewed native-pixel crops avoid neighbouring limbs and generated grid lines.
// Supply the nine original sheets in A/B/C order, each male/female/marker.
const sources = process.argv.slice(2,11);
const correctedCross = process.argv[11];
const warmups = process.argv.slice(12,15);
if (sources.length !== 9 || !correctedCross || warmups.length !== 3) throw new Error('Pass nine A/B/C sheets, corrected marker cross-body pair, then aligned warmup pairs (male/female/marker).');
const names = [
  ['reach','figure','prone-down','prone-up','side-down','side-up'],
  ['roller-curl-down','roller-curl-up','block-curl-down','block-curl-up','roller-fold','roller-upright'],
  ['knees','twist','cross-down','cross-up','supported-rest','seated-release'],
];
const crops = [
  [
    [[0,100,426,320],[440,100,370,320],[820,100,434,320],[0,734,434,320],[440,720,414,320],[840,720,414,320]],
    [[0,170,426,300],[440,170,360,300],[825,170,429,300],[0,700,429,300],[440,700,414,300],[840,700,414,300]],
    [[0,180,425,300],[450,180,330,300],[810,180,444,300],[0,721,444,300],[450,700,404,300],[850,700,404,300]],
  ],
  [
    [[2,140,414,330],[420,140,414,330],[838,130,414,330],[2,750,414,330],[420,635,414,500],[838,635,414,500]],
    [[0,150,414,330],[430,150,385,330],[812,150,442,330],[0,750,442,330],[450,640,365,510],[890,660,364,510]],
    [[0,200,410,330],[440,200,360,330],[810,200,444,330],[0,720,444,330],[460,650,360,420],[910,650,344,420]],
  ],
  [
    [[0,160,410,320],[420,160,414,330],[840,120,414,360],[4,730,414,360],[420,680,414,390],[875,680,379,390]],
    [[0,160,400,320],[410,160,420,320],[840,160,414,300],[0,740,414,300],[415,680,430,380],[875,680,379,380]],
    [[0,180,390,320],[400,180,435,320],[850,180,404,320],[0,710,404,320],[400,680,460,350],[900,680,354,350]],
  ],
];
const styles=['male','female','marker'];
const archive=resolve('work/back-care/originals');
await mkdir(archive,{recursive:true});
const report=[];
for(let sheet=0;sheet<3;sheet++) for(let style=0;style<3;style++) {
  const source=sources[sheet*3+style], label=styles[style];
  const archived=resolve(archive,`${label}-${String.fromCharCode(65+sheet)}.png`);
  if(resolve(source)!==archived) await copyFile(source,archived);
  const meta=await sharp(source).metadata();
  if(meta.width!==1254||meta.height!==1254) throw new Error('Recheck crop coordinates for a different source size.');
  const output=resolve(`public/art/back/${label}`);await mkdir(output,{recursive:true});
  for(let index=0;index<6;index++) {
    const [left,top,width,height]=crops[sheet][style][index];
    let crop=await sharp(source).extract({left,top,width,height}).png().toBuffer();
    // Match unequal source-cell widths without resampling any drawn pixels.
    const pairs=sheet===1?[[0,1],[2,3],[4,5]]:sheet===0?[[2,3],[4,5]]:[[2,3]];
    const pair=pairs.find(p=>p.includes(index));
    const canvasWidth=pair?Math.max(...pair.map(i=>crops[sheet][style][i][2])):width;
    if(canvasWidth>width) crop=await sharp(crop).extend({left:0,right:canvasWidth-width,top:0,bottom:0,background:'#fff'}).png().toBuffer();
    const compressed=await sharp(crop).webp(label==='marker'?{lossless:true,effort:6}:{quality:85,effort:6}).toBuffer();
    if(label==='marker'&&!(await sharp(crop).ensureAlpha().raw().toBuffer()).equals(await sharp(compressed).ensureAlpha().raw().toBuffer()))throw new Error('Marker pixels changed');
    await writeFile(resolve(output,`${names[sheet][index]}.webp`),compressed);
    report.push({style:label,pose:names[sheet][index],pngBytes:crop.length,webpBytes:compressed.length,lossless:label==='marker'});
  }
}
// Corrected anatomy: separate, near-straight arms alongside the body. Equal native-pixel
// canvases keep the pelvis and planted foot aligned across the two states.
const correctedArchive=resolve(archive,'marker-cross-v3.png');
if(resolve(correctedCross)!==correctedArchive) await copyFile(correctedCross,correctedArchive);
for(const [pose,top] of [['cross-down',0],['cross-up',610]]) {
  const crop=await sharp(correctedCross).extract({left:0,top,width:1254,height:600}).png().toBuffer();
  const compressed=await sharp(crop).webp({lossless:true,effort:6}).toBuffer();
  if(!(await sharp(crop).ensureAlpha().raw().toBuffer()).equals(await sharp(compressed).ensureAlpha().raw().toBuffer())) throw new Error('Corrected marker pixels changed');
  await writeFile(resolve(`public/art/back/marker/${pose}.webp`),compressed);
  Object.assign(report.find(item=>item.style==='marker'&&item.pose===pose),{pngBytes:crop.length,webpBytes:compressed.length});
}
// Upper-body pixel registration: matched head/shoulder/hand anchors, no scaling.
// Keep identical canvases: only the legs change between reach and knees.
for (const [styleIndex, label] of styles.entries()) {
  const source=warmups[styleIndex];
  const saved=resolve(archive, `${label}-warmup-v2.png`);
  if(resolve(source)!==saved) await copyFile(source,saved);
  const tops=[[180,751],[230,751],[110,683]][styleIndex];
  for(const [index,name] of ['reach','knees'].entries()) {
    const crop=await sharp(source).extract({left:0,top:tops[index],width:1254,height:480}).png().toBuffer();
    const webp=await sharp(crop).webp(label==='marker'?{lossless:true,effort:6}:{quality:85,effort:6}).toBuffer();
    if(label==='marker'&&!(await sharp(crop).ensureAlpha().raw().toBuffer()).equals(await sharp(webp).ensureAlpha().raw().toBuffer())) throw new Error('Warmup marker pixels changed');
    await writeFile(resolve(`public/art/back/${label}/${name}.webp`),webp);
    Object.assign(report.find(item=>item.style===label&&item.pose===name),{pngBytes:crop.length,webpBytes:webp.length});
  }
}
await writeFile(resolve(archive,'compression.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({files:report.length,pngBytes:report.reduce((s,x)=>s+x.pngBytes,0),webpBytes:report.reduce((s,x)=>s+x.webpBytes,0)}));
