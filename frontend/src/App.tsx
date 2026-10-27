import {useEffect, useState} from 'react';
import {AlertCircle, ArrowLeft, ArrowUpRight, Captions, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, Copy, Download, ExternalLink, HelpCircle, Home, Mail, Maximize, MessageCircle, Mic, MoreHorizontal, Pause, Play, Plus, RefreshCw, RotateCcw, Share2, ShieldCheck, Settings, Sparkles, SquarePen, ThumbsDown, ThumbsUp, TrendingUp, X, XCircle} from 'lucide-react';

type Status = 'SUPPORTED'|'CONTRADICTED'|'INSUFFICIENT_EVIDENCE'|'PREDICTION';
type ClaimType = 'FINANCIAL'|'DISCLOSURE'|'PREDICTION';
type Source = {document_id:string;title:string;period:string;source_url:string};
type Verification = {claim_id:string;claim:string;claim_type:ClaimType;status:Status;reason:string;sources:Source[]};
type Analysis = {video:{video_id:string;title:string;url:string};verification_results:Verification[];personalized_analysis:{summary:string;risk_factors:string[]};analyzed_at:string};
type Page = 'browse'|'youtube'|'loading'|'results';
type DemoVideo = {id:string;title:string;channel:string;company:string;theme:string;eyebrow:string;headline:string;duration:string;views:string;published:string;userIds:string[]};
const videos:DemoVideo[]=[
  {id:'WCdemoS1V01',title:'삼성전자 영업이익 100조 시대, 지금 안 사면 늦습니다',channel:'주식왕 데이빗(가상)',company:'삼성전자',theme:'samsung',eyebrow:'3분기 영업이익 107조?',headline:'지금 안 사면 늦습니다',duration:'0:36',views:'18만',published:'2주 전',userIds:['demo_user_03']},
  {id:'WCdemoS2V02',title:'SK하이닉스 3분기 77조 확정! 지금 비중 늘리세요',channel:'실적으로 말하는 주식(가상)',company:'SK하이닉스',theme:'hynix',eyebrow:'3분기 77조 확정?',headline:'지금 비중 늘리세요',duration:'0:27',views:'26만',published:'6일 전',userIds:['demo_user_01','demo_user_02']},
  {id:'WCdemoS3V03',title:'현대차 관세 직격탄, 보유자는 지금 파세요',channel:'팩트폭격 주식(가상)',company:'현대자동차',theme:'hyundai',eyebrow:'관세 직격탄?',headline:'보유자는 지금 파세요',duration:'0:20',views:'11만',published:'2개월 전',userIds:['demo_user_04','demo_user_05']},
];
const videoUrl=(video:DemoVideo)=>`https://www.youtube.com/watch?v=${video.id}`;
const profiles=[
  {id:'demo_user_01',label:'박서연 님',detail:'반도체 집중 투자',allocation:'반도체 비중 80%',level:'주의'},
  {id:'demo_user_02',label:'김도현 님',detail:'분산 투자 중',allocation:'SK하이닉스 비중 10%',level:'보통'},
  {id:'demo_user_03',label:'이도윤 님',detail:'삼성전자 신규 검토',allocation:'SK하이닉스 비중 15%',level:'보통'},
  {id:'demo_user_04',label:'한지은 님',detail:'현대차 보유 점검',allocation:'현대자동차 비중 25%',level:'주의'},
  {id:'demo_user_05',label:'정영호 님',detail:'안정형 투자',allocation:'주식 보유 없음',level:'보통'},
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
    {claim_id:'claim_003',claim:'SK하이닉스의 2026년 3분기 영업이익 77조 원이 확정됐다.',claim_type:'FINANCIAL',status:'INSUFFICIENT_EVIDENCE',reason:'3분기 실적은 10월 29일 발표 예정으로, 현재 확정 수치를 확인할 수 없습니다.',sources:[hynixNotice]},
  ],
  WCdemoS3V03:[
    {claim_id:'claim_001',claim:'현대자동차의 2026년 1분기 영업이익은 전년 동기보다 30% 넘게 줄었다.',claim_type:'FINANCIAL',status:'SUPPORTED',reason:'공식 발표에 따르면 1분기 영업이익은 전년 동기 대비 30.8% 감소했습니다.',sources:[hyundaiQ1]},
    {claim_id:'claim_002',claim:'현대자동차는 2026년 2분기에 영업 적자를 냈다.',claim_type:'FINANCIAL',status:'CONTRADICTED',reason:'2분기 영업이익은 약 2.85조 원으로 흑자입니다.',sources:[hyundaiQ2]},
    {claim_id:'claim_003',claim:'현대자동차의 내년 이익은 반토막 날 것이다.',claim_type:'PREDICTION',status:'PREDICTION',reason:'미래 이익에 대한 전망으로, 현재 자료만으로 확정할 수 없습니다.',sources:[]},
  ],
};
function sample(video:DemoVideo,id:string):Analysis{
  const personalized_analysis=video.id==='WCdemoS1V01'
    ?{summary:'삼성전자는 아직 보유하지 않았지만 SK하이닉스를 보유하고 있어 신규 매수 시 반도체 업종 비중이 커집니다.',risk_factors:['반도체 업종 집중도 증가','3분기 수치는 잠정 실적','영상의 매출 주장 불일치']}
    :video.id==='WCdemoS2V02'
      ?id==='demo_user_01'
        ?{summary:'반도체 비중이 이미 80%입니다. 추가 매수 전 집중 위험과 미발표 3분기 실적을 함께 살펴보세요.',risk_factors:['반도체 비중 80%','3분기 실적 미발표','영상의 매출 주장 불일치']}
        :{summary:'SK하이닉스 비중은 10%입니다. 영상의 과장된 매출 주장과 미확정 3분기 실적을 확인하세요.',risk_factors:['2분기 매출 주장 불일치','3분기 실적 미발표']}
      :id==='demo_user_04'
        ?{summary:'현대자동차를 보유하고 있습니다. 2분기 적자라는 주장은 공식 실적과 다르므로 사실을 확인한 뒤 판단하세요.',risk_factors:['현대자동차 비중 25%','2분기 적자 주장 불일치','내년 이익 전망은 미확정']}
        :{summary:'현재 주식 보유가 없는 안정형 투자자입니다. 영상의 단정적 전망보다 공식 실적과 투자 성향을 먼저 살펴보세요.',risk_factors:['2분기 적자 주장 불일치','미래 이익 전망은 미확정']};
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
function ResultScreen({result,video,user,onProfileChange,onBack}:{result:Analysis;video:DemoVideo;user:string;onProfileChange:(id:string)=>void;onBack:()=>void}){
  const profile=profiles.find(item=>item.id===user)??profiles[0];
  const date=new Date(result.analyzed_at);
  const formattedDate=Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(date);
  return <main className="results screen-enter"><section className="result-hero"><div className="hero-glow"/><div className="hero-content"><span className="hero-eyebrow"><Sparkles size={15}/> AI FACT CHECK</span><h1>이 영상의 투자 정보,<br/><strong>확인해 봤어요</strong></h1><p>주장마다 근거를 살펴보고<br/>내 투자 상황에 맞춰 정리했어요.</p><div className="hero-meta"><Clock3 size={14}/> {formattedDate} 분석 {USE_MOCK&&<span className="mock-badge">DEMO</span>}</div></div><div className="hero-illustration"><ShieldCheck size={51}/></div></section>
    <div className="result-body"><div className="context-card"><span className="context-icon"><Play size={14} fill="currentColor"/></span><div><small>분석한 영상</small><strong>{result.video.title}</strong></div><ChevronRight size={18}/></div>{USE_MOCK&&<div className="demo-notice"><AlertCircle size={18}/><span>등록된 시연 데이터로 구성한 예시 결과입니다. 실제 분석 API 응답은 아닙니다.</span></div>}
      <section className="result-section" aria-labelledby="verification-title"><div className="section-title"><div><span className="section-kicker">01 · FACT CHECK</span><h2 id="verification-title">주장별 사실 검증</h2></div><span className="count-badge">{result.verification_results.length}건</span></div><p className="section-description">결과 상태에 따라 구분해 확인할 수 있어요.</p><div className="status-legend">{(['SUPPORTED','CONTRADICTED','INSUFFICIENT_EVIDENCE','PREDICTION'] as const).map(status=>{const entry=statusMap[status];return <span className={`legend-item ${entry.tone}`} key={status}><span/>{entry.short}</span>})}</div><div className="claims-list">{result.verification_results.map((item,index)=>{const status=statusMap[item.status];const Icon=status.icon;return <article className={`claim-card ${status.tone}`} key={item.claim_id}><div className="claim-heading"><span className="claim-number">CLAIM {String(index+1).padStart(2,'0')}</span><span className={`status-pill ${status.tone}`}><Icon size={15}/>{status.label}</span></div><h3>{item.claim}</h3><div className="claim-reason"><span>검증 내용</span><p>{item.reason}</p></div>{item.sources.length>0?<div className="source-list"><span>공식 근거</span>{item.sources.map(source=><a key={source.document_id} href={source.source_url} target="_blank" rel="noopener noreferrer"><span className="source-link-icon"><ExternalLink size={15}/></span><span><strong>{source.title}</strong><small>{source.period}</small></span><ArrowUpRight size={18}/></a>)}</div>:<div className="source-empty"><HelpCircle size={16}/>{item.status==='PREDICTION'?'미래 전망에는 확인 가능한 공시 근거가 없습니다.':'판단에 필요한 공식 문서가 연결되지 않았습니다.'}</div>}</article>})}</div></section>
      <section className="result-section risk-section" aria-labelledby="risk-title"><div className="section-title"><div><span className="section-kicker">02 · PERSONAL RISK</span><h2 id="risk-title">나에게 맞는 위험 분석</h2></div></div><p className="section-description">같은 영상도 투자 상황에 따라 다르게 살펴봐야 해요.</p><label className="profile-label" htmlFor="profile-select">분석 프로필</label><div className="profile-select-wrap"><span className="profile-avatar">{profile.label.charAt(0)}</span><select id="profile-select" value={user} onChange={event=>onProfileChange(event.target.value)}>{profiles.filter(item=>video.userIds.includes(item.id)).map(item=><option key={item.id} value={item.id}>{item.label} · {item.detail}</option>)}</select><ChevronDown size={19}/></div><div className="risk-card"><div className="risk-card-top"><span className="risk-icon"><ShieldCheck size={22}/></span><div><small>{profile.label}의 투자 상황</small><strong>{profile.allocation}</strong></div><span className={`risk-level ${profile.level==='주의'?'caution':''}`}>{profile.level}</span></div><div className="risk-divider"/><h3>이 영상을 볼 때 살펴보세요</h3><p>{result.personalized_analysis.summary}</p><ul>{result.personalized_analysis.risk_factors.map((factor,index)=><li key={`${index}-${factor}`}><span><Check size={13}/></span>{factor}</li>)}</ul></div></section>
      <div className="footer-disclaimer"><ShieldCheck size={18}/><p>WON Check는 투자 판단을 돕기 위한 정보 서비스입니다. 분석 결과는 투자 권유나 수익 보장이 아니며, 투자 결정 전 공식 공시와 상품 설명서를 확인해 주세요.</p></div><button type="button" className="back-to-video" onClick={onBack}>영상으로 돌아가기 <ArrowUpRight size={18}/></button></div>
  </main>;
}
export default function App(){
  const [page,setPage]=useState<Page>('browse');const [share,setShare]=useState(false);const [video,setVideo]=useState<DemoVideo>(videos[0]);const [user,setUser]=useState(videos[0].userIds[0]);const [result,setResult]=useState<Analysis|null>(null);const [error,setError]=useState('');
  function chooseVideo(selected:DemoVideo){setVideo(selected);setUser(selected.userIds[0]);setResult(null);setShare(false);setPage('youtube')}
  async function run(id=user){setShare(false);setError('');setPage('loading');try{const data=await analyze(video,id);setResult(data);setPage('results')}catch(cause){setError(cause instanceof Error?cause.message:'알 수 없는 오류가 발생했습니다.')}}
  function changeProfile(id:string){setUser(id);void run(id)}
  return <div className="app-shell"><div className="phone"><div className={`system-bar ${page==='youtube'?'yt-system-bar':''}`} aria-hidden="true"><strong>9:41</strong><div className="system-icons"><span className="signal-icon"/><span className="wifi-icon"/><span className="battery-icon"/></div></div>{page==='browse'?<BrowseScreen onSelect={chooseVideo}/>:page==='youtube'?<YoutubeScreen key={video.id} video={video} onShare={()=>setShare(true)} onBack={()=>setPage('browse')} onChoose={chooseVideo}/>:<><header className="mts-header"><div className="mts-brand"><span className="mts-mark"><i/><i/></span><span>우리<strong>WON</strong> MTS</span></div><button className="back-button" type="button" aria-label="영상으로 돌아가기" onClick={()=>{setPage('youtube');setError('')}}><X size={24}/></button></header>{page==='loading'?<LoadingScreen error={error} onRetry={()=>void run()}/>:result&&<ResultScreen result={result} video={video} user={user} onProfileChange={changeProfile} onBack={()=>setPage('youtube')}/>}</>}<div className={`home-bar ${page==='youtube'?'yt-home-bar':''}`} aria-hidden="true"><span/></div>{share&&<ShareSheet video={video} onClose={()=>setShare(false)} onSelect={()=>void run()}/>}</div></div>;
}
