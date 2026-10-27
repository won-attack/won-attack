import React from 'react';
import {AbsoluteFill, Html5Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import samsung from '../scenes/samsung.json';
import hyundai from '../scenes/hyundai.json';
import samsungMotion from '../scenes/samsung-motion.json';
import hyundaiMotion from '../scenes/hyundai-motion.json';
import {AnimatedPresenter} from './AnimatedPresenter';

export type LandscapeKind='samsung'|'hyundai';
type Timeline=typeof samsung;
type Scene=Timeline['scenes'][number];
const navy='#11263c',cream='#f4f7f4',red='#e46b58';
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const p=(f:number,a=0,b=24)=>interpolate(f,[a,b],[0,1],clamp);
const titles={samsung:['삼성전자','3분기 영업이익','분기 매출 200조 돌파','내년 주가 두 배','지금 안 사면 늦어요','구독 · 알림'],
  hyundai:['현대차 보유자분들','1분기 영업이익 감소','2분기 영업 적자 전환','내년 이익 반토막','더 버티다가는 늦어요','지금 파세요']};

const Backdrop:React.FC<{src?:string;frame:number;dark?:boolean}>=({src='assets/backgrounds/studio-landscape-v1.png',frame,dark=false})=><>
  <Img src={staticFile(src)} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',transform:`scale(${1+frame*.00012})`}}/>
  <AbsoluteFill style={{background:dark?'linear-gradient(90deg,rgba(8,21,35,.88),rgba(8,21,35,.35))':'linear-gradient(90deg,rgba(245,248,245,.83),rgba(245,248,245,.16))'}}/>
</>;

const Title:React.FC<{tag:string;children:React.ReactNode;dark?:boolean;x?:number}>=({tag,children,dark=false,x=80})=><div style={{position:'absolute',left:x,top:139,maxWidth:1540}}>
  <div style={{fontSize:27,color:dark?'#b0cfda':'#4c6c7a',fontWeight:650,letterSpacing:1,marginBottom:16}}>{tag}</div>
  <div style={{fontSize:72,lineHeight:1.18,fontWeight:850,letterSpacing:-2.8,color:dark?'white':navy}}>{children}</div>
</div>;

const Actor:React.FC<{kind:LandscapeKind;frame:number;x?:number;y?:number;width?:number}>=({kind,frame,x=1050,y=126,width=900})=><AnimatedPresenter
  character={kind==='samsung'?'jeong':'chaewon'} motion={kind==='samsung'?samsungMotion:hyundaiMotion} frame={frame}
  x={x} y={y} width={width} scale={1+Math.sin(frame/83)*.004}/>;

const Pip:React.FC<{kind:LandscapeKind;frame:number;left?:boolean}>=({kind,frame,left=false})=><div style={{position:'absolute',left:left?80:1536,top:496,width:300,height:325,
  borderRadius:25,overflow:'hidden',background:'#e8efec',border:'3px solid #b4d6d0',boxShadow:'0 14px 40px #0003'}}>
  <Actor kind={kind} frame={frame} x={-107} y={-4} width={516}/>
  <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'10px 18px',background:navy,color:'white',fontSize:25,fontWeight:750}}>{kind==='samsung'?'정대리':'이채원'}</div>
</div>;

const Paper:React.FC<{children:React.ReactNode;x?:number;y?:number;w?:number;h?:number}>=({children,x=80,y=322,w=1050,h=470})=><div style={{position:'absolute',left:x,top:y,width:w,height:h,
  background:'rgba(255,255,255,.96)',borderRadius:30,padding:'38px 44px',boxShadow:'0 12px 50px #10273e14',border:'1px solid #e1e9e5'}}>{children}</div>;

const SamsungScenes:React.FC<{scene:Scene;f:number;global:number}>=({scene,f,global})=>{
  const i=scene.id;
  if(i===0)return <>
    <Backdrop frame={f}/>
    <Title tag="삼성전자 · 30초 실적 브리핑">영업이익 100조 시대</Title>
    <Paper><div style={{fontSize:30,color:'#56717d',fontWeight:700}}>한 분기 영업이익</div>
      <div style={{fontSize:167,color:navy,fontWeight:850,lineHeight:1.2,letterSpacing:-7,marginTop:17}}>100<span style={{fontSize:82,marginLeft:18}}>조 원</span></div>
      <div style={{marginTop:22,color:red,fontSize:36,fontWeight:750}}>삼성전자가 일냈습니다</div></Paper>
    <Actor kind="samsung" frame={global}/>
  </>;
  if(i===1){
    const graph=f>85;
    return <>
      <Backdrop src="assets/semiconductors/wafer-v1.png" frame={f} dark/>
      <Title tag="2026년 3분기 · 영업이익" dark>107조 원을 넘었습니다</Title>
      {!graph?<><div style={{position:'absolute',left:88,top:350,fontSize:196,lineHeight:1.1,fontWeight:850,color:'white',letterSpacing:-7}}>{Math.round(107*p(f,4,34))}<span style={{fontSize:95,marginLeft:24}}>조 원+</span></div>
        <div style={{position:'absolute',left:90,top:650,fontSize:27,color:'#bbdfeb'}}>실리콘 웨이퍼 · 연출용 일러스트</div></>:<>
        <div style={{position:'absolute',left:80,top:322,width:1300,height:475,borderRadius:30,background:'rgba(12,30,48,.93)',padding:35}}>
          <svg width="1210" height="400" viewBox="0 0 1210 400">
            <line x1="40" y1="345" x2="1170" y2="345" stroke="#6c879b" strokeWidth="3"/>
            <path d="M60 320 L300 285 L530 250 L760 170 L1020 75" fill="none" stroke="#fc9c85" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="1200" strokeDashoffset={1200*(1-p(f,85,125))}/>
            <circle cx="1020" cy="75" r="13" fill="#fc9c85" opacity={p(f,110,125)}/>
            <text x="1010" y="40" textAnchor="end" fontSize="42" fontWeight="800" fill="white">107조 원+</text>
            <text x="50" y="390" fontSize="25" fill="#abc7d2">영업이익 강조 그래픽</text>
          </svg>
        </div></>}
      <Pip kind="samsung" frame={global}/>
    </>;
  }
  if(i===2){
    const grow=p(f,5,52);
    return <><AbsoluteFill style={{background:navy}}/>
      <Title tag="2026년 3분기 · 분기 매출" dark>200조 원 돌파</Title>
      <svg width="1500" height="520" viewBox="0 0 1500 520" style={{position:'absolute',left:145,top:310}}>
        {[150,260,370].map(y=><line key={y} x1="50" y1={y} x2="1420" y2={y} stroke="#688696" opacity=".2" strokeWidth="2"/>)}
        <line x1="50" y1="430" x2="1420" y2="430" stroke="#799aaa" strokeWidth="3"/>
        <line x1="50" y1="145" x2="1420" y2="145" stroke="#ffc1b0" strokeWidth="3" strokeDasharray="12 12"/>
        <text x="50" y="117" fill="#ffc1b0" fontSize="30">200조 기준선</text>
        <rect x="850" y={430-350*grow} width="320" height={350*grow} rx="20" fill={red}/>
        <text x="1010" y={Math.max(48,405-350*grow)} textAnchor="middle" fontSize="58" fontWeight="800" fill="white">200조+</text>
        <text x="1010" y="492" textAnchor="middle" fontSize="31" fill="#c1d7df">3분기 매출</text>
      </svg></>;
  }
  if(i===3){
    const up=p(f,8,65);
    return <><AbsoluteFill style={{background:'#f4f1ec'}}/><Title tag="진행자의 내년 주가 전망">내년이면 주가 두 배</Title>
      <svg width="1360" height="515" viewBox="0 0 1360 515" style={{position:'absolute',left:100,top:302}}>
        <line x1="80" y1="430" x2="1300" y2="430" stroke="#c9d5d5" strokeWidth="3"/>
        <path d="M130 360 L390 310 L650 240 L920 110 L1150 50" fill="none" stroke={red} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1200" strokeDashoffset={1200*(1-up)}/>
        <path d="M1080 48 L1150 50 L1128 121" fill="none" stroke={red} strokeWidth="15" strokeLinecap="round" opacity={p(f,50,65)}/>
        <text x="950" y="345" fontSize="170" fontWeight="850" fill={navy}>2×</text>
        <text x="100" y="490" fontSize="30" fill="#506c78">현재</text><text x="1100" y="490" fontSize="30" fill="#506c78">내년</text>
      </svg><Pip kind="samsung" frame={global}/></>;
  }
  if(i===4)return <><Backdrop frame={f}/><Actor kind="samsung" frame={global} x={-20} y={122} width={920}/>
    <div style={{position:'absolute',left:870,top:245,color:navy,fontSize:104,fontWeight:850,lineHeight:1.22,letterSpacing:-4}}>지금 안 사면<br/><span style={{color:red}}>늦어요</span></div>
    <div style={{position:'absolute',left:877,top:594,fontSize:42,fontWeight:700,color:'#55717c'}}>나중에 후회하지 마세요.</div></>;
  return <><Backdrop frame={f}/><Title tag="주식왕 데이빗 · 다음 실적도 함께">구독하고 다음 소식도 받아보세요</Title>
    <Paper y={360} h={360}><div style={{fontSize:40,color:navy,fontWeight:750}}>다음 소식도 놓치지 않게</div>
      <div style={{display:'inline-block',marginTop:48,padding:'25px 65px',borderRadius:22,background:red,color:'white',fontSize:55,fontWeight:850,transform:`scale(${1+.025*Math.sin(f/12)})`}}>구독 · 알림</div></Paper>
    <Actor kind="samsung" frame={global}/></>;
};

const HyundaiScenes:React.FC<{scene:Scene;f:number;global:number}>=({scene,f,global})=>{
  const i=scene.id;
  if(i===0)return <><Backdrop src="assets/automotive/assembly-landscape-v1.png" frame={f} dark/>
    <Title tag="현대자동차 · 보유 점검" dark>현대차 보유자분들,<br/>주목하세요</Title>
    <div style={{position:'absolute',left:85,top:510,fontSize:40,color:'#ffb09c',fontWeight:750}}>실적 흐름을 짚어보겠습니다</div>
    <Actor kind="hyundai" frame={global}/></>;
  if(i===1){
    const graph=f>90;
    return <>
      <Backdrop src="assets/automotive/assembly-landscape-v1.png" frame={f} dark/>
      <Title tag="2026년 1분기 · 전년 동기 대비" dark>영업이익 30% 넘게 감소</Title>
      {!graph?<><div style={{position:'absolute',left:85,top:363,color:'#ffac96',fontSize:183,fontWeight:850,lineHeight:1}}>−30%<span style={{fontSize:100}}> ↓</span></div>
        <div style={{position:'absolute',left:89,top:637,fontSize:29,color:'#b9d0db'}}>자동차 생산 라인 · 연출용 일러스트</div></>:<div style={{position:'absolute',left:80,top:322,width:1310,height:485,background:'rgba(8,25,41,.94)',borderRadius:30}}>
        <svg width="1290" height="465" viewBox="0 0 1290 465">
          <line x1="70" y1="370" x2="1210" y2="370" stroke="#7794a6" strokeWidth="3"/>
          <rect x="230" y="65" width="235" height="305" rx="18" fill="#668494"/>
          <rect x="790" y={370-(305-105*p(f,90,135))} width="235" height={305-105*p(f,90,135)} rx="18" fill={red}/>
          <text x="345" y="426" textAnchor="middle" fontSize="30" fill="#c7dce3">전년 동기</text>
          <text x="910" y="426" textAnchor="middle" fontSize="30" fill="#c7dce3">2026년 1분기</text>
          <text x="910" y="137" textAnchor="middle" fontSize="45" fontWeight="800" fill="#ffb39e">30% 넘게 감소</text>
        </svg></div>}
      <Pip kind="hyundai" frame={global}/>
    </>;
  }
  if(i===2){
    const down=p(f,8,58);
    return <><AbsoluteFill style={{background:'#102238'}}/><Title tag="2026년 2분기 · 영업이익" dark>아예 적자로 돌아섰어요</Title>
      <svg width="1310" height="510" viewBox="0 0 1310 510" style={{position:'absolute',left:390,top:302}}>
        <line x1="80" y1="190" x2="1200" y2="190" stroke="#9bb9c8" strokeWidth="3"/>
        <text x="85" y="166" fill="#bed3dd" fontSize="30">손익 0 기준선</text>
        <rect x="710" y="190" width="280" height={250*down} rx="18" fill={red}/>
        <text x="850" y="110" textAnchor="middle" fontSize="86" fontWeight="850" fill="#ffac96">적자 전환</text>
      </svg><Pip kind="hyundai" frame={global} left/></>;
  }
  if(i===3){
    const half=1-.5*p(f,7,62);
    return <><AbsoluteFill style={{background:'#172b41'}}/><Title tag="진행자의 내년 실적 전망" dark>내년 이익이 반토막 납니다</Title>
      <svg width="1320" height="510" viewBox="0 0 1320 510" style={{position:'absolute',left:135,top:302}}>
        <line x1="70" y1="420" x2="1240" y2="420" stroke="#708e9f" strokeWidth="3"/>
        <rect x="205" y="70" width="240" height="350" rx="18" fill="#668999"/>
        <rect x="800" y={420-350*half} width="240" height={350*half} rx="18" fill={red}/>
        <text x="325" y="484" fill="#c0d5df" textAnchor="middle" fontSize="30">비교 기준</text>
        <text x="920" y="484" fill="#c0d5df" textAnchor="middle" fontSize="30">내년 전망</text>
        <text x="930" y="135" textAnchor="middle" fontSize="78" fontWeight="850" fill="#ffb49e">½</text>
      </svg><Pip kind="hyundai" frame={global}/></>;
  }
  if(i===4)return <><Backdrop frame={f} dark/><Actor kind="hyundai" frame={global} x={-20} y={122} width={930}/>
    <div style={{position:'absolute',left:880,top:256,fontSize:99,lineHeight:1.23,fontWeight:850,letterSpacing:-3,color:'white'}}>더 버티다가는<br/><span style={{color:'#ffad96'}}>늦어요</span></div>
    <div style={{position:'absolute',left:886,top:609,width:160,height:7,background:red,borderRadius:7}}/></>;
  return <><Backdrop src="assets/automotive/assembly-landscape-v1.png" frame={f} dark/>
    <Actor kind="hyundai" frame={global} x={-20} y={122} width={930}/>
    <div style={{position:'absolute',left:880,top:257,fontSize:99,lineHeight:1.23,fontWeight:850,letterSpacing:-3,color:'white'}}>보유자분들,<br/><span style={{color:'#ffad96'}}>지금 파세요</span></div>
    <div style={{position:'absolute',left:887,top:635,padding:'13px 27px',border:'2px solid #ffad96',borderRadius:16,color:'#ffb7a4',fontSize:31,fontWeight:750}}>지금 매도</div></>;
};

const SceneView:React.FC<{kind:LandscapeKind;scene:Scene}>=({kind,scene})=>{
  const f=useCurrentFrame(),global=scene.from+f;
  const active=scene.subtitles.find(s=>f>=s.from&&f<s.to)??(f<scene.subtitles[0].from?scene.subtitles[0]:scene.subtitles[scene.subtitles.length-1]);
  const dark=kind==='hyundai'?true:[1,2].includes(scene.id);
  return <AbsoluteFill>
    {kind==='samsung'?<SamsungScenes scene={scene} f={f} global={global}/>:<HyundaiScenes scene={scene} f={f} global={global}/>}
    <div style={{position:'absolute',left:80,top:50,color:dark?'#b6d8e3':navy,fontSize:25,fontWeight:800,letterSpacing:1}}>{kind==='samsung'?'주식왕 데이빗':'팩트폭격 주식'}<span style={{fontWeight:500,opacity:.7,marginLeft:20}}> / {kind==='samsung'?'정대리':'이채원'}</span></div>
    <div style={{position:'absolute',right:80,top:43,background:dark?'#19354a':'#fff',border:'1px solid #9fb9c5',borderRadius:24,color:dark?'#d2e5ed':navy,padding:'10px 21px',fontSize:23,fontWeight:750}}>가상 시연 · {String(scene.id+1).padStart(2,'0')} / 06</div>
    <div style={{position:'absolute',left:80,top:865,width:1760,height:133,borderRadius:24,background:'rgba(8,27,45,.97)',border:'1px solid #78989a50',padding:'17px 32px',boxShadow:'0 10px 40px #0003'}}>
      <div style={{height:99,display:'flex',justifyContent:'center',flexDirection:'column',fontSize:38,lineHeight:1.22,fontWeight:750,color:'white',letterSpacing:-.6}}>{active.lines.map((line,i)=><div key={i}>{line}</div>)}</div>
    </div>
  </AbsoluteFill>;
};

export const LandscapeVideo:React.FC<{kind:LandscapeKind}>=({kind})=>{
  const frame=useCurrentFrame();
  const timeline=kind==='samsung'?samsung:hyundai;
  const boundary=timeline.scenes.slice(1).map(s=>s.from).find(n=>frame>=n-4&&frame<n+7);
  return <AbsoluteFill style={{fontFamily:'"Apple SD Gothic Neo","Noto Sans KR",sans-serif',background:navy,overflow:'hidden'}}>
    {timeline.scenes.map(scene=><React.Fragment key={scene.id}>
      <Sequence from={scene.from} durationInFrames={scene.durationInFrames}><SceneView kind={kind} scene={scene}/></Sequence>
      <Sequence from={scene.from+scene.audioFrom} durationInFrames={Math.ceil(scene.audioSeconds*30)}><Html5Audio src={staticFile(scene.audio)}/></Sequence>
    </React.Fragment>)}
    {boundary!==undefined&&<div style={{position:'absolute',inset:0,background:kind==='samsung'?'#f6b09d':'#45677a',transform:`translateX(${interpolate(frame-boundary,[-4,7],[-1920,1920],clamp)}px)`}}/>}
    <div style={{position:'absolute',left:0,right:0,top:1007,bottom:0,background:navy}}/>
    <div style={{position:'absolute',left:82,top:1027,color:'#bad0dc',fontSize:22,fontWeight:600}}>시연용 가상 영상 · 실제 인물·채널과 무관 · AI 캐릭터·합성 음성 사용</div>
    <div style={{position:'absolute',right:82,top:1027,color:'#9fbcca',fontSize:22,fontWeight:600}}>30초 브리핑</div>
    <div style={{position:'absolute',left:80,right:80,top:1071,height:4,background:'#38556b'}}><div style={{height:'100%',background:red,width:`${(frame+1)/900*100}%`}}/></div>
  </AbsoluteFill>;
};
