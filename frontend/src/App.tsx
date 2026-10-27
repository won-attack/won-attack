import {useEffect, useRef, useState} from 'react';
import './mts-reference.css';
import {AlertCircle, ArrowLeft, ArrowUpRight, BarChart3, Bell, Captions, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, Copy, Download, ExternalLink, Heart, HelpCircle, Home, Mail, Maximize, Menu, MessageCircle, Mic, MoreHorizontal, Pause, Play, Plus, RefreshCw, RotateCcw, Search, Share2, ShieldCheck, Settings, Sparkles, SquarePen, ThumbsDown, ThumbsUp, TrendingUp, Wallet, X, XCircle} from 'lucide-react';

type Status = 'SUPPORTED'|'CONTRADICTED'|'INSUFFICIENT_EVIDENCE'|'PREDICTION';
type ClaimType = 'FINANCIAL'|'DISCLOSURE'|'PREDICTION';
type Source = {document_id:string;title:string;period:string;source_url:string};
type Verification = {claim_id:string;claim:string;claim_type:ClaimType;status:Status;reason:string;sources:Source[]};
type Analysis = {video:{video_id:string;title:string;url:string};verification_results:Verification[];personalized_analysis:{summary:string;risk_factors:string[]};analyzed_at:string};
type Page = 'browse'|'youtube'|'loading'|'results'|'stock'|'mts-home'|'watchlist'|'assets'|'all';
type DemoVideo = {id:string;title:string;channel:string;company:string;theme:'samsung'|'hynix'|'hyundai';eyebrow:string;headline:string;duration:string;views:string;published:string};
const videos:DemoVideo[]=[
  {id:'WCdemoS1V01',title:'삼성전자 영업이익 100조 시대, 지금 안 사면 늦습니다',channel:'주식왕 데이빗(가상)',company:'삼성전자',theme:'samsung',eyebrow:'3분기 영업이익 107조?',headline:'지금 안 사면 늦습니다',duration:'0:36',views:'18만',published:'2주 전'},
  {id:'WCdemoS2V02',title:'SK하이닉스 3분기 77조 확정! 지금 비중 늘리세요',channel:'실적으로 말하는 주식(가상)',company:'SK하이닉스',theme:'hynix',eyebrow:'3분기 77조 확정?',headline:'지금 비중 늘리세요',duration:'0:27',views:'26만',published:'6일 전'},
  {id:'WCdemoS3V03',title:'현대차 관세 직격탄, 보유자는 지금 파세요',channel:'팩트폭격 주식(가상)',company:'현대자동차',theme:'hyundai',eyebrow:'관세 직격탄?',headline:'보유자는 지금 파세요',duration:'0:20',views:'11만',published:'2개월 전'},
];
const videoUrl=(video:DemoVideo)=>`https://www.youtube.com/watch?v=${video.id}`;
const profiles=[
  {id:'demo_user_01',label:'박서연 님',detail:'공격투자형',allocation:'반도체 비중 80%',level:'주의',holdings:{samsung:45,hynix:35,hyundai:0}},
  {id:'demo_user_02',label:'김도현 님',detail:'적극투자형',allocation:'SK하이닉스 비중 10%',level:'보통',holdings:{samsung:0,hynix:10,hyundai:15}},
  {id:'demo_user_03',label:'이도윤 님',detail:'위험중립형',allocation:'SK하이닉스 비중 15%',level:'보통',holdings:{samsung:0,hynix:15,hyundai:0}},
  {id:'demo_user_04',label:'한지은 님',detail:'안정추구형',allocation:'현대자동차 비중 25%',level:'주의',holdings:{samsung:0,hynix:0,hyundai:25}},
  {id:'demo_user_05',label:'정영호 님',detail:'안정형',allocation:'주식 보유 없음',level:'보통',holdings:{samsung:0,hynix:0,hyundai:0}},
];
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
  if(USE_MOCK){await new Promise(resolve=>setTimeout(resolve,2300));return sample(video,user_id)}
  const video_url=videoUrl(video);
  const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({video_url,user_id})});
  const data=await response.json();
  if(!response.ok)throw new Error(data?.error?.message||'분석에 실패했습니다. 다시 시도해 주세요.');
  return data as Analysis;
}
const statusMap={
  SUPPORTED:{label:'근거 확인',short:'확인',icon:CheckCircle2,tone:'supported'},
  CONTRADICTED:{label:'근거와 불일치',short:'불일치',icon:XCircle,tone:'contradicted'},
  INSUFFICIENT_EVIDENCE:{label:'근거 부족',short:'확인 필요',icon:HelpCircle,tone:'insufficient'},
  PREDICTION:{label:'미래 예측',short:'예측',icon:TrendingUp,tone:'prediction'},
} satisfies Record<Status,{label:string;short:string;icon:typeof CheckCircle2;tone:string}>;

function DemoControls({user,busy,onSelect}:{user:string;busy:boolean;onSelect:(id:string)=>void}){
  const [open,setOpen]=useState(false);
  const controlsRef=useRef<HTMLElement>(null);
  const selected=profiles.find(profile=>profile.id===user)??profiles[2];
  useEffect(()=>{
    if(!open)return;
    const closeOnOutside=(event:PointerEvent)=>{if(event.target instanceof Node&&!controlsRef.current?.contains(event.target))setOpen(false)};
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
    document.addEventListener('pointerdown',closeOnOutside);
    document.addEventListener('keydown',closeOnEscape);
    return()=>{document.removeEventListener('pointerdown',closeOnOutside);document.removeEventListener('keydown',closeOnEscape)};
  },[open]);
  return <aside ref={controlsRef} className="demo-controls" aria-label="발표자용 시연 계정 선택">
    <button type="button" className="demo-controls-toggle" aria-expanded={open} aria-controls="demo-account-menu" onClick={()=>setOpen(current=>!current)}><span><strong>시연 계정</strong><small>{selected.label}</small></span><ChevronDown size={18}/></button>
    {open&&<div id="demo-account-menu" className="demo-controls-menu"><strong className="demo-controls-title">시연 계정 선택</strong><div className="demo-account-list">{profiles.map((profile,index)=><button type="button" key={profile.id} className={user===profile.id?'selected':''} aria-pressed={user===profile.id} disabled={busy} onClick={()=>{onSelect(profile.id);setOpen(false)}}><span className="demo-account-number">{String(index+1).padStart(2,'0')}</span><span className="demo-account-text"><strong>{profile.label}</strong><small>{profile.detail}</small></span></button>)}</div></div>}
  </aside>;
}
function VideoThumbnail({video}:{video:DemoVideo}){
  return <div className={`demo-thumbnail demo-thumbnail--${video.theme}`} aria-hidden="true">
    <div className="demo-thumbnail-shine"/><div className="demo-thumbnail-grid"/>
    <span className="demo-thumbnail-tag">WON CHECK · 시연 영상</span>
    <div className="demo-thumbnail-copy"><span>{video.company}</span><strong>{video.eyebrow}</strong><em>{video.headline}</em></div>
    <span className="demo-thumbnail-duration">{video.duration}</span>
  </div>;
}
function BrowseScreen({onSelect}:{onSelect:(video:DemoVideo)=>void}){
  const [filter,setFilter]=useState('전체');
  const visibleVideos=filter==='전체'?videos:videos.filter(video=>video.company===filter);
  return <div className="browse-shell screen-enter">
    <header className="browse-header"><div className="browse-search-row"><ArrowLeft size={28}/><div className="browse-search"><span>주식</span><X size={24}/></div><span className="browse-mic"><Mic size={24}/></span><MoreHorizontal size={25}/></div>
      <div className="browse-filters" aria-label="영상 필터">{['전체','삼성전자','SK하이닉스','현대자동차'].map(item=><button type="button" key={item} className={filter===item?'active':''} aria-pressed={filter===item} onClick={()=>setFilter(item)}>{item}</button>)}</div></header>
    <main className="browse-list" aria-label="시연 영상 목록">{visibleVideos.map(video=><button type="button" className="browse-video" key={video.id} onClick={()=>onSelect(video)} aria-label={`${video.title} 영상 선택`}><VideoThumbnail video={video}/><div className="browse-video-info"><span className={`browse-avatar browse-avatar--${video.theme}`}>{video.company.slice(0,1)}</span><div><strong>{video.title}</strong><span>{video.channel} · 조회수 {video.views}회 · {video.published}</span></div><MoreHorizontal size={23}/></div></button>)}</main>
    <nav className="browse-bottom" aria-label="시연용 탐색 메뉴"><span className="active"><Home size={25} fill="currentColor"/>홈</span><span><Play size={25}/>Shorts</span><span className="browse-add"><Plus size={31}/></span><span><Captions size={25}/>구독</span><span><span className="browse-profile">W</span>내 페이지</span></nav>
  </div>;
}
function YoutubeScreen({video,onShare,onBack,onChoose}:{video:DemoVideo;onShare:()=>void;onBack:()=>void;onChoose:(video:DemoVideo)=>void}){
  const [playing,setPlaying]=useState(false);
  const [liked,setLiked]=useState(false);
  const [disliked,setDisliked]=useState(false);
  const [subscribed,setSubscribed]=useState(false);
  const [expanded,setExpanded]=useState(false);
  return <div className="screen youtube-screen screen-enter">
    <div className="yt-player">
      <VideoThumbnail video={video}/>
      <button type="button" className="yt-video-toggle" aria-label={playing?'영상 일시정지':'영상 재생'} onClick={()=>setPlaying(!playing)}>{playing&&<Pause size={28} fill="currentColor"/>}</button>
      <div className="yt-player-top"><button type="button" className="yt-watch-back" aria-label="영상 목록으로 돌아가기" onClick={onBack}><ChevronDown size={22}/></button><span/><Play size={19} fill="currentColor"/><Captions size={21}/><Settings size={22}/></div>
      <div className="yt-player-bottom"><span>0:01 / {video.duration}</span><span>{video.company} 시연 영상</span><Maximize size={18}/></div><div className="yt-progress"><span/></div>
    </div>
    <div className="yt-details"><h1>{video.title}</h1><div className="yt-metadata"><span>조회수 {video.views}회</span><span>{video.published}</span><span>#{video.company}</span><span>#투자</span><span>#주식</span><button type="button" onClick={()=>setExpanded(!expanded)}>더보기</button></div>{expanded&&<div className="yt-expanded">{video.channel} · 시연용 가상 영상</div>}
      <div className="yt-channel"><span className="yt-channel-avatar">{video.company.slice(0,1)}</span><strong>{video.channel}</strong><span>시연 채널</span><button type="button" className="yt-subscribe" onClick={()=>setSubscribed(!subscribed)}>{subscribed?'구독중':'구독'}</button></div>
      <div className="yt-actions"><div className="yt-like-group"><button type="button" aria-label="좋아요" aria-pressed={liked} onClick={()=>{setLiked(!liked);setDisliked(false)}}><ThumbsUp size={18} fill={liked?'currentColor':'none'}/> 2.8만</button><i/><button type="button" aria-label="싫어요" aria-pressed={disliked} onClick={()=>{setDisliked(!disliked);setLiked(false)}}><ThumbsDown size={18} fill={disliked?'currentColor':'none'}/></button></div><button type="button" className="yt-share" onClick={onShare}><Share2 size={19} fill="currentColor"/> 공유</button><button type="button"><RefreshCw size={18}/> 리믹스</button><button type="button"><Download size={18}/> 오프라인 저장</button></div>
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
  return <main className="loading-screen screen-enter" aria-live="polite">{error?<><div className="error-icon"><AlertCircle size={34}/></div><span className="overline">분석을 완료하지 못했어요</span><h1>잠시 후 다시 시도해 주세요</h1><p>{error}</p><button type="button" className="primary-button" onClick={onRetry}><RotateCcw size={18}/> 다시 분석하기</button></>:<><div className="loading-orbit"><span className="orbit-ring ring-one"/><span className="orbit-ring ring-two"/><span className="loading-core"/><span className="orbit-spark spark-one">✦</span><span className="orbit-spark spark-two">✦</span><span className="orbit-spark spark-three">✦</span></div><h1>WON Check</h1><p>유튜브 속 투자 정보를<br/>AI가 공식 자료로 확인하고,<br/>나의 포트폴리오에 맞춰 분석해드려요.</p><div className="progress-list">{steps.map(([name,description],index)=><div key={name} className={`progress-item ${index<step?'done':index===step?'active':''}`}><span className="progress-symbol">{index<step?<Check size={16}/>:null}</span><span className="progress-copy"><strong>{name}</strong><small>{description}</small></span>{index===step&&<MoreHorizontal className="progress-pulse" size={22}/>}</div>)}</div><div className="loading-note"><span><ShieldCheck size={20}/></span><p>WON Check는 공식 자료에 기반하여<br/>객관적으로 분석합니다.</p></div></>}</main>;
}
function ResultScreen({result,user,onBack,onStock}:{result:Analysis;user:string;onBack:()=>void;onStock:()=>void}){
  const profile=profiles.find(item=>item.id===user)??profiles[2];
  const date=new Date(result.analyzed_at);
  const formattedDate=Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(date);
  return <main className="results screen-enter"><section className="result-hero"><div className="hero-glow"/><div className="hero-content"><span className="hero-eyebrow"><Sparkles size={15}/> AI FACT CHECK</span><h1>이 영상의 투자 정보,<br/><strong>확인해 봤어요</strong></h1><p>주장마다 근거를 살펴보고<br/>내 투자 상황에 맞춰 정리했어요.</p><div className="hero-meta"><Clock3 size={14}/> {formattedDate} 분석 {USE_MOCK&&<span className="mock-badge">DEMO</span>}</div></div><div className="hero-illustration"><ShieldCheck size={51}/></div></section>
    <div className="result-body"><div className="context-card"><span className="context-icon"><Play size={14} fill="currentColor"/></span><div><small>분석한 영상</small><strong>{result.video.title}</strong></div><ChevronRight size={18}/></div>{USE_MOCK&&<div className="demo-notice"><AlertCircle size={18}/><span>등록된 시연 데이터로 구성한 예시 결과입니다. 실제 분석 API 응답은 아닙니다.</span></div>}
      <section className="result-section" aria-labelledby="verification-title"><div className="section-title"><div><span className="section-kicker">01 · FACT CHECK</span><h2 id="verification-title">주장별 사실 검증</h2></div><span className="count-badge">{result.verification_results.length}건</span></div><p className="section-description">결과 상태에 따라 구분해 확인할 수 있어요.</p><div className="status-legend">{(['SUPPORTED','CONTRADICTED','INSUFFICIENT_EVIDENCE','PREDICTION'] as const).map(status=>{const entry=statusMap[status];return <span className={`legend-item ${entry.tone}`} key={status}><span/>{entry.short}</span>})}</div><div className="claims-list">{result.verification_results.map((item,index)=>{const status=statusMap[item.status];const Icon=status.icon;return <article className={`claim-card ${status.tone}`} key={item.claim_id}><div className="claim-heading"><span className="claim-number">CLAIM {String(index+1).padStart(2,'0')}</span><span className={`status-pill ${status.tone}`}><Icon size={15}/>{status.label}</span></div><h3>{item.claim}</h3><div className="claim-reason"><span>검증 내용</span><p>{item.reason}</p></div>{item.sources.length>0?<div className="source-list"><span>공식 근거</span>{item.sources.map(source=><a key={source.document_id} href={source.source_url} target="_blank" rel="noopener noreferrer"><span className="source-link-icon"><ExternalLink size={15}/></span><span><strong>{source.title}</strong><small>{source.period}</small></span><ArrowUpRight size={18}/></a>)}</div>:<div className="source-empty"><HelpCircle size={16}/>{item.status==='PREDICTION'?'미래 전망에는 확인 가능한 공시 근거가 없습니다.':'판단에 필요한 공식 문서가 연결되지 않았습니다.'}</div>}</article>})}</div></section>
      <section className="result-section risk-section" aria-labelledby="risk-title"><div className="section-title"><div><span className="section-kicker">02 · PERSONAL RISK</span><h2 id="risk-title">나에게 맞는 위험 분석</h2></div></div><p className="section-description">같은 영상도 투자 상황에 따라 다르게 살펴봐야 해요.</p><div className="signed-in-account"><span className="profile-avatar">{profile.label.charAt(0)}</span><div><small>로그인된 WON MTS 사용자</small><strong>{profile.label} · {profile.detail}</strong></div></div><div className="risk-card"><div className="risk-card-top"><span className="risk-icon"><ShieldCheck size={22}/></span><div><small>{profile.label}의 투자 상황</small><strong>{profile.allocation}</strong></div><span className={`risk-level ${profile.level==='주의'?'caution':''}`}>{profile.level}</span></div><div className="risk-divider"/><h3>이 영상을 볼 때 살펴보세요</h3><p>{result.personalized_analysis.summary}</p><ul>{result.personalized_analysis.risk_factors.map((factor,index)=><li key={`${index}-${factor}`}><span><Check size={13}/></span>{factor}</li>)}</ul></div></section>
      <section className="stock-handoff" aria-label="종목 상세 연결"><div className="stock-handoff-copy"><span className="stock-handoff-icon"><TrendingUp size={19}/></span><div><small>다음 단계</small><strong>{result.video.title.includes('삼성전자')?'삼성전자':result.video.title.includes('SK하이닉스')?'SK하이닉스':'현대자동차'} 종목 정보 확인</strong></div></div><p>검증 결과는 매수·매도 의견이 아니에요. 종목 상세에서 정보를 살펴본 뒤 직접 판단해 주세요.</p><button type="button" onClick={onStock}>WON MTS에서 종목 상세 보기 <ChevronRight size={18}/></button></section>
      <div className="footer-disclaimer"><ShieldCheck size={18}/><p>WON Check는 투자 판단을 돕기 위한 정보 서비스입니다. 분석 결과는 투자 권유나 수익 보장이 아니며, 투자 결정 전 공식 공시와 상품 설명서를 확인해 주세요.</p></div><button type="button" className="back-to-video" onClick={onBack}>영상으로 돌아가기 <ArrowUpRight size={18}/></button></div>
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
    <div className="stock-detail-scroll">{tab==='차트'?<><div className="stock-chart-summary"><strong>{quote}<small>원</small></strong><span>▲ {change}</span><button type="button">원</button></div><div className="stock-chart"><div className="chart-guides"><span>225,000</span><span>220,000</span><span>215,000</span><span>210,000</span></div><svg viewBox="0 0 360 125" preserveAspectRatio="none" role="img" aria-label={`${video.company} 시연용 주가 차트`}><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#4a88f6" stopOpacity=".2"/><stop offset="1" stopColor="#4a88f6" stopOpacity="0"/></linearGradient></defs><polygon points={`0,125 ${chartPoints} 360,125`} fill="url(#chartFill)"/><polyline points={chartPoints} fill="none" stroke="#3978df" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg></div><div className="stock-periods">{['일','주','월','년','10년'].map(item=><button type="button" className={period===item?'active':''} key={item} onClick={()=>setPeriod(item)}>{item}</button>)}<span>⛶</span></div><div className="stock-stat-grid"><div><small>시가</small><strong>{video.theme==='hynix'?'538,000':'218,000'}</strong></div><div><small>고가</small><strong className="positive">{video.theme==='hynix'?'548,000':'224,000'}</strong></div><div><small>저가</small><strong className="negative">{video.theme==='hynix'?'531,000':'216,500'}</strong></div><div><small>전일 종가</small><strong>215,000</strong></div></div><section className="stock-news"><div><strong>관련 정보</strong><span>검증 리포트에서 확인한 내용</span></div><p>영상에서 언급한 주장과 공식 근거를 리포트에서 다시 확인할 수 있어요.</p><button type="button" onClick={onBack}>WON Check 리포트 보기 <ChevronRight size={16}/></button></section></>:tab==='호가'?<QuoteBook quote={quote}/>:tab==='체결'?<ExecutionList quote={quote}/>:tab==='투자자'?<InvestorFlow/>:tab==='커뮤니티'?<CommunityFeed company={video.company}/>:<CompanyInfo company={video.company} companyCode={companyCode}/>}</div>
    <div className="stock-action-bar"><button type="button" className="stock-buy" onClick={()=>{setOrder('매수');setOrderStep(0)}}>매수</button><button type="button" className="stock-sell" onClick={()=>{setOrder('매도');setOrderStep(0)}}>매도</button></div>{order&&<div className="order-sheet-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setOrder(null)}}><section className="order-sheet" role="dialog" aria-modal="true" aria-labelledby="order-title"><div className="order-sheet-handle"/><div className="order-sheet-head"><strong id="order-title">{order} 주문</strong><button type="button" onClick={()=>setOrder(null)} aria-label="닫기"><X size={21}/></button></div><small>{video.company} · {companyCode} · 시연 계좌</small>{orderStep===0?<><div className="order-type-switch"><button className="active" type="button">보통가</button><button type="button">시장가</button><span>주문유형</span></div><div className="order-price-row"><span>주문 가격</span><strong>{quote}원</strong></div><div className="order-quantity-row"><span>주문 수량</span><div><button type="button" onClick={()=>setQuantity(value=>Math.max(1,value-1))}>−</button><strong>{quantity}주</strong><button type="button" onClick={()=>setQuantity(value=>value+1)}>＋</button></div></div><div className="order-total-row"><span>예상 주문 금액</span><strong>{(Number(quote.replace(/,/g,''))*quantity).toLocaleString('ko-KR')}원</strong></div><div className="order-demo-message"><AlertCircle size={17}/> 시연 화면입니다. 실제 주문은 접수되지 않습니다.</div><button type="button" className="order-confirm" onClick={()=>setOrderStep(1)}>주문 내용 확인</button></>:<><div className="order-review"><strong>{order} 주문 내용을 확인해 주세요</strong><span>{video.company} · {quantity}주 · {quote}원</span><b>예상 금액 {(Number(quote.replace(/,/g,''))*quantity).toLocaleString('ko-KR')}원</b></div><div className="order-demo-message"><AlertCircle size={17}/> 실제 증권 계좌로 전송되지 않는 시연 주문입니다.</div><button type="button" className="order-confirm" onClick={()=>{setOrder(null);setOrderStep(0);setQuantity(1)}}>시연 주문 완료</button></>}</section></div>}
  </main>;
}
function initialDemoUser(){
  const requested=new URLSearchParams(window.location.search).get('demo_user');
  return profiles.find(profile=>profile.id===requested)?.id??'demo_user_03';
}
export default function App(){
  const [page,setPage]=useState<Page>('browse');
  const [share,setShare]=useState(false);
  const [video,setVideo]=useState<DemoVideo>(videos[0]);
  const [user,setUser]=useState(initialDemoUser);
  const [result,setResult]=useState<Analysis|null>(null);
  const [error,setError]=useState('');
  const [returnPage,setReturnPage]=useState<'results'|'stock'>('results');
  function chooseVideo(selected:DemoVideo){setVideo(selected);setResult(null);setShare(false);setPage('youtube')}
  async function run(id=user){
    setShare(false);setError('');setPage('loading');
    try{const data=await analyze(video,id);setResult(data);setPage('results')}
    catch(cause){setError(cause instanceof Error?cause.message:'알 수 없는 오류가 발생했습니다.')}
  }
  function selectDemoUser(id:string){
    setUser(id);
    const url=new URL(window.location.href);
    url.searchParams.set('demo_user',id);
    window.history.replaceState(null,'',url);
    if(page==='results')void run(id);
  }
  const mtsPage=page==='loading'||page==='results'||page==='stock'||page==='mts-home'||page==='watchlist'||page==='assets'||page==='all';
  function navigateMts(target:Page){if(page==='results'||page==='stock')setReturnPage(page);setPage(target)}
  function selectStock(selected:DemoVideo){setVideo(selected);setPage('stock')}
  return <div className="app-shell"><DemoControls user={user} busy={page==='loading'} onSelect={selectDemoUser}/><div className="phone"><div className={`system-bar ${page==='youtube'?'yt-system-bar':''}`} aria-hidden="true"><strong>9:41</strong><div className="system-icons"><span className="signal-icon"/><span className="wifi-icon"/><span className="battery-icon"/></div></div>{page==='browse'?<BrowseScreen onSelect={chooseVideo}/>:page==='youtube'?<YoutubeScreen key={video.id} video={video} onShare={()=>setShare(true)} onBack={()=>setPage('browse')} onChoose={chooseVideo}/>:<><header className="mts-header"><div className="mts-brand"><span className="mts-mark"><i/><i/></span><span>우리<strong>WON</strong> MTS</span></div><button className="mts-header-action" type="button" aria-label={page==='results'||page==='loading'?'영상으로 돌아가기':'이전 화면'} onClick={()=>page==='results'||page==='loading'?(setPage('youtube'),setError('')):setPage(returnPage)}>{page==='results'||page==='loading'?<X size={22}/>:<ArrowLeft size={22}/>}</button><button className="mts-header-action" type="button" aria-label="알림"><Bell size={19}/></button><button className="mts-header-action" type="button" aria-label="전체 메뉴" onClick={()=>navigateMts('all')}><Menu size={20}/></button></header>{page==='stock'?<StockDetailScreen video={video} onBack={()=>setPage('results')}/>:page==='loading'?<LoadingScreen error={error} onRetry={()=>void run()}/>:page==='results'&&result?<ResultScreen result={result} user={user} onBack={()=>setPage('youtube')} onStock={()=>setPage('stock')}/>:<MtsSectionScreen page={page} user={user} onSelectStock={selectStock} onNavigate={navigateMts} onGoReport={()=>setPage('results')}/>}</>}{mtsPage&&<MtsBottomNav page={page} onNavigate={navigateMts}/>}<div className={`home-bar ${page==='youtube'?'yt-home-bar':''}`} aria-hidden="true"><span/></div>{share&&<ShareSheet video={video} onClose={()=>setShare(false)} onSelect={()=>void run()}/>}</div></div>;
}

function MtsBottomNav({page,onNavigate}:{page:Page;onNavigate:(target:Page)=>void}){
  if(page==='all')return <nav className="mts-menu-footer" aria-label="전체 메뉴 하단 도구"><button type="button" onClick={()=>onNavigate('mts-home')}><Home size={20}/><span>홈</span></button><button type="button" onClick={()=>onNavigate('assets')}><ShieldCheck size={20}/><span>인증/보안</span></button><button type="button" onClick={()=>onNavigate('assets')}><Settings size={20}/><span>설정</span></button><button type="button" onClick={()=>onNavigate('assets')}><Wallet size={20}/><span>로그인</span></button><button className="menu-close" type="button" onClick={()=>onNavigate('mts-home')} aria-label="메뉴 닫기"><X size={26}/></button></nav>;
  if(page==='mts-home')return <nav className="mts-home-footer" aria-label="WON MTS 홈 메뉴"><button className="active" type="button" onClick={()=>onNavigate('mts-home')}><Home size={20} fill="currentColor"/><span>홈</span></button><button type="button" onClick={()=>onNavigate('watchlist')}><Heart size={20} fill="currentColor"/><span>관심종목</span></button><button type="button" onClick={()=>onNavigate('stock')}><BarChart3 size={20}/><span>국내현재가</span></button><button type="button" onClick={()=>onNavigate('stock')}><BarChart3 size={20}/><span>해외현재가</span></button><button type="button" onClick={()=>onNavigate('stock')}><Wallet size={20}/><span>국내주식</span></button><button type="button" onClick={()=>onNavigate('all')}><Menu size={20}/><span>메뉴</span></button></nav>;
  const active=page==='watchlist'?'관심':page==='stock'||page==='results'||page==='loading'?'주식':page==='assets'?'자산':'';
  const items:[string,typeof Home,Page][]=[['홈',Home,'mts-home'],['관심',Heart,'watchlist'],['주식',BarChart3,'stock'],['자산',Wallet,'assets'],['전체',Menu,'all']];
  return <nav className="mts-bottom-nav" aria-label="WON MTS 하단 메뉴">{items.map(([label,Icon,target])=><button type="button" onClick={()=>onNavigate(target)} className={`mts-nav-item ${label===active?'active':''}`} aria-current={label===active?'page':undefined} key={label}><Icon size={19} strokeWidth={label===active?2.5:1.8}/><span>{label}</span></button>)}</nav>;
}

function MtsSectionScreen({page,user,onSelectStock,onNavigate,onGoReport}:{page:Page;user:string;onSelectStock:(video:DemoVideo)=>void;onNavigate:(target:Page)=>void;onGoReport:()=>void}){
  const profile=profiles.find(item=>item.id===user)??profiles[2];
  if(page==='all')return <MtsAllMenu userName={profile.label} onNavigate={onNavigate} onSelectStock={onSelectStock} onGoReport={onGoReport}/>;
  if(page==='mts-home')return <MtsHomeScreen profile={profile} onNavigate={onNavigate} onSelectStock={onSelectStock} onGoReport={onGoReport}/>;
  if(page==='watchlist')return <main className="mts-section-screen"><div className="mts-screen-heading"><small>MY 관심종목</small><h1>관심종목</h1><span>시연용 관심종목 목록</span></div><div className="watchlist-tabs"><button className="active" type="button">최근 본</button><button type="button">내 주식</button><button type="button">관심그룹</button></div><div className="mts-stock-list">{videos.map(video=><button type="button" key={video.id} onClick={()=>onSelectStock(video)}><span className={`mini-stock-mark ${video.theme}`}>{video.company.slice(0,1)}</span><span className="mini-stock-copy"><strong>{video.company}</strong><small>시연용 · 국내주식</small></span><span className="mini-stock-price"><strong>{video.theme==='samsung'?'221,000':video.theme==='hynix'?'543,000':'298,500'}</strong><small className="positive">+1.82%</small></span><ChevronRight size={17}/></button>)}</div><p className="mts-demo-caption">표시된 종목과 가격은 화면 시연을 위한 예시입니다.</p></main>;
  if(page==='assets')return <main className="mts-section-screen"><div className="mts-screen-heading"><small>MY 자산</small><h1>자산 현황</h1><span>시연 계정 · {profile.label}</span></div><section className="asset-total-card"><small>총 자산</small><strong>28,450,000<em>원</em></strong><span>오늘 평가손익 <b>+245,000원</b></span></section><section className="asset-breakdown"><h2>자산 구성</h2>{[['국내주식',62],['해외주식',23],['예수금',15]].map(([name,value])=><div key={name}><span>{name}</span><strong>{value}%</strong><i><b style={{width:`${value}%`}}/></i></div>)}</section><section className="asset-holding-card"><h2>보유 종목</h2>{videos.slice(0,2).map(video=><button key={video.id} type="button" onClick={()=>onSelectStock(video)}><span>{video.company}</span><strong>{video.theme==='samsung'?'12주':'5주'}</strong><ChevronRight size={15}/></button>)}</section><p className="mts-demo-caption">잔고와 보유 비중은 가상 시연 데이터입니다.</p></main>;
}

function MtsHomeScreen({profile,onNavigate,onSelectStock,onGoReport}:{profile:(typeof profiles)[number];onNavigate:(target:Page)=>void;onSelectStock:(video:DemoVideo)=>void;onGoReport:()=>void}){
  const [banner,setBanner]=useState(true);const [hidden,setHidden]=useState(false);
  return <main className="mts-home-reference"><nav className="home-main-tabs"><button className="selected">MY</button><button>발견</button><button>시장</button><button>상품</button><button className="home-icon"><Search size={22}/></button><button className="home-icon"><Bell size={21}/></button></nav>{banner&&<section className="home-promo"><button type="button" className="promo-close" onClick={()=>setBanner(false)} aria-label="배너 닫기"><X size={20}/></button><small>국내/해외 통합 주식모으기</small><strong>한 번만 설정하면 차곡차곡<br/>알아서 주식을 모아드려요</strong><span className="piggy-illustration">🐷<i>₩</i></span></section>}<section className="home-account"><button className="home-account-name" type="button" onClick={()=>onNavigate('assets')}>일반종합 002-11-592391 <ChevronDown size={18} fill="currentColor"/></button><div className="home-balance"><div><strong>{hidden?'••••••':'0원'}</strong><span>{hidden?'계좌 잔고 숨김':'0원'}</span></div><button type="button" onClick={()=>setHidden(value=>!value)}><CheckCircle2 size={18}/>{hidden?'금액보기':'금액숨김'}</button></div><button className="home-limit-card" type="button" onClick={()=>onNavigate('assets')}><span><strong>계좌 한도제한 해제하고</strong><small>최대 이체한도 늘리기</small></span><ChevronRight size={19}/></button><div className="home-shortcuts">{[['전체계좌','▤'],['거래내역','⇄'],['잔고조회','⌕'],['즉시이체','₩']].map(([label,icon])=><button type="button" key={label} onClick={()=>onNavigate('assets')}><i>{icon}</i><span>{label}</span></button>)}</div></section><section className="home-recent"><div className="home-recent-title"><h2>최근 본 종목</h2><button type="button" onClick={()=>onNavigate('watchlist')}>더 보기 <ChevronRight size={16}/></button></div><div className="home-recent-cards">{videos.slice(0,2).map(video=><button type="button" className="recent-stock-card" key={video.id} onClick={()=>onSelectStock(video)}><span>{video.company}<b>×</b></span><strong className="negative">−2.49%</strong></button>)}</div></section><section className="home-woncheck-card"><div><ShieldCheck size={19}/><strong>영상 속 투자 정보 확인</strong></div><p>공식 근거와 내 투자 상황을 함께 살펴보세요.</p><button type="button" onClick={onGoReport}>WON Check 리포트 보기 <ChevronRight size={15}/></button></section><p className="home-mock-note">계좌·시세는 시연용 예시 데이터입니다.</p></main>
}

function MtsAllMenu({userName,onNavigate,onSelectStock,onGoReport}:{userName:string;onNavigate:(target:Page)=>void;onSelectStock:(video:DemoVideo)=>void;onGoReport:()=>void}){
  const [category,setCategory]=useState('주요 서비스');
  const groups:Record<string,string[]>={'주요 서비스':['투자관리/발견','관심종목','실시간 랭킹','HOT이슈','주식 모으기','안내','국내주식 안내','시세','현재가','종합차트','주문','국내주식 주문'],'국내주식':['국내주식 현재가','관심종목','주식 랭킹','주식 모으기','주문/체결'],'해외주식':['해외 현재가','해외주식 관심종목','해외주식 주문'],'권리/청약':['공모주 청약','권리 현황','청약 일정'],'투자정보':['AI 시그널','WON Check 리포트','시장 뉴스','기업 공시']};
  return <main className="mts-all-screen"><header className="all-login-header"><button type="button" onClick={()=>onNavigate('assets')}>{userName} <ChevronRight size={17}/></button><Search size={23}/></header><div className="all-shortcuts">{['해외 현재가','현재가','AI SCAN','AI 리포트'].map(label=><button type="button" key={label} onClick={()=>label==='AI 리포트'?onGoReport():onSelectStock(videos[0])}>{label}<X size={13}/></button>)}</div><nav className="all-product-tabs">{['주식','금융상품','연금/ISA','뱅킹','고객지원'].map(label=><button className={label==='주식'?'active':''} type="button" key={label}>{label}</button>)}</nav><div className="all-menu-layout"><aside>{['주요 서비스','국내주식','해외주식','권리/청약','투자정보'].map(label=><button type="button" className={category===label?'active':''} key={label} onClick={()=>setCategory(label)}>{label}</button>)}</aside><section>{(groups[category]??groups['주요 서비스']).map((item,index)=><button type="button" className={index===0||item==='시세'||item==='주문'?'group-title':''} key={item} onClick={()=>item.includes('관심')?onNavigate('watchlist'):item.includes('리포트')?onGoReport:onSelectStock(videos[index%videos.length])}>{item}<ChevronRight size={14}/></button>)}</section></div></main>
}

function QuoteBook({quote}:{quote:string}){return <section className="quote-book"><div className="book-legend"><span>매도 잔량</span><span>매수 잔량</span></div>{['+1.2%','+0.9%','+0.6%','+0.3%','현재가','-0.2%','-0.5%','-0.8%'].map((change,index)=><div className={`book-row ${index===4?'book-current':''}`} key={change}><span>{(Number(quote.replace(/,/g,''))*(1+(4-index)*.002)).toLocaleString('ko-KR')}</span><i><b style={{width:`${25+((index*19)%65)}%`}}/></i><em>{(index+2)*137}</em><em>{(index+1)*203}</em><i className="bid-bar"><b style={{width:`${22+((index*23)%65)}%`}}/></i><strong>{index===4?quote:change}</strong></div>)}<div className="book-total"><span>총 매도 잔량 <b>12,480주</b></span><span>총 매수 잔량 <b>18,920주</b></span></div></section>}
function ExecutionList({quote}:{quote:string}){return <section className="execution-list"><div className="execution-summary"><span>당일 거래량</span><strong>12,438,120주</strong><span>거래대금</span><strong>1조 2,840억</strong></div><div className="execution-head"><span>체결시각</span><span>체결가</span><span>대비</span><span>체결량</span></div>{['15:30:00','15:29:42','15:29:18','15:28:51','15:28:22','15:27:59','15:27:31','15:27:04'].map((time,index)=><div className="execution-row" key={time}><span>{time}</span><strong className={index%3===0?'negative':'positive'}>{(Number(quote.replace(/,/g,''))+(3-index)*500).toLocaleString('ko-KR')}</strong><span className="positive">▲ 0.2%</span><span>{(index+2)*130}</span></div>)}</section>}
function InvestorFlow(){return <section className="investor-flow"><div className="investor-tabs"><strong>투자자별 매매동향</strong><span>최근 5일</span></div>{[['개인',-18],['외국인',34],['기관',-12],['연기금',8]].map(([name,value])=><div className="investor-row" key={name}><span>{name}</span><div className="investor-bar"><i className={Number(value)>0?'up':'down'} style={{width:`${Math.abs(Number(value))*2}%`}}/></div><strong className={Number(value)>0?'positive':'negative'}>{Number(value)>0?'+':''}{value}억</strong></div>)}<div className="investor-note">거래 동향은 시연용 데이터입니다.</div></section>}
function CommunityFeed({company}:{company:string}){return <section className="community-feed"><div className="community-compose">{company} 종목에 대한 생각을 나눠보세요 <button type="button">글쓰기</button></div>{[['오늘 실적 발표 일정 확인하셨나요?','주주A','15분 전'],['차트보다 공시 내용을 먼저 보고 있어요.','투자노트','1시간 전'],['장기 보유 관점으로 지켜보는 중입니다.','초보투자자','3시간 전']].map(([title,name,time])=><article key={title}><div><strong>{name}</strong><small>{time}</small></div><p>{title}</p><span>♡ 공감  {Math.floor(title.length*1.7)}</span></article>)}<p className="mts-demo-caption">커뮤니티 게시물은 모두 시연용 예시입니다.</p></section>}
function CompanyInfo({company,companyCode}:{company:string;companyCode:string}){return <section className="company-info"><h2>기업 개요</h2><p>{company} <span>({companyCode})</span></p><div><span>시장</span><strong>유가증권시장</strong></div><div><span>업종</span><strong>전기·전자 / 제조</strong></div><div><span>상장일</span><strong>1975.06.11</strong></div><div><span>결산월</span><strong>12월</strong></div><div><span>시가총액</span><strong>시연 정보</strong></div><aside>기업 정보는 화면 구성 예시이며 실제 회사 정보와 다를 수 있습니다.</aside></section>}
