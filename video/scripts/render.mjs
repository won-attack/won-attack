// Local render only. v1 MP4 is preserved; the default output is v2.
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'out');
const version='v2';
await mkdir(path.join(out,`stills-${version}`),{recursive:true});
const timeline=JSON.parse(await readFile(path.join(root,'scenes/hynix.json'),'utf8'));
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.tsx'),publicDir:path.join(root,'public')});
const composition=await selectComposition({serveUrl,id:'Hynix30'});
const options={serveUrl,composition};
// Include both semiconductor/graph subcuts and an actual blink frame.
const checks=[
  ['intro',46],['blink',66],['wafer',timeline.scenes[1].from+76],
  ['profit-graph',timeline.scenes[1].from+220],['chip',timeline.scenes[2].from+18],
  ['revenue-graph',timeline.scenes[2].from+85],['hbm',timeline.scenes[3].from+155],
  ['ending',timeline.scenes[4].from+62],
];
for(const [name,frame] of checks){
  await renderStill({...options,frame,output:path.join(out,`stills-${version}`,`hynix-${name}.png`),imageFormat:'png'});
  console.log(`Still ${name}, frame ${frame}`);
}
if(!process.argv.includes('--stills-only')){
  let reported=-1;
  await renderMedia({...options,codec:'h264',audioCodec:'aac',pixelFormat:'yuv420p',
    outputLocation:path.join(out,`hynix-30s-${version}.mp4`),crf:19,concurrency:2,
    onProgress:({progress})=>{const bucket=Math.floor(progress*10);if(bucket>reported){reported=bucket;console.log(`Render ${bucket*10}%`);}}
  });
  const report={videoId:timeline.videoId,file:`hynix-30s-${version}.mp4`,width:1080,height:1920,fps:30,
    frames:900,seconds:30,voice:timeline.voice,paidApiCalls:0,
    visualFeatures:['RMS-driven mouth poses','blink overlays','wafer/chip/HBM illustrations','7 visual cuts','full-screen charts','presenter close-up and picture-in-picture'],
    note:'Existing offline voice reused. Mouth motion follows audio energy, not exact phonemes. Fictional claims are intentional.'};
  await writeFile(path.join(out,`render-report-${version}.json`),JSON.stringify(report,null,2)+'\n');
  console.log('MP4 ready: '+path.join(out,`hynix-30s-${version}.mp4`));
}
