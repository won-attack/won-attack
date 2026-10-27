import React from 'react';
import {Img,staticFile} from 'remotion';

export type Motion={mouthStates:number[];amplitude:number[];blinkCenters:number[]};
export const AnimatedPresenter:React.FC<{character:'jeong'|'chaewon';motion:Motion;frame:number;x:number;y:number;width:number;scale?:number}>=({character,motion,frame,x,y,width,scale=1})=>{
  const at=Math.min(motion.mouthStates.length-1,Math.max(0,Math.floor(frame)));
  const active=motion.mouthStates[at]>0;
  const distance=Math.min(...motion.blinkCenters.map(t=>Math.abs(frame-t)));
  const blink=distance<4?1:0;
  const male=character==='jeong';
  const mouthMask=male
    ?'radial-gradient(ellipse 6.2% 4.4% at 50.6% 35.0%, black 72%, transparent 100%)'
    :'radial-gradient(ellipse 6.2% 4.4% at 49.7% 37.5%, black 72%, transparent 100%)';
  const eyeMask=male
    ?'radial-gradient(ellipse 5.6% 3.8% at 44.6% 25.2%, black 62%, transparent 100%),radial-gradient(ellipse 5.6% 3.8% at 55.0% 24.0%, black 62%, transparent 100%)'
    :'radial-gradient(ellipse 5.6% 3.8% at 43.8% 27.4%, black 62%, transparent 100%),radial-gradient(ellipse 5.5% 3.8% at 54.2% 26.4%, black 62%, transparent 100%)';
  const common:React.CSSProperties={position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'fill'};
  return <div style={{position:'absolute',left:x,top:y,width,height:width*1199/1312,
    transform:`translateY(${Math.sin(frame/25)*1.3}px) rotate(${Math.sin(frame/47)*.18}deg) scale(${scale})`,transformOrigin:'50% 85%'}}>
    <Img src={staticFile(`assets/characters/${character}-base-v1.png`)} style={common}/>
    <Img src={staticFile(`assets/characters/${character}-mouth-open-v1.png`)} style={{...common,opacity:active?1:0,maskImage:mouthMask,WebkitMaskImage:mouthMask}}/>
    <Img src={staticFile(`assets/characters/${character}-blink-v1.png`)} style={{...common,opacity:blink,maskImage:eyeMask,WebkitMaskImage:eyeMask}}/>
  </div>;
};
