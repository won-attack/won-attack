import {useEffect, useState} from 'react';
import {AlertCircle, ArrowLeft, ArrowUpRight, Captions, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, Copy, Download, ExternalLink, HelpCircle, Mail, Maximize, MessageCircle, MoreHorizontal, Pause, Play, RefreshCw, RotateCcw, Share2, ShieldCheck, Settings, Sparkles, SquarePen, ThumbsDown, ThumbsUp, TrendingUp, X, XCircle} from 'lucide-react';

type Status = 'SUPPORTED'|'CONTRADICTED'|'INSUFFICIENT_EVIDENCE'|'PREDICTION';
type ClaimType = 'FINANCIAL'|'DISCLOSURE'|'PREDICTION';
type Source = {document_id:string;title:string;period:string;source_url:string};
type Verification = {claim_id:string;claim:string;claim_type:ClaimType;status:Status;reason:string;sources:Source[]};
type Analysis = {video:{video_id:string;title:string;url:string};verification_results:Verification[];personalized_analysis:{summary:string;risk_factors:string[]};analyzed_at:string};
type Page = 'youtube'|'loading'|'results';

const VIDEO_URL='https://www.youtube.com/watch?v=DEMO_VIDEO_ID';
const VIDEO_TITLE='이제는 말씀드리겠습니다.';
const profiles=[
  {id:'demo_user_01',label:'김원 님',detail:'한 종목 집중 투자',allocation:'단일 종목 비중 40%',level:'주의'},
  {id:'demo_user_02',label:'이체크 님',detail:'분산 투자 중',allocation:'단일 종목 비중 5%',level:'보통'},
];
const sample=(id:string):Analysis=>({
  video:{video_id:'DEMO_VIDEO_ID',title:VIDEO_TITLE,url:VIDEO_URL},
  verification_results:[
    {claim_id:'claim_001',claim:'기업의 재무 정보는 공식 공시 자료에서 확인할 수 있습니다.',claim_type:'DISCLOSURE',status:'SUPPORTED',reason:'금융감독원 전자공시시스템(DART)에서 기업의 사업보고서 등 공시 자료를 조회할 수 있습니다. 특정 기업의 수치를 확인하려면 해당 공시 원문을 직접 확인해야 합니다.',sources:[{document_id:'dart-home',title:'금융감독원 전자공시시스템 DART',period:'공식 공시 조회',source_url:'https://dart.fss.or.kr/'}]},
    {claim_id:'claim_002',claim:'한 종목에 집중 투자해도 투자 위험은 커지지 않습니다.',claim_type:'FINANCIAL',status:'CONTRADICTED',reason:'미국 증권거래위원회 투자자 교육 자료는 여러 자산과 종목에 나누어 투자하는 분산 투자가 집중 위험을 줄이는 방법이라고 설명합니다.',sources:[{document_id:'sec-diversification',title:'Investor.gov · Asset Allocation and Diversification',period:'투자자 교육 자료',source_url:'https://www.investor.gov/introduction-investing/getting-started/asset-allocation'}]},
    {claim_id:'claim_003',claim:'영상에서 언급한 기업의 올해 실적 수치는 공식 공시와 일치합니다.',claim_type:'FINANCIAL',status:'INSUFFICIENT_EVIDENCE',reason:'이 시연 영상에는 실제 기업명과 공시 문서가 연결되어 있지 않습니다. 수치의 일치 여부를 판단하려면 해당 기업의 공시 원문이 필요합니다.',sources:[]},
    {claim_id:'claim_004',claim:'이 종목의 주가는 내년에 반드시 두 배가 됩니다.',claim_type:'PREDICTION',status:'PREDICTION',reason:'미래 주가에 대한 단정적 전망입니다. 현재 공개된 자료만으로 미래 수익률을 사실로 확정할 수 없습니다.',sources:[]},
  ],
  personalized_analysis:id==='demo_user_01'
    ?{summary:'현재 단일 종목 비중이 높아 영상의 낙관적인 전망에 따라 추가 매수할 경우 집중 투자 위험이 커질 수 있습니다.',risk_factors:['단일 종목 비중 40%로 가격 변동에 민감','실적 수치 확인 전 추가 매수 판단 주의','수익률을 확정적으로 표현한 주장에 유의']}
    :{summary:'단일 종목 비중은 낮은 편입니다. 다만 영상의 전망을 투자 결정에 반영하기 전 공시 원문과 본인의 투자 계획을 함께 확인해 보세요.',risk_factors:['영상 속 실적 수치의 공시 원문 확인 필요','미래 수익률을 보장하는 표현에 유의']},
  analyzed_at:new Date().toISOString(),
});
const USE_MOCK=import.meta.env.VITE_USE_MOCK!=='false';
async function analyze(video_url:string,user_id:string):Promise<Analysis>{
  if(USE_MOCK){await new Promise(resolve=>setTimeout(resolve,2300));return sample(user_id)}
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

function YoutubeScreen({onShare}:{onShare:()=>void}){
  const [playing,setPlaying]=useState(false);
  const [liked,setLiked]=useState(false);
  const [disliked,setDisliked]=useState(false);
  const [subscribed,setSubscribed]=useState(false);
  const [expanded,setExpanded]=useState(false);
  return <div className="screen youtube-screen screen-enter">
    <div className="yt-player">
      <button type="button" className="yt-video-toggle" aria-label={playing?'영상 일시정지':'영상 재생'} onClick={()=>setPlaying(!playing)}>{playing&&<Pause size={28} fill="currentColor"/>}</button>
      <div className="yt-player-top"><ChevronDown size={22}/><span/><Play size={19} fill="currentColor"/><Captions size={21}/><Settings size={22}/></div>
      <div className="yt-player-bottom"><span>0:01 / 15:43</span><span>자 여러분 안녕하세요. 슈카입니다.</span><Maximize size={18}/></div><div className="yt-progress"><span/></div>
    </div>
    <div className="yt-details"><h1>{VIDEO_TITLE}</h1><div className="yt-metadata"><span>조회수 298만회</span><span>2주 전</span><span>#삼성전자</span><span>#투자</span><span>#주식</span><button type="button" onClick={()=>setExpanded(!expanded)}>더보기</button></div>{expanded&&<div className="yt-expanded">슈카월드 · 조회수 298만회 · 2주 전</div>}
      <div className="yt-channel"><span className="yt-channel-avatar">🦐</span><strong>@syukaworld</strong><span>2.8만</span><button type="button" className="yt-subscribe" onClick={()=>setSubscribed(!subscribed)}>{subscribed?'구독중':'구독'}</button></div>
      <div className="yt-actions"><div className="yt-like-group"><button type="button" aria-label="좋아요" aria-pressed={liked} onClick={()=>{setLiked(!liked);setDisliked(false)}}><ThumbsUp size={18} fill={liked?'currentColor':'none'}/> 2.8만</button><i/><button type="button" aria-label="싫어요" aria-pressed={disliked} onClick={()=>{setDisliked(!disliked);setLiked(false)}}><ThumbsDown size={18} fill={disliked?'currentColor':'none'}/></button></div><button type="button" className="yt-share" onClick={onShare}><Share2 size={19} fill="currentColor"/> 공유</button><button type="button"><RefreshCw size={18}/> 리믹스</button><button type="button"><Download size={18}/> 오프라인 저장</button></div>
      <div className="yt-comments"><div className="yt-comments-head"><strong>댓글 <span>4.9천</span></strong></div><div className="yt-comment-input"><span className="yt-comment-avatar">🌆</span><span>댓글 올리기...</span></div></div>
      <div className="yt-recommendation"><div className="yt-recommendation-image"><span>15:43</span></div><div className="yt-recommendation-meta"><span className="yt-recommendation-avatar">김</span><div><strong>프랑스 학생들의 시위가 정치 싸움이 된 이유? | 프랑스, 파리, 시위</strong><p>김지윤의 지식Play · ▷ 283만회 · 13일 전</p></div><button type="button" aria-label="추천 영상 더보기"><MoreHorizontal size={21}/></button></div></div>
    </div></div>;
}
function ShareSheet({onClose,onSelect,videoUrl}:{onClose:()=>void;onSelect:()=>void;videoUrl:string}){
  useEffect(()=>{const handleKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};window.addEventListener('keydown',handleKey);return()=>window.removeEventListener('keydown',handleKey)},[onClose]);
  const copyLink=()=>{void navigator.clipboard?.writeText(videoUrl);onClose()};
  return <div className="sheet-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><div className="share-sheet ios-share-sheet" role="dialog" aria-modal="true" aria-labelledby="share-title"><div className="sheet-handle"/><div className="ios-share-preview"><div className="ios-preview-thumb"/><div className="ios-preview-copy"><strong id="share-title">{VIDEO_TITLE}</strong><span>youtube.com</span></div><button type="button" className="ios-share-close" aria-label="공유 창 닫기" onClick={onClose}><X size={19}/></button></div><div className="share-apps ios-share-apps"><button type="button" onClick={copyLink}><span className="share-app-icon airdrop-app"><span className="airdrop-symbol">◉</span></span><span>AirDrop</span></button><button type="button"><span className="share-app-icon message-app"><MessageCircle size={31} fill="white" strokeWidth={1.5}/></span><span>메시지</span></button><button type="button"><span className="share-app-icon mail-app"><Mail size={32} strokeWidth={1.6}/></span><span>메일</span></button><button type="button" className="won-app-choice" onClick={onSelect}><span className="share-app-icon won-app"><span className="won-app-mark"><i/><i/></span><strong>WON</strong></span><span>WON MTS</span></button><button type="button"><span className="share-app-icon more-app">•••</span><span>더보기</span></button></div><div className="share-options ios-share-options"><button type="button" onClick={copyLink}><span className="share-option-icon"><Copy size={24}/></span>링크 복사</button><button type="button"><span className="share-option-icon"><MessageCircle size={24}/></span>메시지로 보내기</button><button type="button"><span className="share-option-icon"><SquarePen size={24}/></span>게시물 작성</button><button type="button"><span className="share-option-icon"><RefreshCw size={25}/></span>리믹스</button></div></div></div>;
}
function LoadingScreen({error,onRetry}:{error:string;onRetry:()=>void}){
  const [step,setStep]=useState(0);
  useEffect(()=>{if(error)return;const timer=window.setInterval(()=>setStep(current=>Math.min(current+1,3)),850);return()=>window.clearInterval(timer)},[error]);
  const steps=[['영상 정보 분석 중','유튜브 영상의 주요 주장을 추출하고 있어요.'],['공식 자료 검색 중','DART 등 공식 자료를 기반으로 확인하고 있어요.'],['사실 여부 검증 중','AI가 근거를 비교하고 검증하고 있어요.'],['개인화 분석 중','나의 투자 성향에 맞춰 위험을 분석하고 있어요.']];
  return <main className="loading-screen screen-enter" aria-live="polite">{error?<><div className="error-icon"><AlertCircle size={34}/></div><span className="overline">분석을 완료하지 못했어요</span><h1>잠시 후 다시 시도해 주세요</h1><p>{error}</p><button type="button" className="primary-button" onClick={onRetry}><RotateCcw size={18}/> 다시 분석하기</button></>:<><div className="loading-orbit"><span className="orbit-ring ring-one"/><span className="orbit-ring ring-two"/><span className="loading-core"/><span className="orbit-spark spark-one">✦</span><span className="orbit-spark spark-two">✦</span><span className="orbit-spark spark-three">✦</span></div><h1>WON Check</h1><p>유튜브 속 투자 정보를<br/>AI가 공식 자료로 확인하고,<br/>나의 포트폴리오에 맞춰 분석해드려요.</p><div className="progress-list">{steps.map(([name,description],index)=><div key={name} className={`progress-item ${index<step?'done':index===step?'active':''}`}><span className="progress-symbol">{index<step?<Check size={16}/>:null}</span><span className="progress-copy"><strong>{name}</strong><small>{description}</small></span>{index===step&&<MoreHorizontal className="progress-pulse" size={22}/>}</div>)}</div><div className="loading-note"><span><ShieldCheck size={20}/></span><p>WON Check는 공식 자료에 기반하여<br/>객관적으로 분석합니다.</p></div></>}</main>;
}
function ResultScreen({result,user,onProfileChange,onBack}:{result:Analysis;user:string;onProfileChange:(id:string)=>void;onBack:()=>void}){
  const profile=profiles.find(item=>item.id===user)??profiles[0];
  const date=new Date(result.analyzed_at);
  const formattedDate=Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(date);
  return <main className="results screen-enter"><section className="result-hero"><div className="hero-glow"/><div className="hero-content"><span className="hero-eyebrow"><Sparkles size={15}/> AI FACT CHECK</span><h1>이 영상의 투자 정보,<br/><strong>확인해 봤어요</strong></h1><p>주장마다 근거를 살펴보고<br/>내 투자 상황에 맞춰 정리했어요.</p><div className="hero-meta"><Clock3 size={14}/> {formattedDate} 분석 {USE_MOCK&&<span className="mock-badge">DEMO</span>}</div></div><div className="hero-illustration"><ShieldCheck size={51}/></div></section>
    <div className="result-body"><div className="context-card"><span className="context-icon"><Play size={14} fill="currentColor"/></span><div><small>분석한 영상</small><strong>{result.video.title}</strong></div><ChevronRight size={18}/></div>{USE_MOCK&&<div className="demo-notice"><AlertCircle size={18}/><span>시연용 결과입니다. 가상의 영상과 프로필을 사용하며, 실제 기업의 재무 수치를 검증한 결과가 아닙니다.</span></div>}
      <section className="result-section" aria-labelledby="verification-title"><div className="section-title"><div><span className="section-kicker">01 · FACT CHECK</span><h2 id="verification-title">주장별 사실 검증</h2></div><span className="count-badge">{result.verification_results.length}건</span></div><p className="section-description">결과 상태에 따라 구분해 확인할 수 있어요.</p><div className="status-legend">{(['SUPPORTED','CONTRADICTED','INSUFFICIENT_EVIDENCE','PREDICTION'] as const).map(status=>{const entry=statusMap[status];return <span className={`legend-item ${entry.tone}`} key={status}><span/>{entry.short}</span>})}</div><div className="claims-list">{result.verification_results.map((item,index)=>{const status=statusMap[item.status];const Icon=status.icon;return <article className={`claim-card ${status.tone}`} key={item.claim_id}><div className="claim-heading"><span className="claim-number">CLAIM {String(index+1).padStart(2,'0')}</span><span className={`status-pill ${status.tone}`}><Icon size={15}/>{status.label}</span></div><h3>{item.claim}</h3><div className="claim-reason"><span>검증 내용</span><p>{item.reason}</p></div>{item.sources.length>0?<div className="source-list"><span>공식 근거</span>{item.sources.map(source=><a key={source.document_id} href={source.source_url} target="_blank" rel="noopener noreferrer"><span className="source-link-icon"><ExternalLink size={15}/></span><span><strong>{source.title}</strong><small>{source.period}</small></span><ArrowUpRight size={18}/></a>)}</div>:<div className="source-empty"><HelpCircle size={16}/>{item.status==='PREDICTION'?'미래 전망에는 확인 가능한 공시 근거가 없습니다.':'판단에 필요한 공식 문서가 연결되지 않았습니다.'}</div>}</article>})}</div></section>
      <section className="result-section risk-section" aria-labelledby="risk-title"><div className="section-title"><div><span className="section-kicker">02 · PERSONAL RISK</span><h2 id="risk-title">나에게 맞는 위험 분석</h2></div></div><p className="section-description">같은 영상도 투자 상황에 따라 다르게 살펴봐야 해요.</p><label className="profile-label" htmlFor="profile-select">분석 프로필</label><div className="profile-select-wrap"><span className="profile-avatar">{profile.label.charAt(0)}</span><select id="profile-select" value={user} onChange={event=>onProfileChange(event.target.value)}>{profiles.map(item=><option key={item.id} value={item.id}>{item.label} · {item.detail}</option>)}</select><ChevronDown size={19}/></div><div className="risk-card"><div className="risk-card-top"><span className="risk-icon"><ShieldCheck size={22}/></span><div><small>{profile.label}의 투자 상황</small><strong>{profile.allocation}</strong></div><span className={`risk-level ${profile.level==='주의'?'caution':''}`}>{profile.level}</span></div><div className="risk-divider"/><h3>이 영상을 볼 때 살펴보세요</h3><p>{result.personalized_analysis.summary}</p><ul>{result.personalized_analysis.risk_factors.map((factor,index)=><li key={`${index}-${factor}`}><span><Check size={13}/></span>{factor}</li>)}</ul></div></section>
      <div className="footer-disclaimer"><ShieldCheck size={18}/><p>WON Check는 투자 판단을 돕기 위한 정보 서비스입니다. 분석 결과는 투자 권유나 수익 보장이 아니며, 투자 결정 전 공식 공시와 상품 설명서를 확인해 주세요.</p></div><button type="button" className="back-to-video" onClick={onBack}>영상으로 돌아가기 <ArrowUpRight size={18}/></button></div>
  </main>;
}
export default function App(){
  const [page,setPage]=useState<Page>('youtube');const [share,setShare]=useState(false);const [user,setUser]=useState(profiles[0].id);const [result,setResult]=useState<Analysis|null>(null);const [error,setError]=useState('');const [videoUrl]=useState(VIDEO_URL);
  async function run(id=user){setShare(false);setError('');setPage('loading');try{const data=await analyze(videoUrl,id);setResult(data);setPage('results')}catch(cause){setError(cause instanceof Error?cause.message:'알 수 없는 오류가 발생했습니다.')}}
  function changeProfile(id:string){setUser(id);void run(id)}
  return <div className="app-shell"><div className="phone"><div className={`system-bar ${page==='youtube'?'yt-system-bar':''}`} aria-hidden="true"><strong>9:41</strong><div className="system-icons"><span className="signal-icon"/><span className="wifi-icon"/><span className="battery-icon"/></div></div>{page==='youtube'?<YoutubeScreen onShare={()=>setShare(true)}/>:<><header className="mts-header"><div className="mts-brand"><span className="mts-mark"><i/><i/></span><span>우리<strong>WON</strong> MTS</span></div><button className="back-button" type="button" aria-label="영상으로 돌아가기" onClick={()=>{setPage('youtube');setError('')}}><X size={24}/></button></header>{page==='loading'?<LoadingScreen error={error} onRetry={()=>void run()}/>:result&&<ResultScreen result={result} user={user} onProfileChange={changeProfile} onBack={()=>setPage('youtube')}/>}</>}<div className={`home-bar ${page==='youtube'?'yt-home-bar':''}`} aria-hidden="true"><span/></div>{share&&<ShareSheet onClose={()=>setShare(false)} onSelect={()=>void run()} videoUrl={videoUrl}/>}</div></div>;
}
