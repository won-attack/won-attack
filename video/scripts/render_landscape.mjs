import {bundle} from '@remotion/bundler';
import {renderMedia,renderStill,selectComposition} from '@remotion/renderer';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const kindAt=args.indexOf('--kind');
const requested=kindAt>=0?args[kindAt+1]:'all';
if(!['samsung','hyundai','all'].includes(requested))throw new Error('Use --kind samsung|hyundai|all');
const kinds=requested==='all'?['samsung','hyundai']:[requested];
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.tsx'),publicDir:path.join(root,'public')});
for(const kind of kinds){
  const timeline=JSON.parse(await readFile(path.join(root,`scenes/${kind}.json`),'utf8'));
  const id=kind==='samsung'?'SamsungLandscape30':'HyundaiLandscape30';
  const composition=await selectComposition({serveUrl,id});
  const stillDir=path.join(root,`out/${kind}-landscape-stills`);await mkdir(stillDir,{recursive:true});
  for(const scene of timeline.scenes){
    const frame=scene.from+Math.min(scene.durationInFrames-12,Math.max(30,Math.floor(scene.durationInFrames*.70)));
    await renderStill({serveUrl,composition,frame,output:path.join(stillDir,`scene-${scene.id+1}.png`),imageFormat:'png'});
    console.log(`${kind} still ${scene.id+1}/6`);
  }
  if(!args.includes('--stills-only')){
    const outputLocation=path.join(root,`out/${kind}-30s-landscape-v1.mp4`);
    let reported=-1;
    await renderMedia({serveUrl,composition,codec:'h264',audioCodec:'aac',pixelFormat:'yuv420p',outputLocation,crf:19,concurrency:2,
      onProgress:({progress})=>{const n=Math.floor(progress*10);if(n>reported){reported=n;console.log(`${kind} render ${n*10}%`);}}});
    await writeFile(path.join(root,`out/${kind}-landscape-report.json`),JSON.stringify({videoId:timeline.videoId,presenter:timeline.presenter,width:1920,height:1080,frames:900,fps:30,voice:timeline.voice,paidApiCalls:0,note:'Simple audio-energy mouth motion and blink; intentionally fictional investment claims.'},null,2)+'\n');
    console.log('MP4 ready: '+outputLocation);
  }
}
