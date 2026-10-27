import React from 'react';
import {AbsoluteFill, Html5Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import timeline from '../scenes/hynix.json';
import {TalkingCharacter} from './TalkingCharacter';

const navy='#11273e', teal='#12877e', mint='#8de7d2', white='#f7fbfa';
const font='"Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
type Scene=typeof timeline.scenes[number];
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const progress=(f:number,a=0,b=24)=>interpolate(f,[a,b],[0,1],clamp);

const FullImage:React.FC<{src:string;frame:number;fromScale?:number;toScale?:number;dark?:boolean}>=({src,frame,fromScale=1,toScale=1.07,dark=false})=><>
  <Img src={staticFile(src)} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',
    transform:`scale(${interpolate(frame,[0,300],[fromScale,toScale],clamp)})`,transformOrigin:'50% 60%'}}/>
  {dark&&<AbsoluteFill style={{background:'linear-gradient(180deg,rgba(3,16,34,.28),transparent 55%,rgba(3,16,34,.66))'}}/>}
</>;

const Heading:React.FC<{kicker:string;children:React.ReactNode;dark?:boolean}>=({kicker,children,dark=false})=><div style={{position:'absolute',left:66,top:216,right:64}}>
  <div style={{fontSize:30,fontWeight:650,letterSpacing:1,color:dark?'#91c6cf':'#466979',marginBottom:18}}>{kicker}</div>
  <div style={{fontSize:78,lineHeight:1.18,fontWeight:850,letterSpacing:-3,color:dark?white:navy}}>{children}</div>
</div>;

const PresenterPip:React.FC<{frame:number;side?:'left'|'right'}>=({frame,side='right'})=><div style={{position:'absolute',
  left:side==='right'?734:64,top:1092,width:282,height:346,borderRadius:28,overflow:'hidden',
  border:'3px solid rgba(222,247,239,.75)',background:'#e7f0ee',boxShadow:'0 14px 40px #02142340'}}>
  <TalkingCharacter frame={frame} x={-124} y={5} width={532}/>
  <div style={{position:'absolute',left:0,right:0,bottom:0,padding:'9px 16px',fontSize:24,fontWeight:750,
    color:'white',background:teal}}>이채원</div>
</div>;

const Intro:React.FC<{f:number;global:number}>=({f,global})=>{
  const entry=progress(f,0,17);
  return <>
    <FullImage src="assets/backgrounds/studio-bg-v1.png" frame={f}/>
    <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(244,248,247,.87),rgba(240,246,245,.2) 70%,#e8f1ef)'}}/>
    <Heading kicker="반도체 실적 · 30초 브리핑">SK하이닉스</Heading>
    <div style={{position:'absolute',left:70,top:424,fontSize:43,fontWeight:650,color:teal}}>숫자로 보겠습니다.</div>
    <div style={{position:'absolute',left:66,top:512,height:6,width:118+entry*110,borderRadius:6,background:teal}}/>
    <TalkingCharacter frame={global} x={-30+(1-entry)*100} y={562} width={1170} scale={1+f*.00018}/>
    <div style={{position:'absolute',left:66,top:1304,padding:'12px 23px',background:teal,borderRadius:15,color:'white',fontSize:30,fontWeight:750}}>이채원</div>
    <div style={{position:'absolute',right:68,top:590,background:'rgba(255,255,255,.92)',borderRadius:24,
      padding:'20px 24px',border:'1px solid #a4c9c4',color:navy,fontSize:28,lineHeight:1.5,fontWeight:700}}>2Q 실적부터<br/>3Q 소식까지</div>
  </>;
};

const ProfitScene:React.FC<{f:number;global:number}>=({f,global})=>{
  const graph=f>=132;
  if(!graph)return <>
    <FullImage src="assets/semiconductors/wafer-v1.png" frame={f} fromScale={1.02} toScale={1.13} dark/>
    <Heading kicker="2026년 2분기 · 영업이익" dark>얼마나 벌었나</Heading>
    <div style={{position:'absolute',left:64,top:434,fontSize:181,lineHeight:1,fontWeight:850,color:white,letterSpacing:-7}}>
      {Math.round(60*progress(f,5,38))}<span style={{fontSize:82,marginLeft:16}}>조 원+</span>
    </div>
    <div style={{position:'absolute',left:70,top:655,color:mint,fontSize:35,fontWeight:700}}>한 분기 영업이익</div>
    <div style={{position:'absolute',left:66,top:1342,color:'#c5dfeb',fontSize:25}}>실리콘 웨이퍼 · 연출용 일러스트</div>
    <PresenterPip frame={global}/>
  </>;
  const p=progress(f,132,165);
  return <>
    <AbsoluteFill style={{background:'#ecf4f1'}}/>
    <div style={{position:'absolute',inset:0,opacity:.26,backgroundImage:'linear-gradient(#b8d6cf 1px,transparent 1px),linear-gradient(90deg,#b8d6cf 1px,transparent 1px)',backgroundSize:'72px 72px'}}/>
    <Heading kicker="2026년 2분기 · 영업이익률">이익률에 주목</Heading>
    <div style={{position:'absolute',left:150,top:510,width:780,height:780}}>
      <svg width="780" height="780" viewBox="0 0 780 780">
        <circle cx="390" cy="390" r="307" fill="white" stroke="#d6e6e1" strokeWidth="54"/>
        <circle cx="390" cy="390" r="307" fill="none" stroke={teal} strokeWidth="54" strokeLinecap="round"
          strokeDasharray={`${1929*.76*p} 1929`} transform="rotate(-90 390 390)"/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <div style={{fontSize:168,lineHeight:1,fontWeight:850,letterSpacing:-7,color:navy}}>76<span style={{fontSize:82}}>%</span></div>
        <div style={{marginTop:32,fontSize:41,fontWeight:650,color:teal}}>영업이익률</div>
      </div>
    </div>
    <div style={{position:'absolute',left:68,top:1304,fontSize:36,fontWeight:750,color:navy,background:'white',padding:'17px 25px',borderRadius:20}}>영업이익 60조 원 이상</div>
  </>;
};

const RevenueScene:React.FC<{f:number}>=({f})=>{
  const graph=f>=33;
  if(!graph)return <>
    <FullImage src="assets/semiconductors/chip-v1.png" frame={f} fromScale={1} toScale={1.18}/>
    <Heading kicker="2026년 2분기 · 매출">매출도 보겠습니다</Heading>
    <div style={{position:'absolute',left:66,top:1300,color:'white',background:'rgba(9,30,46,.86)',borderRadius:15,padding:'14px 20px',fontSize:25}}>반도체 칩 · 연출용 일러스트</div>
  </>;
  const p=progress(f,33,69);
  return <>
    <AbsoluteFill style={{background:navy}}/>
    <div style={{position:'absolute',right:-100,top:160,width:780,height:780,opacity:.12,borderRadius:'50%',background:'radial-gradient(circle,#47ceb5,transparent 70%)'}}/>
    <Heading kicker="2026년 2분기 · 분기 매출" dark>80조 원 돌파</Heading>
    <div style={{position:'absolute',left:66,top:455,color:mint,fontSize:28,fontWeight:650}}>매출 막대 그래프</div>
    <svg width="952" height="720" viewBox="0 0 952 720" style={{position:'absolute',left:64,top:545,overflow:'visible'}}>
      {[140,280,420,560].map(y=><line key={y} x1="26" y1={y} x2="928" y2={y} stroke="#d8ede9" opacity=".12" strokeWidth="2"/>)}
      <line x1="26" y1="620" x2="928" y2="620" stroke="#72989f" strokeWidth="3"/>
      <line x1="26" y1="190" x2="928" y2="190" stroke={mint} strokeWidth="3" strokeDasharray="12 12"/>
      <text x="26" y="165" fill={mint} fontSize="31">80조 기준선</text>
      <rect x="470" y={620-505*p} width="260" height={505*p} rx="20" fill={mint}/>
      <text x="600" y="686" fill="white" fontSize="37" textAnchor="middle">2분기 매출</text>
      <text x="600" y={Math.max(60,596-505*p)} fill="white" fontSize="58" fontWeight="800" textAnchor="middle">80조+</text>
    </svg>
    <div style={{position:'absolute',left:66,top:1305,color:'#a5c9cd',fontSize:27}}>2분기 매출 · 80조 원 돌파</div>
  </>;
};

const HbmScene:React.FC<{f:number;global:number}>=({f,global})=>{
  const p=progress(f,127,135);
  return <>
    <FullImage src="assets/semiconductors/hbm-v1.png" frame={f} fromScale={1} toScale={1.09} dark/>
    <Heading kicker="2026년 3분기 · 영업이익" dark>그리고, 3분기 소식</Heading>
    <div style={{position:'absolute',left:64,top:439,fontSize:183,lineHeight:1,fontWeight:850,color:'white',letterSpacing:-7}}>77<span style={{fontSize:86,marginLeft:16}}>조 원</span></div>
    <div style={{position:'absolute',right:70,top:682,padding:'9px 31px',border:'9px solid #f59b89',borderRadius:16,color:'#ffb4a6',
      background:'rgba(20,33,50,.88)',fontSize:75,fontWeight:900,opacity:p,
      transform:`rotate(-11deg) scale(${interpolate(p,[0,1],[1.5,1])})`}}>확정</div>
    <PresenterPip frame={global} side="left"/>
    <div style={{position:'absolute',right:65,top:1360,color:'#bdd8e5',fontSize:24}}>HBM 적층 메모리 · 개념 이미지</div>
  </>;
};

const Ending:React.FC<{f:number;global:number}>=({f,global})=><>
  <FullImage src="assets/backgrounds/studio-bg-v1.png" frame={f} fromScale={1.03} toScale={1.08}/>
  <AbsoluteFill style={{background:'linear-gradient(90deg,rgba(237,246,243,.77),rgba(237,246,243,.5) 58%,rgba(17,39,62,.95) 58%)'}}/>
  <Heading kicker="보유하신 분들도">지금은<br/>비중을 늘릴 때</Heading>
  <TalkingCharacter frame={global} x={-181} y={586} width={1190} scale={1+f*.00028}/>
  <div style={{position:'absolute',left:67,top:1320,color:'white',fontSize:30,fontWeight:750,background:teal,padding:'13px 25px',borderRadius:16}}>이채원</div>
  <div style={{position:'absolute',right:62,top:918,color:mint,fontSize:172,fontWeight:500,lineHeight:1,
    transform:`translateY(${-progress(f,6,35)*35}px)`}}>↗</div>
  <div style={{position:'absolute',right:61,top:1110,color:'white',fontSize:36,lineHeight:1.5,fontWeight:750}}>보유자도<br/>비중 확대</div>
</>;

const SceneView:React.FC<{scene:Scene}>=({scene})=>{
  const f=useCurrentFrame(), global=scene.from+f;
  const dark=scene.id===1?f<132:scene.id===2?f>=33:scene.id===3;
  const active=scene.subtitles.find(s=>f>=s.from&&f<s.to)??(f<scene.subtitles[0].from?scene.subtitles[0]:scene.subtitles[scene.subtitles.length-1]);
  // Short local panel wipes at the two image-to-graph cuts.
  const internal=scene.id===1?132:scene.id===2?33:-100;
  const wipe=f-internal;
  return <AbsoluteFill>
    {scene.id===0&&<Intro f={f} global={global}/>}
    {scene.id===1&&<ProfitScene f={f} global={global}/>}
    {scene.id===2&&<RevenueScene f={f}/>}
    {scene.id===3&&<HbmScene f={f} global={global}/>}
    {scene.id===4&&<Ending f={f} global={global}/>}
    <div style={{position:'absolute',left:64,top:107,color:dark?mint:teal,fontSize:25,fontWeight:800,letterSpacing:1}}>실적으로 말하는 주식</div>
    <div style={{position:'absolute',right:64,top:98,borderRadius:24,padding:'10px 21px',fontSize:24,fontWeight:750,
      background:dark?'rgba(236,249,246,.1)':'rgba(255,255,255,.88)',border:`1px solid ${dark?'#63808c':'#acc6c8'}`,color:dark?'#d8eceb':navy}}>가상 시연</div>
    <div style={{position:'absolute',right:66,top:216,color:dark?'white':navy,fontSize:25,fontWeight:750,
      background:dark?'rgba(11,31,49,.82)':'rgba(255,255,255,.94)',borderRadius:13,padding:'8px 14px'}}>{String(scene.id+1).padStart(2,'0')} / 05</div>
    {wipe>=-4&&wipe<7&&<div style={{position:'absolute',top:0,bottom:0,left:0,width:1080,background:teal,
      transform:`translateX(${interpolate(wipe,[-4,7],[-1080,1080],clamp)}px)`}}/>}
    <div style={{position:'absolute',left:64,top:1477,width:952,height:241,padding:'24px 36px',borderRadius:27,
      background:'rgba(9,29,47,.97)',border:'1px solid rgba(180,221,214,.18)',boxShadow:'0 14px 40px #02142335'}}>
      <div style={{fontSize:24,color:'#9bd1c6',fontWeight:700,letterSpacing:.5}}>이채원 · 실적으로 말하는 주식</div>
      <div style={{height:157,display:'flex',flexDirection:'column',justifyContent:'center',fontSize:48,lineHeight:1.43,fontWeight:760,
        letterSpacing:-1.2,color:'white'}}>{active.lines.map((s,i)=><div key={i}>{s}</div>)}</div>
    </div>
  </AbsoluteFill>;
};

export const HynixVideo:React.FC=()=>{
  const f=useCurrentFrame();
  const boundary=timeline.scenes.slice(1).map(s=>s.from).find(n=>f>=n-4&&f<n+7);
  return <AbsoluteFill style={{fontFamily:font,background:navy,overflow:'hidden'}}>
    {timeline.scenes.map(scene=><React.Fragment key={scene.id}>
      <Sequence from={scene.from} durationInFrames={scene.durationInFrames}><SceneView scene={scene}/></Sequence>
      <Sequence from={scene.from+scene.audioFrom} durationInFrames={Math.ceil(scene.audioSeconds*timeline.fps)}>
        <Html5Audio src={staticFile(scene.audio)} volume={1}/>
      </Sequence>
    </React.Fragment>)}
    {boundary!==undefined&&<div style={{position:'absolute',inset:0,background:'#d8efe7',
      transform:`translateX(${interpolate(f-boundary,[-4,7],[-1080,1080],clamp)}px)`}}/>}
    <div style={{position:'absolute',left:0,right:0,top:1735,bottom:0,background:navy}}/>
    <div style={{position:'absolute',left:66,top:1753,fontSize:25,color:'#b9cfd6',lineHeight:1.5,fontWeight:600}}>
      시연용 가상 영상 · 실제 인물·채널과 무관<br/>AI 캐릭터 · 합성 음성 사용
    </div>
    <div style={{position:'absolute',left:64,right:64,top:1850,height:5,background:'#375264',borderRadius:4}}>
      <div style={{height:'100%',width:`${(f+1)/timeline.durationInFrames*100}%`,background:mint,borderRadius:4}}/>
    </div>
  </AbsoluteFill>;
};
