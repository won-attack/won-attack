import {useEffect, useRef, useState} from 'react';
import './mts-reference.css';
import {AlertCircle, ArrowLeft, ArrowUpRight, BarChart3, Bell, Bookmark, BookmarkCheck, Captions, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, Copy, Download, ExternalLink, Heart, HelpCircle, Home, Link2, Mail, Maximize, Menu, MessageCircle, Mic, MoreHorizontal, Pause, Play, Plus, RefreshCw, RotateCcw, Search, Share2, ShieldCheck, Settings, Sparkles, SquarePen, ThumbsDown, ThumbsUp, TrendingUp, VolumeX, Wallet, X, XCircle} from 'lucide-react';

type Status = 'SUPPORTED'|'CONTRADICTED'|'INSUFFICIENT_EVIDENCE'|'PREDICTION';
type ClaimType = 'FINANCIAL'|'DISCLOSURE'|'PREDICTION';
type Source = {document_id:string;title:string;period:string;source_url:string};
type Verification = {claim_id:string;claim:string;claim_type:ClaimType;status:Status;reason:string;sources:Source[]};
type Analysis = {video:{video_id:string;title:string;url:string};verification_results:Verification[];personalized_analysis:{summary:string;risk_factors:string[]};analyzed_at:string};
type SavedReport = {id:string;userId:string;userLabel:string;savedAt:string;report:Analysis};
type Page = 'browse'|'shorts'|'youtube'|'real-video'|'link'|'loading'|'results'|'stock'|'mts-home'|'watchlist'|'assets'|'all'|'archive';
type DemoVideo = {id:string;title:string;channel:string;company:string;theme:'samsung'|'hynix'|'hyundai';eyebrow:string;headline:string;duration:string;views:string;published:string};
type DemoShort = {video:DemoVideo;title:string;channel:string;caption:string;likes:string;comments:string};
const videos:DemoVideo[]=[
  {id:'WCdemoS1V01',title:'삼성전자 영업이익 100조 시대, 지금 안 사면 늦습니다',channel:'주식왕 데이빗(가상)',company:'삼성전자',theme:'samsung',eyebrow:'3분기 영업이익 107조?',headline:'지금 안 사면 늦습니다',duration:'0:30',views:'18만',published:'2주 전'},
  {id:'WCdemoS2V02',title:'SK하이닉스 3분기 77조 확정! 지금 비중 늘리세요',channel:'실적으로 말하는 주식(가상)',company:'SK하이닉스',theme:'hynix',eyebrow:'3분기 77조 확정?',headline:'지금 비중 늘리세요',duration:'0:30',views:'26만',published:'6일 전'},
  {id:'WCdemoS3V03',title:'현대차 관세 직격탄, 보유자는 지금 파세요',channel:'팩트폭격 주식(가상)',company:'현대자동차',theme:'hyundai',eyebrow:'관세 직격탄?',headline:'보유자는 지금 파세요',duration:'0:30',views:'11만',published:'2개월 전'},
];
const REAL_VIDEO_ID='48WVf1ijerc';
const realVideo:DemoVideo={id:REAL_VIDEO_ID,title:'공유한 유튜브 영상',channel:'YouTube',company:'삼성전자',theme:'samsung',eyebrow:'실제 유튜브 영상',headline:'공식 자료로 확인하기',duration:'1:57',views:'',published:''};
const demoShorts:DemoShort[]=[
  {video:videos[1],title:'SK하이닉스 3분기 실적, 77조 확정?',channel:'반도체 브리핑(가상)',caption:'영상 속 투자 주장을 공식 자료와 함께 확인해요.',likes:'2.4천',comments:'208'},
];
const videoFiles:Record<string,string>={
  WCdemoS1V01:new URL('../../video/out/samsung-30s-landscape-v1.mp4',import.meta.url).href,
  WCdemoS2V02:new URL('../../video/out/hynix-30s-v2.mp4',import.meta.url).href,
  WCdemoS3V03:new URL('../../video/out/hyundai-30s-landscape-v1.mp4',import.meta.url).href,
};
const videoThumbnailFiles:Record<string,string>={
  WCdemoS1V01:new URL('../../video/out/samsung-30s-landscape-v1.png',import.meta.url).href,
  WCdemoS2V02:new URL('../../video/out/hynix-30s-v2.png',import.meta.url).href,
  WCdemoS3V03:new URL('../../video/out/hyundai-30s-landscape-v1.png',import.meta.url).href,
};
const videoSrc=(video:DemoVideo)=>videoFiles[video.id]??'';
const videoThumbnailSrc=(video:DemoVideo)=>videoThumbnailFiles[video.id]??'';
const videoUrl=(video:DemoVideo)=>`https://www.youtube.com/watch?v=${video.id}`;
const displayVideoTitle=(id:string,title:string)=>id===REAL_VIDEO_ID?'공유한 유튜브 영상':title;
async function copyToClipboard(value:string){
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return true}}catch{}
  let input:HTMLTextAreaElement|null=null;
  try{
    input=document.createElement('textarea');
    input.value=value;input.style.position='fixed';input.style.left='-9999px';
    document.body.appendChild(input);input.select();
    return document.execCommand('copy');
  }catch{return false}finally{input?.remove()}
}
function youtubeVideoId(raw:string):string|null{
  const match=raw.trim().match(/https?:\/\/[^\s]+/);
  try{
    const url=new URL((match?.[0]??raw.trim()).replace(/[),.]+$/,''));
    const host=url.hostname.toLowerCase();
    const id=host==='youtu.be'?url.pathname.slice(1):['youtube.com','www.youtube.com','m.youtube.com'].includes(host)?url.searchParams.get('v'):null;
    return id&&/^[a-zA-Z0-9_-]{11}$/.test(id)?id:null;
  }catch{return null}
}
function incomingVideoUrl(){
  const params=new URLSearchParams(window.location.search);
  for(const key of ['video_url','url','text']){const value=params.get(key);if(value&&youtubeVideoId(value))return value}
  return '';
}
const profiles=[
  {id:'demo_user_01',label:'박서연 님',detail:'공격투자형',allocation:'반도체 비중 80%',level:'주의',holdings:{samsung:45,hynix:35,hyundai:0}},
  {id:'demo_user_02',label:'김도현 님',detail:'적극투자형',allocation:'SK하이닉스 비중 10%',level:'보통',holdings:{samsung:0,hynix:10,hyundai:15}},
  {id:'demo_user_03',label:'이도윤 님',detail:'위험중립형',allocation:'SK하이닉스 비중 15%',level:'보통',holdings:{samsung:0,hynix:15,hyundai:0}},
  {id:'demo_user_04',label:'한지은 님',detail:'안정추구형',allocation:'현대자동차 비중 25%',level:'주의',holdings:{samsung:0,hynix:0,hyundai:25}},
  {id:'demo_user_05',label:'정영호 님',detail:'안정형',allocation:'주식 보유 없음',level:'보통',holdings:{samsung:0,hynix:0,hyundai:0}},
];
const SAVED_REPORTS_KEY='won-check:saved-reports:v1';
function readSavedReports():SavedReport[]{
  try{const stored=localStorage.getItem(SAVED_REPORTS_KEY);if(!stored)return[];const parsed:unknown=JSON.parse(stored);return Array.isArray(parsed)?parsed as SavedReport[]:[]}
  catch{return[]}
}
const source=(document_id:string,title:string,period:string,source_url:string):Source=>({document_id,title,period,source_url});
const samsungSource=source('samsung_024','삼성전자 2026년 3분기 잠정실적 발표','2026-Q3','https://news.samsungsemiconductor.com/kr/?p=37675');
const hynixSource=source('hynix_005','SK하이닉스 2026년 2분기 잠정실적 공시','2026-Q2','https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260729800013');
const hynixNotice=source('hynix_008','SK하이닉스 3분기 경영실적 발표 안내공시','2026-Q3','https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20261014800385');
const hyundaiQ1=source('hyundai_004','현대자동차 2026년 1분기 경영실적 발표','2026-Q1','https://www.hyundaimotorgroup.com/ko/news/hyundai-motor-company-2026-first-quarter-earnings');
const hyundaiQ2=source('hyundai_006','현대자동차 2026년 2분기 경영실적 발표','2026-Q2','https://www.hyundaimotorgroup.com/ko/news/hyundai-motor-company-2026-q2-earnings');
const demoClaims:Record<string,Verification[]>={
  WCdemoS1V01:[
    {claim_id:'claim_001',claim:'삼성전자의 2026년 3분기 영업이익은 107조 원을 넘었다.',claim_type:'FINANCIAL',status:'SUPPORTED',reason:'공식 잠정실적의 영업이익 약 107.4조 원과 일치합니다. 결산 전 잠정치입니다.',sources:[samsungSource]},
    {claim_id:'claim_002',claim:'삼성전자의 2026년 3분기 매출은 200조 원을 돌파했다.',claim_type:'FINANCIAL',status:'CONTRADICTED',reason:'공식 잠정실적의 매출은 약 195조 원으로 200조 원에 미치지 않습니다.',sources:[samsungSource]},
    {claim_id:'claim_003',claim:'삼성전자 주가는 내년에 두 배가 될 것이다.',claim_type:'PREDICTION',status:'PREDICTION',reason:'미래 주가 전망은 현재 공식 자료로 사실 여부를 확정할 수 없습니다.',sources:[]},
  ],
  WCdemoS2V02:[
    {claim_id:'claim_001',claim:'SK하이닉스의 2026년 2분기 영업이익은 60조 원을 넘었고 영업이익률은 76%다.',claim_type:'FINANCIAL',status:'SUPPORTED',reason:'발표된 2분기 영업이익은 약 60.5조 원, 영업이익률은 76.3%입니다.',sources:[hynixSource]},
    {claim_id:'claim_002',claim:'SK하이닉스의 2026년 2분기 매출은 80조 원을 돌파했다.',claim_type:'FINANCIAL',status:'CONTRADICTED',reason:'2분기 매출은 약 79.3조 원으로 80조 원에 미치지 않습니다.',sources:[hynixSource]},
    {claim_id:'claim_003',claim:'SK하이닉스의 2026년 3분기 영업이익 77조 원이 확정됐다.',claim_type:'FINANCIAL',status:'INSUFFICIENT_EVIDENCE',reason:'영상 게시일에는 3분기 실적이 아직 발표되지 않아 확정 수치를 확인할 수 없습니다.',sources:[hynixNotice]},
  ],
  WCdemoS3V03:[
    {claim_id:'claim_001',claim:'현대자동차의 2026년 1분기 영업이익은 전년 동기보다 30% 넘게 줄었다.',claim_type:'FINANCIAL',status:'SUPPORTED',reason:'공식 발표에 따르면 1분기 영업이익은 전년 동기 대비 30.8% 감소했습니다.',sources:[hyundaiQ1]},
    {claim_id:'claim_002',claim:'현대자동차는 2026년 2분기에 영업 적자를 냈다.',claim_type:'FINANCIAL',status:'CONTRADICTED',reason:'2분기 영업이익은 약 2.85조 원으로 흑자입니다.',sources:[hyundaiQ2]},
    {claim_id:'claim_003',claim:'현대자동차의 내년 이익은 반토막 날 것이다.',claim_type:'PREDICTION',status:'PREDICTION',reason:'미래 이익에 대한 전망으로, 현재 자료만으로 확정할 수 없습니다.',sources:[]},
  ],
};
function sample(video:DemoVideo,id:string):Analysis{
  const profile=profiles.find(item=>item.id===id)??profiles[2];
  const holding=profile.holdings[video.theme];
  const fallback={summary:holding>0
    ?`${profile.label}은 현재 ${video.company}를 포트폴리오의 ${holding}% 보유하고 있습니다. 영상의 사실 판정과 보유 비중을 함께 살펴보세요.`
    :`${profile.label}은 현재 ${video.company}를 보유하지 않습니다. 영상의 사실 판정과 투자 성향을 함께 살펴보세요.`,
    risk_factors:[holding>0?`${video.company} 보유 비중 ${holding}%`:`${video.company} 신규 투자 검토`,profile.allocation,'영상 속 과장되거나 미확정인 주장에 유의']};
  const personalized_analysis=video.id==='WCdemoS1V01'&&id==='demo_user_03'
    ?{summary:'삼성전자는 아직 보유하지 않았지만 SK하이닉스를 보유하고 있어 신규 매수 시 반도체 업종 비중이 커집니다.',risk_factors:['반도체 업종 집중도 증가','3분기 수치는 잠정 실적','영상의 매출 주장 불일치']}
    :video.id==='WCdemoS2V02'&&(id==='demo_user_01'||id==='demo_user_02')
      ?id==='demo_user_01'
        ?{summary:'반도체 비중이 이미 80%입니다. 추가 매수 전 집중 위험과 미발표 3분기 실적을 함께 살펴보세요.',risk_factors:['반도체 비중 80%','3분기 실적 미발표','영상의 매출 주장 불일치']}
        :{summary:'SK하이닉스 비중은 10%입니다. 영상의 과장된 매출 주장과 미확정 3분기 실적을 확인하세요.',risk_factors:['2분기 매출 주장 불일치','3분기 실적 미발표']}
      :video.id==='WCdemoS3V03'&&id==='demo_user_04'
        ?{summary:'현대자동차를 보유하고 있습니다. 2분기 적자라는 주장은 공식 실적과 다르므로 사실을 확인한 뒤 판단하세요.',risk_factors:['현대자동차 비중 25%','2분기 적자 주장 불일치','내년 이익 전망은 미확정']}
        :video.id==='WCdemoS3V03'&&id==='demo_user_05'
          ?{summary:'현재 주식 보유가 없는 안정형 투자자입니다. 영상의 단정적 전망보다 공식 실적과 투자 성향을 먼저 살펴보세요.',risk_factors:['2분기 적자 주장 불일치','미래 이익 전망은 미확정']}
          :fallback;
  return {video:{video_id:video.id,title:video.title,url:videoUrl(video)},verification_results:demoClaims[video.id],personalized_analysis,analyzed_at:new Date().toISOString()};
}
const USE_MOCK=import.meta.env.VITE_USE_MOCK!=='false';
async function analyze(video:DemoVideo,user_id:string):Promise<Analysis>{
  if(USE_MOCK&&video.id!==REAL_VIDEO_ID){await new Promise(resolve=>setTimeout(resolve,4000));return sample(video,user_id)}
  const video_url=videoUrl(video);
  const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({video_url,user_id})});
  const data=await response.json();
  if(!response.ok)throw new Error(data?.error?.message||'분석에 실패했습니다. 다시 시도해 주세요.');
  return {...data,video:{...data.video,video_id:data.video?.video_id??data.video?.videoId??video.id}} as Analysis;
}
const statusMap={
  SUPPORTED:{label:'근거 확인',short:'확인',icon:CheckCircle2,tone:'supported'},
  CONTRADICTED:{label:'근거와 불일치',short:'불일치',icon:XCircle,tone:'contradicted'},
  INSUFFICIENT_EVIDENCE:{label:'근거 부족',short:'확인 필요',icon:HelpCircle,tone:'insufficient'},
  PREDICTION:{label:'미래 예측',short:'예측',icon:TrendingUp,tone:'prediction'},
} satisfies Record<Status,{label:string;short:string;icon:typeof CheckCircle2;tone:string}>;

function DemoControls({user,busy,onSelect}:{user:string;busy:boolean;onSelect:(id:string)=>void}){
  const [showAll,setShowAll]=useState(false);
  const renderProfile=(profile:typeof profiles[number])=><button type="button" key={profile.id} className={user===profile.id?'selected':''} aria-pressed={user===profile.id} disabled={busy} onClick={()=>onSelect(profile.id)}><span className="demo-account-radio" aria-hidden="true"/><span className="demo-account-text"><strong>{profile.label}</strong><small>{profile.detail} · {profile.allocation}</small></span></button>;
  return <aside className="demo-controls" aria-label="시연 계정 선택"><div id="demo-account-menu" className="demo-controls-menu"><span className="demo-controls-subtitle">같은 영상, 다른 리포트</span><strong className="demo-controls-title">계정 선택</strong><div className="demo-account-note"><strong>투자 성향 + 보유 종목</strong><span>분석 관점과 투자 인사이트가 달라져요</span><b>계정을 바꿔 리포트를 비교해 보세요 <ChevronDown size={14}/></b></div><div className="demo-account-list">{profiles.slice(0,2).map(renderProfile)}</div><button type="button" className="demo-account-toggle" aria-expanded={showAll} disabled={busy} onClick={()=>setShowAll(value=>!value)}>{showAll?'접기':'다른 계정 더 보기'}<ChevronDown size={15} className={showAll?'expanded':''}/></button>{showAll&&<div className="demo-account-list">{profiles.slice(2).map(renderProfile)}</div>}</div></aside>;
}function DesktopIntro({user,busy,onSelect,onOpenLink,onOpenMock}:{user:string;busy:boolean;onSelect:(id:string)=>void;onOpenLink:()=>void;onOpenMock:()=>void}){
  return <section className="desktop-intro" aria-label="WON ATTACK 소개">
    <div className="desktop-logo" aria-label="WON ATTACK"><span>WON <strong>ATTACK</strong></span></div>
    <div className="desktop-intro-copy"><span className="desktop-eyebrow">보는 투자, 확인하는 투자</span><p>영상 속 투자 주장을 공식 자료로 확인하고, 내 투자 성향에 맞는 해석까지 한 번에.</p></div>
    <DemoControls user={user} busy={busy} onSelect={onSelect}/><div className="desktop-intro-actions"><button className="desktop-real-link-cta" type="button" onClick={onOpenLink}><span className="desktop-real-link-icon"><Link2 size={23}/></span><span className="desktop-real-link-copy"><small className="desktop-real-link-kicker">LIVE DEMO</small><strong>실제 링크로 분석해보기</strong><small>유튜브 주소를 붙여넣어 시작</small></span><span className="desktop-real-link-arrow"><ArrowUpRight size={20}/></span></button><button className="desktop-real-link-cta desktop-mock-link-cta" type="button" onClick={onOpenMock}><span className="desktop-real-link-icon"><Play size={22}/></span><span className="desktop-real-link-copy"><small className="desktop-real-link-kicker">MOCK DEMO</small><strong>가상 영상으로 비교해보기</strong><small>처음 시연 영상 목록으로 이동</small></span><span className="desktop-real-link-arrow"><ArrowUpRight size={20}/></span></button></div>
  </section>;
}
function DesktopFlow(){
  const steps=[
    {icon:Play,title:'영상 선택',description:'관심 있는 투자 영상을 선택해요.'},
    {icon:Share2,title:'공유하기',description:'영상의 공유 버튼에서 WON MTS를 열어요.'},
    {icon:ShieldCheck,title:'공식 근거 확인',description:'영상 속 주장을 공시와 공식 자료로 검증해요.'},
    {icon:BarChart3,title:'내 투자 관점',description:'선택한 계정의 투자 성향에 맞춰 살펴봐요.'},
    {icon:Search,title:'종목 상세 보기',description:'WON MTS에서 종목 상세 정보를 살펴봐요.'},
  ];
  return <aside className="desktop-flow" aria-label="WON ATTACK 이용 흐름"><div className="desktop-flow-card"><span className="desktop-flow-kicker">HOW IT WORKS</span><h2>WON ATTACK 이용 흐름</h2><ol>{steps.map(({icon:Icon,title,description},index)=><li key={title}><span className="desktop-step-number">{String(index+1).padStart(2,'0')}</span><div className="desktop-step-body"><span className="desktop-step-icon">{index===0?<span className="desktop-youtube-mark" aria-hidden="true"><Play size={20} fill="currentColor" strokeWidth={0}/></span>:<Icon size={27} strokeWidth={2.2}/>}</span><div><strong>{title}</strong><p>{description}</p></div></div></li>)}</ol></div><p className="desktop-flow-footer">선택하고, 확인하고, 나에게 맞게 이해하세요.</p></aside>;
}
function VideoThumbnail({video}:{video:DemoVideo}){
  if(video.id===REAL_VIDEO_ID)return <div className="demo-thumbnail demo-thumbnail--real" aria-hidden="true"><span className="real-thumbnail-play"><Play size={24} fill="currentColor" strokeWidth={0}/></span></div>;
  return <div className={`demo-thumbnail demo-thumbnail--${video.theme}`} aria-hidden="true">
    <img src={videoThumbnailSrc(video)} alt="" loading="lazy"/>
    <span className="demo-thumbnail-duration">{video.duration}</span>
  </div>;
}
function DemoBottomNav({active,onHome,onShorts,dark=false}:{active:'home'|'shorts';onHome:()=>void;onShorts:()=>void;dark?:boolean}){
  return <nav className={`browse-bottom ${dark?'shorts-bottom':''}`} aria-label="시연용 탐색 메뉴"><button type="button" className={active==='home'?'active':''} aria-current={active==='home'?'page':undefined} onClick={onHome}><Home size={25} fill="currentColor"/>홈</button><button type="button" className={active==='shorts'?'active':''} aria-current={active==='shorts'?'page':undefined} onClick={onShorts}><Play size={25}/>Shorts</button><button type="button" className="browse-add" aria-label="만들기"><Plus size={31}/></button><button type="button"><Captions size={25}/>구독</button><button type="button"><span className="browse-profile">W</span>내 페이지</button></nav>;
}
function BrowseScreen({onSelect,onShorts,onOpenLink,onAnalyzeReal}:{onSelect:(video:DemoVideo)=>void;onShorts:()=>void;onOpenLink:()=>void;onAnalyzeReal:()=>void}){
  const [filter,setFilter]=useState('전체');
  const [linkValue,setLinkValue]=useState('');
  const [linkError,setLinkError]=useState('');
  const visibleVideos=filter==='전체'?videos:videos.filter(video=>video.company===filter);
  function submitLink(event:React.FormEvent){
    event.preventDefault();
    const id=youtubeVideoId(linkValue);
    if(!id){setLinkError('올바른 유튜브 영상 주소를 입력해 주세요.');return}
    if(id!==REAL_VIDEO_ID){setLinkError('현재 시연에는 등록된 예시 링크만 분석할 수 있어요.');return}
    setLinkError('');onAnalyzeReal();
  }
  return <div className="browse-shell screen-enter">
    <header className="browse-header"><div className="browse-search-row"><ArrowLeft size={28}/><div className="browse-search"><span>주식</span><X size={24}/></div><span className="browse-mic"><Mic size={24}/></span><MoreHorizontal size={25}/></div>
      <div className="browse-filters" aria-label="영상 필터">{['전체','삼성전자','SK하이닉스','현대자동차'].map(item=><button type="button" key={item} className={filter===item?'active':''} aria-pressed={filter===item} onClick={()=>setFilter(item)}>{item}</button>)}</div></header>
    <main className="browse-list" aria-label="시연 영상 목록">{visibleVideos.map(video=><button type="button" className="browse-video" key={video.id} onClick={()=>onSelect(video)} aria-label={`${video.title} 영상 선택`}><VideoThumbnail video={video}/><div className="browse-video-info"><span className={`browse-avatar browse-avatar--${video.theme}`}>{video.company.slice(0,1)}</span><div><strong>{video.title}</strong><span>{video.channel} · 조회수 {video.views}회 · {video.published}</span></div><MoreHorizontal size={23}/></div></button>)}</main>
    <DemoBottomNav active="home" onHome={()=>{}} onShorts={onShorts}/>
  </div>;
}
function LinkScreen({initialUrl,onOpen}:{initialUrl:string;onOpen:()=>void}){
  const [value,setValue]=useState(initialUrl);
  const [message,setMessage]=useState('');
  const [copyStatus,setCopyStatus]=useState('');
  const inputRef=useRef<HTMLInputElement>(null);
  async function paste(){
    try{setValue(await navigator.clipboard.readText());setMessage('');inputRef.current?.focus()}
    catch{setMessage('클립보드 접근이 허용되지 않았어요. 주소를 입력칸에 직접 붙여넣어 주세요.');inputRef.current?.focus()}
  }
  async function copyExample(){setCopyStatus(await copyToClipboard(videoUrl(realVideo))?'링크를 복사했어요. 위 입력칸에 붙여넣어 보세요.':'복사하지 못했어요. 표시된 주소를 직접 복사해 주세요.')}
  function submit(event:React.FormEvent){
    event.preventDefault();
    const id=youtubeVideoId(value);
    if(!id){setMessage('올바른 유튜브 영상 주소를 입력해 주세요.');return}
    if(id!==REAL_VIDEO_ID){setMessage('현재 실제 분석 시연에 등록된 영상은 아래 예시 링크입니다.');return}
    setMessage('');onOpen();
  }
  return <main className="link-screen screen-enter"><div className="link-screen-heading"><span className="link-screen-kicker">REAL VIDEO · LIVE API</span><h1>실제 영상 링크를<br/>분석해 보세요</h1><p>유튜브에서 복사하거나 공유 받은 주소를 붙여넣으면 WON ATTACK 분석으로 이어집니다.</p></div><form onSubmit={submit}><label htmlFor="youtube-url">유튜브 영상 주소</label><div className="link-input-wrap"><input ref={inputRef} id="youtube-url" type="text" inputMode="url" value={value} onChange={event=>{setValue(event.target.value);setMessage('')}} placeholder="https://www.youtube.com/watch?v=..." autoComplete="url"/><button type="button" onClick={()=>void paste()}>붙여넣기</button></div>{message&&<p className="link-input-message" role="alert">{message}</p>}<button type="submit" className="link-open-button">영상 확인하기 <ArrowUpRight size={18}/></button></form><section className="link-example"><span>시연 가능한 실제 영상</span><strong>유튜브 공유 링크로 분석 체험</strong><small>{videoUrl(realVideo)}</small><button type="button" onClick={()=>void copyExample()}>{copyStatus.startsWith('링크를 복사')?'복사됨':'링크 복사하기'} <Copy size={16}/></button>{copyStatus&&<small className="link-copy-status" role="status">{copyStatus}</small>}</section><p className="link-api-note"><ShieldCheck size={16}/> 이 영상은 모의 응답이 아닌 백엔드 분석 API로 요청합니다.</p></main>;
}
function RealVideoScreen({onShare,onAnalyze,onBack}:{onShare:()=>void;onAnalyze:()=>void;onBack:()=>void}){
  return <main className="real-video-screen screen-enter"><div className="real-video-top"><button type="button" onClick={onBack} aria-label="링크 입력으로 돌아가기"><ArrowLeft size={22}/></button><span>공유 받은 유튜브 영상</span></div><div className="real-video-thumbnail"><span className="real-video-placeholder"><Play size={41} fill="currentColor" strokeWidth={0}/></span><span>입력한 영상 링크</span></div><div className="real-video-content"><span className="real-video-badge">실제 유튜브 링크</span><h1>{realVideo.title}</h1><p>입력한 주소를 WON ATTACK 분석 API에 전달합니다.</p><code>{videoUrl(realVideo)}</code><div className="real-video-instruction"><Share2 size={19}/><span>공유 버튼에서 WON MTS를 선택하면 실제 분석을 요청합니다.</span></div><button type="button" className="real-video-share" onClick={onShare}><Share2 size={20}/> 공유하기</button><button type="button" className="real-video-analyze" onClick={onAnalyze}>WON ATTACK으로 바로 분석 <ArrowUpRight size={17}/></button></div></main>;
}
function ShortsScreen({onShare,onHome}:{onShare:(video:DemoVideo)=>void;onHome:()=>void}){
  const [liked,setLiked]=useState<string[]>([]);
  const [saved,setSaved]=useState<string[]>([]);
  const playerRef=useRef<HTMLVideoElement>(null);
  const [playing,setPlaying]=useState(false);
  const [muted,setMuted]=useState(true);
  const togglePlayback=()=>{const player=playerRef.current;if(!player)return;if(player.paused){player.muted=false;setMuted(false);void player.play().catch(()=>setPlaying(false))}else if(player.muted){player.muted=false;setMuted(false)}else player.pause()};
  return <div className="shorts-shell screen-enter"><div className="shorts-feed">{demoShorts.map(item=>{
    const isLiked=liked.includes(item.video.id);const isSaved=saved.includes(item.video.id);
    return <article className={`shorts-card shorts-card--${item.video.theme}`} key={item.video.id}>
      <div className="shorts-scene"><video ref={playerRef} className="shorts-video-media" src={videoSrc(item.video)} poster={videoThumbnailSrc(item.video)} playsInline preload="auto" autoPlay muted={muted} loop onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/><button type="button" className="shorts-play-toggle" aria-label={!playing?'영상 재생':muted?'소리 켜기':'영상 일시정지'} onClick={togglePlayback}>{!playing?<Play size={36} fill="currentColor"/>:muted?<VolumeX size={25}/>:<Pause size={28} fill="currentColor"/>}</button><div className="shorts-scene-shade"/></div>
      <div className="shorts-topline"><strong>Shorts</strong><Search size={22}/><MoreHorizontal size={22}/></div>
      <div className="shorts-rail"><button type="button" aria-label="좋아요" aria-pressed={isLiked} onClick={()=>setLiked(current=>isLiked?current.filter(id=>id!==item.video.id):[...current,item.video.id])}><Heart size={29} fill={isLiked?'#ff3040':'none'}/><span>{item.likes}</span></button><button type="button" aria-label="댓글"><MessageCircle size={28}/><span>{item.comments}</span></button><button type="button" aria-label="저장" aria-pressed={isSaved} onClick={()=>setSaved(current=>isSaved?current.filter(id=>id!==item.video.id):[...current,item.video.id])}><Bookmark size={27} fill={isSaved?'white':'none'}/><span>{isSaved?'저장됨':'저장'}</span></button><button type="button" aria-label="공유" onClick={()=>{playerRef.current?.pause();onShare({...item.video,title:item.title,channel:item.channel})}}><Share2 size={29}/><span>공유</span></button><button type="button" aria-label="리믹스"><RefreshCw size={28}/><span>리믹스</span></button></div>
      <div className="shorts-info"><span className="shorts-channel-avatar">{item.video.company.slice(0,1)}</span><strong>@{item.channel}</strong><button type="button">구독</button><p>{item.title} · {item.caption}</p><div className="shorts-audio"><Play size={14} fill="currentColor"/><span>시연 영상 원본 오디오</span></div></div>
    </article>;
  })}</div><DemoBottomNav active="shorts" onHome={onHome} onShorts={()=>document.querySelector('.shorts-feed')?.scrollTo({top:0,behavior:'smooth'})} dark/></div>;
}
function YoutubeScreen({video,onShare,onBack,onChoose}:{video:DemoVideo;onShare:()=>void;onBack:()=>void;onChoose:(video:DemoVideo)=>void}){
  const [playing,setPlaying]=useState(false);
  const [muted,setMuted]=useState(true);
  const [playhead,setPlayhead]=useState(0);
  const [playbackError,setPlaybackError]=useState('');
  const playerRef=useRef<HTMLVideoElement>(null);
  const [liked,setLiked]=useState(false);
  const [disliked,setDisliked]=useState(false);
  const [subscribed,setSubscribed]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const togglePlayback=()=>{const player=playerRef.current;if(!player)return;if(player.paused){setPlaybackError('');player.muted=false;setMuted(false);void player.play().catch(()=>{setPlaying(false);setPlaybackError('영상 재생에 실패했어요. 영상 파일의 코덱이나 브라우저 재생 상태를 확인해 주세요.')})}else if(player.muted){player.muted=false;setMuted(false)}else player.pause()};
  const openShare=()=>{playerRef.current?.pause();onShare()};
  const formatTime=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  return <div className="screen youtube-screen screen-enter">
    <div className="yt-player">
      <video ref={playerRef} className="yt-video-media" src={videoSrc(video)} poster={videoThumbnailSrc(video)} playsInline preload="auto" autoPlay muted={muted} onPlay={()=>{setPlaying(true);setPlaybackError('')}} onPause={()=>setPlaying(false)} onError={()=>{setPlaying(false);setPlaybackError('영상 파일을 불러오지 못했어요. 새로고침 후에도 같으면 파일 형식이나 경로를 확인해 주세요.')}} onTimeUpdate={event=>setPlayhead(event.currentTarget.currentTime)}/>
      {playbackError&&<div className="yt-playback-error" role="alert">{playbackError}</div>}
      <button type="button" className="yt-video-toggle" aria-label={!playing?'영상 재생':muted?'소리 켜기':'영상 일시정지'} onClick={togglePlayback}>{!playing?<Play size={28} fill="currentColor"/>:muted?<VolumeX size={23}/>:<Pause size={28} fill="currentColor"/>}</button>
      <div className="yt-player-top"><button type="button" className="yt-watch-back" aria-label="영상 목록으로 돌아가기" onClick={onBack}><ChevronDown size={22}/></button><span/><Play size={19} fill="currentColor"/><Captions size={21}/><Settings size={22}/></div>
      <div className="yt-player-bottom"><span>{formatTime(playhead)} / {video.duration}</span><span>{video.company} 시연 영상</span><Maximize size={18}/></div><div className="yt-progress"><span style={{width:`${Math.min(100,playhead/30*100)}%`}}/></div>
    </div>
    <div className="yt-details"><h1>{video.title}</h1><div className="yt-metadata"><span>조회수 {video.views}회</span><span>{video.published}</span><span>#{video.company}</span><span>#투자</span><span>#주식</span><button type="button" onClick={()=>setExpanded(!expanded)}>더보기</button></div>{expanded&&<div className="yt-expanded">{video.channel} · 시연용 가상 영상</div>}
      <div className="yt-channel"><span className="yt-channel-avatar">{video.company.slice(0,1)}</span><strong>{video.channel}</strong><span>시연 채널</span><button type="button" className="yt-subscribe" onClick={()=>setSubscribed(!subscribed)}>{subscribed?'구독중':'구독'}</button></div>
      <div className="yt-actions"><div className="yt-like-group"><button type="button" aria-label="좋아요" aria-pressed={liked} onClick={()=>{setLiked(!liked);setDisliked(false)}}><ThumbsUp size={18} fill={liked?'currentColor':'none'}/> 2.8만</button><i/><button type="button" aria-label="싫어요" aria-pressed={disliked} onClick={()=>{setDisliked(!disliked);setLiked(false)}}><ThumbsDown size={18} fill={disliked?'currentColor':'none'}/></button></div><button type="button" className="yt-share" onClick={openShare}><Share2 size={19} fill="currentColor"/> 공유</button><button type="button"><RefreshCw size={18}/> 리믹스</button><button type="button"><Download size={18}/> 오프라인 저장</button></div>
      <div className="yt-comments"><div className="yt-comments-head"><strong>댓글 <span>4.9천</span></strong></div><div className="yt-comment-input"><span className="yt-comment-avatar">🌆</span><span>댓글 올리기...</span></div></div>
      {videos.filter(item=>item.id!==video.id).map(item=><button type="button" className="yt-recommendation demo-recommendation" key={item.id} onClick={()=>onChoose(item)}><VideoThumbnail video={item}/><div className="yt-recommendation-meta"><span className={`browse-avatar browse-avatar--${item.theme}`}>{item.company.slice(0,1)}</span><div><strong>{item.title}</strong><p>{item.channel} · 조회수 {item.views}회</p></div><MoreHorizontal size={21}/></div></button>)}
    </div></div>;
}
function ShareSheet({video,onClose,onSelect}:{video:DemoVideo;onClose:()=>void;onSelect:()=>void}){
  useEffect(()=>{const handleKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};window.addEventListener('keydown',handleKey);return()=>window.removeEventListener('keydown',handleKey)},[onClose]);
  const copyLink=()=>{void navigator.clipboard?.writeText(videoUrl(video));onClose()};
  return <div className="sheet-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><div className="share-sheet ios-share-sheet" role="dialog" aria-modal="true" aria-labelledby="share-title"><div className="sheet-handle"/><div className="ios-share-preview"><div className="ios-preview-thumb"><VideoThumbnail video={video}/></div><div className="ios-preview-copy"><strong id="share-title">{video.title}</strong><span>youtube.com</span></div><button type="button" className="ios-share-close" aria-label="공유 창 닫기" onClick={onClose}><X size={19}/></button></div><div className="share-apps ios-share-apps"><button type="button" onClick={copyLink}><span className="share-app-icon airdrop-app"><span className="airdrop-symbol">◉</span></span><span>AirDrop</span></button><button type="button"><span className="share-app-icon message-app"><MessageCircle size={31} fill="white" strokeWidth={1.5}/></span><span>메시지</span></button><button type="button"><span className="share-app-icon mail-app"><Mail size={32} strokeWidth={1.6}/></span><span>메일</span></button><button type="button" className="won-app-choice" onClick={onSelect}><span className="share-app-icon won-app"><span className="won-app-mark"><i/><i/></span><strong>WON</strong></span><span>WON MTS</span></button><button type="button"><span className="share-app-icon more-app">•••</span><span>더보기</span></button></div><div className="share-options ios-share-options"><button type="button" onClick={copyLink}><span className="share-option-icon"><Copy size={24}/></span>링크 복사</button><button type="button"><span className="share-option-icon"><MessageCircle size={24}/></span>메시지로 보내기</button><button type="button"><span className="share-option-icon"><SquarePen size={24}/></span>게시물 작성</button><button type="button"><span className="share-option-icon"><RefreshCw size={25}/></span>리믹스</button></div></div></div>;
}
function LoadingScreen({error,onRetry}:{error:string;onRetry:()=>void}){
  const [step,setStep]=useState(0);
  useEffect(()=>{if(error)return;const timer=window.setInterval(()=>setStep(current=>Math.min(current+1,3)),850);return()=>window.clearInterval(timer)},[error]);
  const steps=[['영상 정보 분석 중','유튜브 영상의 주요 주장을 추출하고 있어요.'],['공식 자료 검색 중','DART 등 공식 자료를 기반으로 확인하고 있어요.'],['사실 여부 검증 중','AI가 근거를 비교하고 검증하고 있어요.'],['개인화 분석 중','나의 투자 성향에 맞춰 위험을 분석하고 있어요.']];
  return <main className="loading-screen screen-enter" aria-live="polite">{error?<><div className="error-icon"><AlertCircle size={34}/></div><span className="overline">분석을 완료하지 못했어요</span><h1>잠시 후 다시 시도해 주세요</h1><p>{error}</p><button type="button" className="primary-button" onClick={onRetry}><RotateCcw size={18}/> 다시 분석하기</button></>:<><div className="loading-orbit"><span className="orbit-ring ring-one"/><span className="orbit-ring ring-two"/><span className="loading-core"/><span className="orbit-spark spark-one">✦</span><span className="orbit-spark spark-two">✦</span><span className="orbit-spark spark-three">✦</span></div><h1>WON ATTACK</h1><p>유튜브 속 투자 정보를<br/>AI가 공식 자료로 확인하고,<br/>나의 포트폴리오에 맞춰 분석해드려요.</p><div className="progress-list">{steps.map(([name,description],index)=><div key={name} className={`progress-item ${index<step?'done':index===step?'active':''}`}><span className="progress-symbol">{index<step?<Check size={16}/>:null}</span><span className="progress-copy"><strong>{name}</strong><small>{description}</small></span>{index===step&&<MoreHorizontal className="progress-pulse" size={22}/>}</div>)}</div><div className="loading-note"><span><ShieldCheck size={20}/></span><p>WON ATTACK은 공식 자료에 기반하여<br/>객관적으로 분석합니다.</p></div></>}</main>;
}
function ResultScreen({result,user,onBack,onStock,onArchive,isSaved,onToggleSave}:{result:Analysis;user:string;onBack:()=>void;onStock:()=>void;onArchive:()=>void;isSaved:boolean;onToggleSave:()=>void}){
  const profile=profiles.find(item=>item.id===user)??profiles[2];
  const isMock=USE_MOCK&&result.video.video_id!==REAL_VIDEO_ID;
  const date=new Date(result.analyzed_at);
  const formattedDate=Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(date);
  return <main className="results screen-enter"><section className="result-hero"><div className="hero-glow"/><div className="hero-content"><span className="hero-eyebrow"><Sparkles size={15}/> AI FACT CHECK</span><h1>이 영상의 투자 정보,<br/><strong>확인해 봤어요</strong></h1><p>주장마다 근거를 살펴보고<br/>내 투자 상황에 맞춰 정리했어요.</p><div className="hero-meta"><Clock3 size={14}/> {formattedDate} 분석 {isMock?<span className="mock-badge">DEMO</span>:result.video.video_id===REAL_VIDEO_ID?<span className="mock-badge">LIVE API</span>:null}</div></div><div className="hero-illustration"><ShieldCheck size={51}/></div></section>
    <div className="result-body"><div className="report-tools"><div className="context-card"><span className="context-icon"><Play size={14} fill="currentColor"/></span><div><small>분석한 영상</small><strong>{displayVideoTitle(result.video.video_id,result.video.title)}</strong></div><ChevronRight size={18}/></div><div className="report-tool-buttons"><button type="button" className={isSaved?'saved':''} onClick={onToggleSave}>{isSaved?<BookmarkCheck size={16}/>:<Bookmark size={16}/>}<span>{isSaved?'저장됨':'저장'}</span></button><button type="button" onClick={onArchive}><Bookmark size={16}/><span>보관함</span></button></div></div>{isMock&&<div className="demo-notice"><AlertCircle size={18}/><span>등록된 시연 데이터로 구성한 예시 결과입니다. 실제 분석 API 응답은 아닙니다.</span></div>}
      <section className="result-section" aria-labelledby="verification-title"><div className="section-title"><div><span className="section-kicker">01 · FACT CHECK</span><h2 id="verification-title">주장별 사실 검증</h2></div><span className="count-badge">{result.verification_results.length}건</span></div><p className="section-description">결과 상태에 따라 구분해 확인할 수 있어요.</p><div className="status-legend">{(['SUPPORTED','CONTRADICTED','INSUFFICIENT_EVIDENCE','PREDICTION'] as const).map(status=>{const entry=statusMap[status];return <span className={`legend-item ${entry.tone}`} key={status}><span/>{entry.short}</span>})}</div><div className="claims-list">{result.verification_results.map((item,index)=>{const status=statusMap[item.status];const Icon=status.icon;return <article className={`claim-card ${status.tone}`} key={item.claim_id}><div className="claim-heading"><span className="claim-number">CLAIM {String(index+1).padStart(2,'0')}</span><span className={`status-pill ${status.tone}`}><Icon size={15}/>{status.label}</span></div><h3>{item.claim}</h3><div className="claim-reason"><span>검증 내용</span><p>{item.reason}</p></div>{item.sources.length>0?<div className="source-list"><span>공식 근거</span>{item.sources.map(source=><a key={source.document_id} href={source.source_url} target="_blank" rel="noopener noreferrer"><span className="source-link-icon"><ExternalLink size={15}/></span><span><strong>{source.title}</strong><small>{source.period}</small></span><ArrowUpRight size={18}/></a>)}</div>:<div className="source-empty"><HelpCircle size={16}/>{item.status==='PREDICTION'?'미래 전망에는 확인 가능한 공시 근거가 없습니다.':'판단에 필요한 공식 문서가 연결되지 않았습니다.'}</div>}</article>})}</div></section>
      <section className="result-section risk-section" aria-labelledby="risk-title"><div className="section-title"><div><span className="section-kicker">02 · PERSONAL RISK</span><h2 id="risk-title">나에게 맞는 위험 분석</h2></div></div><p className="section-description">같은 영상도 투자 상황에 따라 다르게 살펴봐야 해요.</p><div className="signed-in-account"><span className="profile-avatar">{profile.label.charAt(0)}</span><div><small>로그인된 WON MTS 사용자</small><strong>{profile.label} · {profile.detail}</strong></div></div><div className="risk-card"><div className="risk-card-top"><span className="risk-icon"><ShieldCheck size={22}/></span><div><small>{profile.label}의 투자 상황</small><strong>{profile.allocation}</strong></div><span className={`risk-level ${profile.level==='주의'?'caution':''}`}>{profile.level}</span></div><div className="risk-divider"/><h3>이 영상을 볼 때 살펴보세요</h3><p>{result.personalized_analysis.summary}</p><ul>{result.personalized_analysis.risk_factors.map((factor,index)=><li key={`${index}-${factor}`}><span><Check size={13}/></span>{factor}</li>)}</ul></div></section>
      <section className="stock-handoff" aria-label="종목 상세 연결"><div className="stock-handoff-copy"><span className="stock-handoff-icon"><TrendingUp size={19}/></span><div><small>다음 단계</small><strong>{result.video.video_id===REAL_VIDEO_ID||result.video.title.includes('삼성전자')?'삼성전자':result.video.title.includes('SK하이닉스')?'SK하이닉스':'현대자동차'} 종목 정보 확인</strong></div></div><p>검증 결과는 매수·매도 의견이 아니에요. 종목 상세에서 정보를 살펴본 뒤 직접 판단해 주세요.</p><button type="button" onClick={onStock}>WON MTS에서 종목 상세 보기 <ChevronRight size={18}/></button></section>
      <div className="footer-disclaimer"><ShieldCheck size={18}/><p>WON ATTACK은 투자 판단을 돕기 위한 정보 서비스입니다. 분석 결과는 투자 권유나 수익 보장이 아니며, 투자 결정 전 공식 공시와 상품 설명서를 확인해 주세요.</p></div><button type="button" className="back-to-video" onClick={onBack}>영상으로 돌아가기 <ArrowUpRight size={18}/></button></div>
  </main>;
}
function StockDetailScreen({video,onBack}:{video:DemoVideo;onBack:()=>void}){
  const [tab,setTab]=useState('차트');
  const [period,setPeriod]=useState('일');
  const [order,setOrder]=useState<'매수'|'매도'|null>(null);
  const [favorite,setFavorite]=useState(false);
  const [quantity,setQuantity]=useState(1);
  const [orderStep,setOrderStep]=useState(0);
  const companyCode=video.theme==='samsung'?'005930':video.theme==='hynix'?'000660':'005380';
  const quote=video.theme==='samsung'?'221,000':video.theme==='hynix'?'543,000':'298,500';
  const quoteValue=Number(quote.replace(/,/g,''));
  const change=video.theme==='hynix'?'+2.41%':video.theme==='samsung'?'+1.82%':'+0.68%';
  const chartPoints='0,76 15,69 28,73 41,52 53,60 67,46 80,56 94,31 108,39 122,22 136,35 150,27 164,44 178,32 192,49 206,37 220,60 234,49 248,65 262,54 276,74 290,59 304,82 318,72 332,92 346,83 360,103';
  return <main className="stock-detail screen-enter"><div className="stock-demo-label"><span/> 시연용 종목 정보 · 실시간 시세 아님</div><section className="stock-quote"><div className="stock-name-row"><div><small>유가증권 · {companyCode}</small><h1>{video.company}</h1></div><button type="button" aria-label={favorite?'관심 종목 해제':'관심 종목 등록'} className={favorite?'favorite-on':''} onClick={()=>setFavorite(value=>!value)}><Heart size={20} fill={favorite?'currentColor':'none'}/></button></div><strong className="stock-price">{quote}<small>원</small></strong><div className="stock-change"><span>▲ {change}</span><span>전일 대비</span></div><div className="stock-quote-meta"><span>거래량 <b>12,438,120</b></span><span>거래대금 <b>1조 2,840억</b></span></div></section>
    <nav className="stock-tabs" aria-label="종목 정보 탭">{['차트','호가','체결','투자자','커뮤니티','종목정보'].map(item=><button type="button" key={item} className={tab===item?'active':''} onClick={()=>setTab(item)}>{item}</button>)}</nav>
    <div className="stock-detail-scroll">{tab==='차트'?<><div className="stock-chart-summary"><strong>{quote}<small>원</small></strong><span>▲ {change}</span><button type="button">원</button></div><div className="stock-chart"><div className="chart-guides"><span>225,000</span><span>220,000</span><span>215,000</span><span>210,000</span></div><svg viewBox="0 0 360 125" preserveAspectRatio="none" role="img" aria-label={`${video.company} 시연용 주가 차트`}><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#4a88f6" stopOpacity=".2"/><stop offset="1" stopColor="#4a88f6" stopOpacity="0"/></linearGradient></defs><polygon points={`0,125 ${chartPoints} 360,125`} fill="url(#chartFill)"/><polyline points={chartPoints} fill="none" stroke="#3978df" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg></div><div className="stock-periods">{['일','주','월','년','10년'].map(item=><button type="button" className={period===item?'active':''} key={item} onClick={()=>setPeriod(item)}>{item}</button>)}<span>⛶</span></div><div className="stock-stat-grid"><div><small>시가</small><strong>{video.theme==='hynix'?'538,000':'218,000'}</strong></div><div><small>고가</small><strong className="positive">{video.theme==='hynix'?'548,000':'224,000'}</strong></div><div><small>저가</small><strong className="negative">{video.theme==='hynix'?'531,000':'216,500'}</strong></div><div><small>전일 종가</small><strong>215,000</strong></div></div><section className="stock-news"><div><strong>관련 정보</strong><span>검증 리포트에서 확인한 내용</span></div><p>영상에서 언급한 주장과 공식 근거를 리포트에서 다시 확인할 수 있어요.</p><button type="button" onClick={onBack}>WON ATTACK 리포트 보기 <ChevronRight size={16}/></button></section></>:tab==='호가'?<QuoteBook quote={quote}/>:tab==='체결'?<ExecutionList quote={quote}/>:tab==='투자자'?<InvestorFlow/>:tab==='커뮤니티'?<CommunityFeed company={video.company}/>:<CompanyInfo company={video.company} companyCode={companyCode}/>}</div>
    <div className="stock-action-bar"><button type="button" className="stock-buy" onClick={()=>{setOrder('매수');setOrderStep(0)}}>매수</button><button type="button" className="stock-sell" onClick={()=>{setOrder('매도');setOrderStep(0)}}>매도</button></div>{order&&<div className="order-sheet-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setOrder(null)}}><section className="order-sheet" role="dialog" aria-modal="true" aria-labelledby="order-title"><div className="order-sheet-handle"/><div className="order-sheet-head"><strong id="order-title">{order} 주문</strong><button type="button" onClick={()=>setOrder(null)} aria-label="닫기"><X size={21}/></button></div><small>{video.company} · {companyCode} · 시연 계좌</small>{orderStep===0?<><div className="order-type-switch"><button className="active" type="button">보통가</button><button type="button">시장가</button><span>주문유형</span></div><div className="order-price-row"><span>주문 가격</span><strong>{quote}원</strong></div><div className="order-quantity-row"><span>주문 수량</span><div><button type="button" onClick={()=>setQuantity(value=>Math.max(1,value-1))}>−</button><strong>{quantity}주</strong><button type="button" onClick={()=>setQuantity(value=>value+1)}>＋</button></div></div><div className="order-total-row"><span>예상 주문 금액</span><strong>{(Number(quote.replace(/,/g,''))*quantity).toLocaleString('ko-KR')}원</strong></div><div className="order-demo-message"><AlertCircle size={17}/> 시연 화면입니다. 실제 주문은 접수되지 않습니다.</div><button type="button" className="order-confirm" onClick={()=>setOrderStep(1)}>주문 내용 확인</button></>:<><div className="order-review"><strong>{order} 주문 내용을 확인해 주세요</strong><span>{video.company} · {quantity}주 · {quote}원</span><b>예상 금액 {(Number(quote.replace(/,/g,''))*quantity).toLocaleString('ko-KR')}원</b></div><div className="order-demo-message"><AlertCircle size={17}/> 실제 증권 계좌로 전송되지 않는 시연 주문입니다.</div><button type="button" className="order-confirm" onClick={()=>{setOrder(null);setOrderStep(0);setQuantity(1)}}>시연 주문 완료</button></>}</section></div>}
  </main>;
}
function initialDemoUser(){
  const requested=new URLSearchParams(window.location.search).get('demo_user');
  return profiles.find(profile=>profile.id===requested)?.id??'demo_user_03';
}
export default function App(){
  const [page,setPage]=useState<Page>(()=>incomingVideoUrl()?'link':'browse');
  const [linkInput]=useState(incomingVideoUrl);
  const [share,setShare]=useState(false);
  const [video,setVideo]=useState<DemoVideo>(videos[0]);
  const [user,setUser]=useState(initialDemoUser);
  const [result,setResult]=useState<Analysis|null>(null);
  const [savedReports,setSavedReports]=useState<SavedReport[]>(readSavedReports);
  const [openedFromArchive,setOpenedFromArchive]=useState(false);
  const [sharedFromShorts,setSharedFromShorts]=useState(false);
  const [error,setError]=useState('');
  const [returnPage,setReturnPage]=useState<Page>('results');
  useEffect(()=>{try{localStorage.setItem(SAVED_REPORTS_KEY,JSON.stringify(savedReports))}catch{}},[savedReports]);
  function chooseVideo(selected:DemoVideo){setVideo(selected);setResult(null);setShare(false);setSharedFromShorts(false);setPage('youtube')}
  function openRealVideo(){setVideo(realVideo);setResult(null);setShare(false);setSharedFromShorts(false);setPage('real-video')}
  function analyzeRealVideo(){setVideo(realVideo);setResult(null);setSharedFromShorts(false);void run(user,realVideo)}
  function shareShort(selected:DemoVideo){setVideo(selected);setSharedFromShorts(true);setShare(true)}
  async function run(id=user,selected=video){
    setShare(false);setError('');setOpenedFromArchive(false);setPage('loading');
    try{const data=await analyze(selected,id);setResult(data);setPage('results')}
    catch(cause){setError(cause instanceof TypeError?'분석 서버에 연결할 수 없어요. 백엔드가 실행 중인지 확인해 주세요.':cause instanceof Error?cause.message:'알 수 없는 오류가 발생했습니다.')}
  }
  function selectDemoUser(id:string){
    if(id===user)return;
    const url=new URL(window.location.href);
    url.searchParams.set('demo_user',id);
    window.history.replaceState(null,'',url);
    window.location.reload();
  }
  function toggleSavedReport(report:Analysis,reportUser:string){
    const id=`${reportUser}:${report.video.video_id}:${report.analyzed_at}`;
    const profile=profiles.find(item=>item.id===reportUser)??profiles[2];
    setSavedReports(current=>current.some(item=>item.id===id)?current.filter(item=>item.id!==id):[{id,userId:reportUser,userLabel:profile.label,savedAt:new Date().toISOString(),report},...current]);
  }
  function openSavedReport(saved:SavedReport){
    setResult(saved.report);setUser(saved.userId);setVideo([...videos,realVideo].find(item=>item.id===saved.report.video.video_id)??videos[0]);setOpenedFromArchive(true);setPage('results');
  }
  const mtsPage=page==='link'||page==='loading'||page==='results'||page==='stock'||page==='mts-home'||page==='watchlist'||page==='assets'||page==='all'||page==='archive';
  function navigateMts(target:Page){setReturnPage(page);setPage(target)}
  function selectStock(selected:DemoVideo){setVideo(selected);setPage('stock')}
  const activeSavedId=result?`${user}:${result.video.video_id}:${result.analyzed_at}`:'';
  const isCurrentSaved=savedReports.some(item=>item.id===activeSavedId);
  return <div className="app-shell"><div className="presentation-stage"><DesktopIntro onOpenLink={()=>setPage("link")} onOpenMock={()=>setPage("browse")} user={user} busy={page==='loading'} onSelect={selectDemoUser}/><div className="phone"><div className={`system-bar ${page==='youtube'?'yt-system-bar':''} ${page==='shorts'?'shorts-system-bar':''}`} aria-hidden="true"><strong>9:41</strong><div className="system-icons"><span className="signal-icon"/><span className="wifi-icon"/><span className="battery-icon"/></div></div>{page==='browse'?<BrowseScreen onSelect={chooseVideo} onShorts={()=>setPage('shorts')} onOpenLink={()=>setPage('link')} onAnalyzeReal={analyzeRealVideo}/>:page==='shorts'?<ShortsScreen onShare={shareShort} onHome={()=>setPage('browse')}/>:page==='youtube'?<YoutubeScreen key={video.id} video={video} onShare={()=>setShare(true)} onBack={()=>setPage('browse')} onChoose={chooseVideo}/>:page==='real-video'?<RealVideoScreen onShare={()=>setShare(true)} onAnalyze={()=>void run()} onBack={()=>setPage('link')}/>:<><header className="mts-header"><div className="mts-brand"><span className="mts-mark"><i/><i/></span><span>우리<strong>WON</strong> MTS</span></div><button className="mts-header-action" type="button" aria-label={page==='results'||page==='loading'?'영상으로 돌아가기':'이전 화면'} onClick={()=>page==='results'||page==='loading'?(openedFromArchive?setPage('archive'):(setPage(video.id===REAL_VIDEO_ID?'real-video':sharedFromShorts?'shorts':'youtube'),setError(''))):page==='link'?setPage('browse'):setPage(returnPage)}>{page==='results'||page==='loading'?<X size={22}/>:<ArrowLeft size={22}/>}</button><button className="mts-header-action" type="button" aria-label="알림"><Bell size={19}/></button><button className="mts-header-action" type="button" aria-label="전체 메뉴" onClick={()=>navigateMts('all')}><Menu size={20}/></button></header>{page==='link'?<LinkScreen initialUrl={linkInput} onOpen={openRealVideo}/>:page==='stock'?<StockDetailScreen video={video} onBack={()=>setPage('results')}/>:page==='loading'?<LoadingScreen error={error} onRetry={()=>void run()}/>:page==='results'&&result?<ResultScreen result={result} user={user} onBack={()=>openedFromArchive?setPage('archive'):setPage(video.id===REAL_VIDEO_ID?'real-video':sharedFromShorts?'shorts':'youtube')} onStock={()=>setPage('stock')} onArchive={()=>navigateMts('archive')} isSaved={isCurrentSaved} onToggleSave={()=>toggleSavedReport(result,user)}/>:<MtsSectionScreen page={page} user={user} onSelectStock={selectStock} onNavigate={navigateMts} onGoReport={()=>setPage(result?'results':'browse')} savedReports={savedReports} onOpenSaved={openSavedReport} onDeleteSaved={id=>setSavedReports(current=>current.filter(item=>item.id!==id))}/>}</>}{mtsPage&&<MtsBottomNav page={page} onNavigate={navigateMts}/>}<div className={`home-bar ${page==='youtube'?'yt-home-bar':''} ${page==='shorts'?'shorts-home-bar':''}`} aria-hidden="true"><span/></div>{share&&<ShareSheet video={video} onClose={()=>setShare(false)} onSelect={()=>void run()}/>}</div><DesktopFlow/></div></div>;
}

function MtsBottomNav({page,onNavigate}:{page:Page;onNavigate:(target:Page)=>void}){
  const active=page==='mts-home'?'홈':page==='watchlist'?'관심종목':page==='stock'?'국내현재가':page==='all'||page==='archive'?'메뉴':page==='assets'?'국내주식':'';
  const items:[string,typeof Home,Page][]=[['홈',Home,'mts-home'],['관심종목',Heart,'watchlist'],['국내현재가',BarChart3,'stock'],['해외현재가',BarChart3,'stock'],['국내주식',Wallet,'stock'],['메뉴',Menu,'all']];
  return <nav className="mts-home-footer" aria-label="WON MTS 하단 메뉴">{items.map(([label,Icon,target],index)=><button type="button" onClick={()=>onNavigate(target)} className={`${label===active?'active':''} ${index===5?'footer-menu-button':''}`} aria-current={label===active?'page':undefined} key={label}><Icon size={20} strokeWidth={label===active?2.5:1.8}/><span>{label}</span></button>)}</nav>;
}

function MtsSectionScreen({page,user,onSelectStock,onNavigate,onGoReport,savedReports,onOpenSaved,onDeleteSaved}:{page:Page;user:string;onSelectStock:(video:DemoVideo)=>void;onNavigate:(target:Page)=>void;onGoReport:()=>void;savedReports:SavedReport[];onOpenSaved:(saved:SavedReport)=>void;onDeleteSaved:(id:string)=>void}){
  const profile=profiles.find(item=>item.id===user)??profiles[2];
  const account=demoAccountValues[profile.id]??demoAccountValues.demo_user_03;
  const cashShare=Math.round(account.cash/account.total*100);
  const heldVideos=videos.filter(video=>profile.holdings[video.theme]>0);
  if(page==='all')return <MtsAllMenu userName={profile.label} onNavigate={onNavigate} onSelectStock={onSelectStock} onGoReport={onGoReport}/>;
  if(page==='mts-home')return <MtsHomeScreen profile={profile} onNavigate={onNavigate} onSelectStock={onSelectStock} onGoReport={onGoReport}/>;
  if(page==='archive')return <main className="mts-section-screen report-archive"><div className="mts-screen-heading"><small>WON ATTACK</small><h1>저장한 리포트</h1><span>저장 시점의 분석 결과를 다시 확인할 수 있어요.</span></div>{savedReports.length===0?<div className="archive-empty"><Bookmark size={28}/><strong>아직 저장한 리포트가 없어요</strong><p>분석 결과 화면에서 저장을 누르면 여기에 보관돼요.</p></div>:<div className="archive-list">{savedReports.map(saved=>{const date=new Date(saved.savedAt);const savedDate=Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(date);const resultCount=saved.report.verification_results.length;const confirmed=saved.report.verification_results.filter(item=>item.status==='SUPPORTED').length;const company=videos.find(item=>item.id===saved.report.video.video_id)?.company??'종목 분석';return <article className="archive-card" key={saved.id}><button type="button" className="archive-card-open" onClick={()=>onOpenSaved(saved)}><span className="archive-card-top"><b>{company}</b><small>{savedDate} 저장</small></span><strong>{displayVideoTitle(saved.report.video.video_id,saved.report.video.title)}</strong><span className="archive-card-meta">{saved.userLabel} · 확인 {confirmed}/{resultCount}건 · {resultCount}개 주장</span><span className="archive-card-cta">리포트 다시 보기 <ChevronRight size={15}/></span></button><button type="button" className="archive-delete" aria-label="저장한 리포트 삭제" onClick={()=>onDeleteSaved(saved.id)}><X size={16}/></button></article>})}</div>}<p className="mts-demo-caption">저장한 내용은 이 브라우저에만 보관됩니다.</p></main>;
  if(page==='watchlist')return <main className="mts-section-screen"><div className="mts-screen-heading"><small>MY 관심종목</small><h1>관심종목</h1><span>시연용 관심종목 목록</span></div><div className="watchlist-tabs"><button className="active" type="button">최근 본</button><button type="button">내 주식</button><button type="button">관심그룹</button></div><div className="mts-stock-list">{videos.map(video=><button type="button" key={video.id} onClick={()=>onSelectStock(video)}><span className={`mini-stock-mark ${video.theme}`}>{video.company.slice(0,1)}</span><span className="mini-stock-copy"><strong>{video.company}</strong><small>시연용 · 국내주식</small></span><span className="mini-stock-price"><strong>{video.theme==='samsung'?'221,000':video.theme==='hynix'?'543,000':'298,500'}</strong><small className="positive">+1.82%</small></span><ChevronRight size={17}/></button>)}</div><p className="mts-demo-caption">표시된 종목과 가격은 화면 시연을 위한 예시입니다.</p></main>;
  if(page==='assets')return <main className="mts-section-screen"><div className="mts-screen-heading"><small>MY 자산</small><h1>자산 현황</h1><span>시연 계정 · {profile.label}</span></div><section className="asset-total-card"><small>총 자산</small><strong>{account.total.toLocaleString('ko-KR')}<em>원</em></strong><span>오늘 평가손익 <b>{account.profit>0?'+':''}{account.profit.toLocaleString('ko-KR')}원</b></span></section><section className="asset-breakdown"><h2>자산 구성</h2>{[['투자자산',100-cashShare],['예수금',cashShare]].map(([name,value])=><div key={name}><span>{name}</span><strong>{value}%</strong><i><b style={{width:`${value}%`}}/></i></div>)}</section><section className="asset-holding-card"><h2>보유 종목</h2>{heldVideos.length?heldVideos.map(video=><button key={video.id} type="button" onClick={()=>onSelectStock(video)}><span>{video.company}</span><strong>{profile.holdings[video.theme]}%</strong><ChevronRight size={15}/></button>):<p>보유 중인 시연 종목이 없습니다.</p>}</section><p className="mts-demo-caption">잔고와 보유 비중은 가상 시연 데이터입니다.</p></main>;
}

const demoAccountValues:Record<string,{total:number;cash:number;profit:number}>={
  demo_user_01:{total:34_500_000,cash:6_900_000,profit:425_000},
  demo_user_02:{total:25_800_000,cash:2_580_000,profit:183_000},
  demo_user_03:{total:18_000_000,cash:2_700_000,profit:120_000},
  demo_user_04:{total:16_000_000,cash:4_000_000,profit:-45_000},
  demo_user_05:{total:30_000_000,cash:30_000_000,profit:0},
};
function MtsHomeScreen({profile,onNavigate,onSelectStock,onGoReport}:{profile:(typeof profiles)[number];onNavigate:(target:Page)=>void;onSelectStock:(video:DemoVideo)=>void;onGoReport:()=>void}){
  const [banner,setBanner]=useState(true);const [hidden,setHidden]=useState(false);
  const account=demoAccountValues[profile.id]??demoAccountValues.demo_user_03;
  return <main className="mts-home-reference"><nav className="home-main-tabs"><button className="selected">MY</button><button>발견</button><button>시장</button><button>상품</button><button className="home-icon"><Search size={22}/></button><button className="home-icon"><Bell size={21}/></button></nav>{banner&&<section className="home-promo"><button type="button" className="promo-close" onClick={()=>setBanner(false)} aria-label="배너 닫기"><X size={20}/></button><small>국내/해외 통합 주식모으기</small><strong>한 번만 설정하면 차곡차곡<br/>알아서 주식을 모아드려요</strong><span className="piggy-illustration">🐷<i>₩</i></span></section>}<section className="home-account"><button className="home-account-name" type="button" onClick={()=>onNavigate('assets')}>일반종합 002-11-592391 <ChevronDown size={18} fill="currentColor"/></button><div className="home-balance"><div><small>총 자산</small><strong>{hidden?'••••••':`${account.total.toLocaleString('ko-KR')}원`}</strong><span>{hidden?'금액 숨김':`예수금 ${account.cash.toLocaleString('ko-KR')}원 · 평가손익 ${account.profit>0?'+':''}${account.profit.toLocaleString('ko-KR')}원`}</span></div><button type="button" onClick={()=>setHidden(value=>!value)}><CheckCircle2 size={18}/>{hidden?'금액보기':'금액숨김'}</button></div><button className="home-limit-card" type="button" onClick={()=>onNavigate('assets')}><span><strong>계좌 한도제한 해제하고</strong><small>최대 이체한도 늘리기</small></span><ChevronRight size={19}/></button><div className="home-shortcuts">{[['전체계좌','▤'],['거래내역','⇄'],['잔고조회','⌕'],['즉시이체','₩']].map(([label,icon])=><button type="button" key={label} onClick={()=>onNavigate('assets')}><i>{icon}</i><span>{label}</span></button>)}</div></section><section className="home-recent"><div className="home-recent-title"><h2>최근 본 종목</h2><button type="button" onClick={()=>onNavigate('watchlist')}>더 보기 <ChevronRight size={16}/></button></div><div className="home-recent-cards">{videos.slice(0,2).map(video=><button type="button" className="recent-stock-card" key={video.id} onClick={()=>onSelectStock(video)}><span>{video.company}<b>×</b></span><strong className="negative">−2.49%</strong></button>)}</div></section><section className="home-woncheck-card"><div><ShieldCheck size={19}/><strong>영상 속 투자 정보 확인</strong></div><p>공식 근거와 내 투자 상황을 함께 살펴보세요.</p><div className="home-report-actions"><button type="button" onClick={onGoReport}>WON ATTACK 리포트 보기 <ChevronRight size={15}/></button><button type="button" onClick={()=>onNavigate('archive')}>보관함 <ChevronRight size={15}/></button></div></section><p className="home-mock-note">계좌·시세는 시연용 예시 데이터입니다.</p></main>
}

function MtsAllMenu({userName,onNavigate,onSelectStock,onGoReport}:{userName:string;onNavigate:(target:Page)=>void;onSelectStock:(video:DemoVideo)=>void;onGoReport:()=>void}){
  const [category,setCategory]=useState('주요 서비스');
  const groups:Record<string,string[]>={'주요 서비스':['투자관리/발견','관심종목','실시간 랭킹','HOT이슈','주식 모으기','안내','국내주식 안내','시세','현재가','종합차트','주문','국내주식 주문'],'국내주식':['국내주식 현재가','관심종목','주식 랭킹','주식 모으기','주문/체결'],'해외주식':['해외 현재가','해외주식 관심종목','해외주식 주문'],'권리/청약':['공모주 청약','권리 현황','청약 일정'],'투자정보':['AI 시그널','WON ATTACK 리포트','저장한 리포트','시장 뉴스','기업 공시']};
  return <main className="mts-all-screen"><header className="all-login-header"><button type="button" onClick={()=>onNavigate('assets')}>{userName} <ChevronRight size={17}/></button><Search size={23}/></header><div className="all-shortcuts">{['해외 현재가','현재가','AI SCAN','AI 리포트'].map(label=><button type="button" key={label} onClick={()=>label==='AI 리포트'?onGoReport():onSelectStock(videos[0])}>{label}<X size={13}/></button>)}</div><nav className="all-product-tabs">{['주식','금융상품','연금/ISA','뱅킹','고객지원'].map(label=><button className={label==='주식'?'active':''} type="button" key={label}>{label}</button>)}</nav><div className="all-menu-layout"><aside>{['주요 서비스','국내주식','해외주식','권리/청약','투자정보'].map(label=><button type="button" className={category===label?'active':''} key={label} onClick={()=>setCategory(label)}>{label}</button>)}</aside><section>{(groups[category]??groups['주요 서비스']).map((item,index)=><button type="button" className={index===0||item==='시세'||item==='주문'?'group-title':''} key={item} onClick={()=>item.includes('관심')?onNavigate('watchlist'):item.includes('저장한')?onNavigate('archive'):item.includes('리포트')?onGoReport():onSelectStock(videos[index%videos.length])}>{item}<ChevronRight size={14}/></button>)}</section></div></main>
}

function QuoteBook({quote}:{quote:string}){return <section className="quote-book"><div className="book-legend"><span>매도 잔량</span><span>매수 잔량</span></div>{['+1.2%','+0.9%','+0.6%','+0.3%','현재가','-0.2%','-0.5%','-0.8%'].map((change,index)=><div className={`book-row ${index===4?'book-current':''}`} key={change}><span>{(Number(quote.replace(/,/g,''))*(1+(4-index)*.002)).toLocaleString('ko-KR')}</span><i><b style={{width:`${25+((index*19)%65)}%`}}/></i><em>{(index+2)*137}</em><em>{(index+1)*203}</em><i className="bid-bar"><b style={{width:`${22+((index*23)%65)}%`}}/></i><strong>{index===4?quote:change}</strong></div>)}<div className="book-total"><span>총 매도 잔량 <b>12,480주</b></span><span>총 매수 잔량 <b>18,920주</b></span></div></section>}
function ExecutionList({quote}:{quote:string}){return <section className="execution-list"><div className="execution-summary"><span>당일 거래량</span><strong>12,438,120주</strong><span>거래대금</span><strong>1조 2,840억</strong></div><div className="execution-head"><span>체결시각</span><span>체결가</span><span>대비</span><span>체결량</span></div>{['15:30:00','15:29:42','15:29:18','15:28:51','15:28:22','15:27:59','15:27:31','15:27:04'].map((time,index)=><div className="execution-row" key={time}><span>{time}</span><strong className={index%3===0?'negative':'positive'}>{(Number(quote.replace(/,/g,''))+(3-index)*500).toLocaleString('ko-KR')}</strong><span className="positive">▲ 0.2%</span><span>{(index+2)*130}</span></div>)}</section>}
function InvestorFlow(){return <section className="investor-flow"><div className="investor-tabs"><strong>투자자별 매매동향</strong><span>최근 5일</span></div>{[['개인',-18],['외국인',34],['기관',-12],['연기금',8]].map(([name,value])=><div className="investor-row" key={name}><span>{name}</span><div className="investor-bar"><i className={Number(value)>0?'up':'down'} style={{width:`${Math.abs(Number(value))*2}%`}}/></div><strong className={Number(value)>0?'positive':'negative'}>{Number(value)>0?'+':''}{value}억</strong></div>)}<div className="investor-note">거래 동향은 시연용 데이터입니다.</div></section>}
function CommunityFeed({company}:{company:string}){return <section className="community-feed"><div className="community-compose">{company} 종목에 대한 생각을 나눠보세요 <button type="button">글쓰기</button></div>{[['오늘 실적 발표 일정 확인하셨나요?','주주A','15분 전'],['차트보다 공시 내용을 먼저 보고 있어요.','투자노트','1시간 전'],['장기 보유 관점으로 지켜보는 중입니다.','초보투자자','3시간 전']].map(([title,name,time])=><article key={title}><div><strong>{name}</strong><small>{time}</small></div><p>{title}</p><span>♡ 공감  {Math.floor(title.length*1.7)}</span></article>)}<p className="mts-demo-caption">커뮤니티 게시물은 모두 시연용 예시입니다.</p></section>}
function CompanyInfo({company,companyCode}:{company:string;companyCode:string}){return <section className="company-info"><h2>기업 개요</h2><p>{company} <span>({companyCode})</span></p><div><span>시장</span><strong>유가증권시장</strong></div><div><span>업종</span><strong>전기·전자 / 제조</strong></div><div><span>상장일</span><strong>1975.06.11</strong></div><div><span>결산월</span><strong>12월</strong></div><div><span>시가총액</span><strong>시연 정보</strong></div><aside>기업 정보는 화면 구성 예시이며 실제 회사 정보와 다를 수 있습니다.</aside></section>}
