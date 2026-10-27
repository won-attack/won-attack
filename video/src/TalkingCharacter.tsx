import React from 'react';
import {Img, interpolate, staticFile} from 'remotion';
import motion from '../scenes/hynix-motion.json';

const base='assets/characters/chaewon-base-v1.png';
const open='assets/characters/chaewon-mouth-open-v1.png';
const blink='assets/characters/chaewon-blink-v1.png';

export const TalkingCharacter:React.FC<{
  frame:number;x:number;y:number;width:number;scale?:number;rotate?:number;
}> = ({frame,x,y,width,scale=1,rotate=0}) => {
  const mouth=motion.mouthStates[Math.max(0,Math.min(motion.frames-1,Math.floor(frame)))];
  const amp=motion.amplitude[Math.max(0,Math.min(motion.frames-1,Math.floor(frame)))];
  const distance=Math.min(...motion.blinkCenters.map(c=>Math.abs(c-frame)));
  const blinkOpacity=interpolate(distance,[0,2,5],[1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const height=width*1199/1312;
  const common:React.CSSProperties={position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'fill'};
  // Source images keep identical dimensions. Only softly masked face regions are
  // overlaid, so generation differences never move the hair, neck or clothing.
  const mouthMask='radial-gradient(ellipse 6.2% 4.4% at 49.7% 37.5%, black 72%, transparent 100%)';
  const eyeMask='radial-gradient(ellipse 5.6% 3.8% at 43.8% 27.4%, black 62%, transparent 100%), radial-gradient(ellipse 5.5% 3.8% at 54.2% 26.4%, black 62%, transparent 100%)';
  return <div style={{position:'absolute',left:x,top:y,width,height,
    transform:`translateY(${Math.sin(frame/25)*1.5-amp*.8}px) rotate(${rotate+Math.sin(frame/47)*.22}deg) scale(${scale})`,
    transformOrigin:'50% 85%'}}>
    <Img src={staticFile(base)} style={common}/>
    <Img src={staticFile(open)} style={{...common,opacity:mouth>0?1:0,
      maskImage:mouthMask,WebkitMaskImage:mouthMask}}/>
    <Img src={staticFile(blink)} style={{...common,opacity:blinkOpacity,maskImage:eyeMask,WebkitMaskImage:eyeMask}}/>
  </div>;
};
