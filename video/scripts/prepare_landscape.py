"""Prepare two 16:9 timelines with installed macOS voices. Never reads API keys."""
from array import array
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import wave

ROOT=Path(__file__).resolve().parents[1]
FPS=30
CONFIG={
    'samsung':{
        'videoId':'WCdemoS1V01','character':'jeong','presenter':'정대리',
        'voice':'Reed (한국어(대한민국))','rate':135,
        'spoken':[
            '삼성전자, 영업이익 백조 시대입니다!',
            '이천이십육 년 삼 분기 영업이익이 백칠조 원을 넘었습니다.',
            '매출도 한 분기에 이백조 원을 돌파했어요.',
            '제 생각엔 내년 주가 두 배, 그냥 갑니다.',
            '지금 안 사면 늦어요. 나중에 후회하지 마세요.',
            '구독하고 다음 소식도 받아보세요.',
        ],
        'expected':[
            '삼성전자, 영업이익 100조 시대입니다!',
            '2026년 3분기 영업이익이 107조 원을 넘었습니다.',
            '매출도 한 분기에 200조 원을 돌파했어요.',
            '제 생각엔 내년 주가 두 배, 그냥 갑니다.',
            '지금 안 사면 늦어요. 나중에 후회하지 마세요.',
            '구독하고 다음 소식도 받아보세요.',
        ],
        'preferred':[120,210,150,180,150,90],
        'captions':[
            [['삼성전자, 영업이익 100조 시대입니다!']],
            [['2026년 3분기 영업이익이','107조 원을 넘었습니다.']],
            [['매출도 한 분기에','200조 원을 돌파했어요.']],
            [['제 생각엔 내년 주가 두 배, 그냥 갑니다.']],
            [['지금 안 사면 늦어요.'],['나중에 후회하지 마세요.']],
            [['구독하고 다음 소식도 받아보세요.']],
        ],
    },
    'hyundai':{
        'videoId':'WCdemoS3V03','character':'chaewon','presenter':'이채원','voice':'Yuna','rate':105,
        'spoken':[
            '현대차 보유자분들, 주목하세요.',
            '이천이십육 년 일 분기 영업이익이 전년보다 삼십 퍼센트 넘게 줄었습니다.',
            '이 분기는 아예 영업 적자로 돌아섰어요.',
            '제 생각엔 내년 이익이 반토막 납니다.',
            '더 버티다가는 늦어요.',
            '보유자분들, 지금 파세요.',
        ],
        'expected':[
            '현대차 보유자분들, 주목하세요.',
            '2026년 1분기 영업이익이 전년보다 30% 넘게 줄었습니다.',
            '2분기는 아예 영업 적자로 돌아섰어요.',
            '제 생각엔 내년 이익이 반토막 납니다.',
            '더 버티다가는 늦어요.',
            '보유자분들, 지금 파세요.',
        ],
        'preferred':[90,240,180,180,120,90],
        'captions':[
            [['현대차 보유자분들, 주목하세요.']],
            [['2026년 1분기 영업이익이','전년보다 30% 넘게 줄었습니다.']],
            [['2분기는 아예 영업 적자로 돌아섰어요.']],
            [['제 생각엔 내년 이익이 반토막 납니다.']],
            [['더 버티다가는 늦어요.']],
            [['보유자분들, 지금 파세요.']],
        ],
    },
}

def read_wave(path):
    with wave.open(str(path)) as f:
        assert f.getsampwidth()==2
        values=array('h',f.readframes(f.getnframes()))
        if sys.byteorder!='little':values.byteswap()
        return values,f.getframerate(),f.getnchannels()

def synthesize(kind,cfg,rate):
    cache=ROOT/'.cache/speech';cache.mkdir(parents=True,exist_ok=True)
    output=ROOT/'public/assets/audio'/kind;output.mkdir(parents=True,exist_ok=True)
    durations=[]
    for i,text in enumerate(cfg['spoken']):
        key=hashlib.sha256(f"{cfg['voice']}|{rate}|{text}".encode()).hexdigest()[:16]
        wav=cache/f'{key}.wav'
        if not wav.exists():
            txt=cache/f'{key}.txt';txt.write_text(text)
            aiff=cache/f'{key}.aiff'
            subprocess.run(['say','-v',cfg['voice'],'-r',str(rate),'-f',str(txt),'-o',str(aiff)],check=True,capture_output=True)
            subprocess.run(['afconvert','-f','WAVE','-d','LEI16@44100',str(aiff),str(wav)],check=True,capture_output=True)
        target=output/f'scene-{i+1:02}.wav';target.write_bytes(wav.read_bytes())
        values,sr,channels=read_wave(target);durations.append(len(values)/channels/sr)
    return durations

def time_srt(frame):
    ms=round(frame/FPS*1000)
    return f'00:00:{ms//1000:02},{ms%1000:03}'

def prepare(kind):
    cfg=CONFIG[kind]
    source=json.loads((ROOT.parent/'data/transcripts.json').read_text())[cfg['videoId']]
    assert [x['text'] for x in source['segments']]==cfg['expected'],'Review source text and pronunciation first'
    rate=cfg['rate']
    for attempt in range(5):
        lengths=synthesize(kind,cfg,rate)
        minimum=[math.ceil(x*FPS)+10 for x in lengths]
        if sum(minimum)<=900:break
        rate+=20
    else:raise SystemExit('Narration does not fit; nothing was truncated')
    extra=900-sum(minimum)
    weights=[max(0,a-b) for a,b in zip(cfg['preferred'],minimum)]
    if not sum(weights):weights=[1]*len(minimum)
    add=[math.floor(extra*x/sum(weights)) for x in weights]
    for i in range(extra-sum(add)):add[i%len(add)]+=1
    slots=[a+b for a,b in zip(minimum,add)]
    scenes=[];cursor=0;subs=[];levels=[0.0]*900
    for i,(src,spoken,seconds,frames) in enumerate(zip(source['segments'],cfg['spoken'],lengths,slots)):
        groups=cfg['captions'][i]
        speech_frames=math.ceil(seconds*FPS)
        w=[len(''.join(x)) for x in groups];subtitles=[];last=0
        for j,lines in enumerate(groups):
            end=round(speech_frames*sum(w[:j+1])/sum(w))
            subtitles.append({'from':4+last,'to':4+end,'lines':lines})
            subs.append(f'{len(subs)+1}\n{time_srt(cursor+4+last)} --> {time_srt(cursor+4+end)}\n'+ '\n'.join(lines)+'\n')
            last=end
        audio=f'assets/audio/{kind}/scene-{i+1:02}.wav'
        values,sr,channels=read_wave(ROOT/'public'/audio)
        for f in range(speech_frames):
            chunk=values[round(f*sr/FPS)*channels:round((f+1)*sr/FPS)*channels]
            at=cursor+4+f
            if at<900:levels[at]=math.sqrt(sum(x*x for x in chunk)/max(1,len(chunk)))/32768
        scenes.append({'id':i,'from':cursor,'durationInFrames':frames,'audioFrom':4,'audio':audio,
            'audioSeconds':round(seconds,4),'text':src['text'],'spokenText':spoken,'caption':src['caption'],'subtitles':subtitles})
        cursor+=frames
    positive=sorted(x for x in levels if x>.0001)
    ref=positive[round((len(positive)-1)*.92)] if positive else 1
    amplitude=[round(min(1,x/max(ref,.001)),3) for x in levels]
    states=[];state=0;changed=-10
    for frame,amp in enumerate(amplitude):
        wanted=0 if amp<.09 else 1
        if wanted!=state and (wanted==0 or frame-changed>=2):state,changed=wanted,frame
        states.append(state)
    manifest={'videoId':cfg['videoId'],'kind':kind,'presenter':cfg['presenter'],'character':cfg['character'],
        'width':1920,'height':1080,'fps':FPS,'durationInFrames':900,'durationSeconds':30,
        'voice':{'engine':'macOS say (offline)','name':cfg['voice'],'rate':rate},
        'transcriptSha256':hashlib.sha256(source['transcript'].encode()).hexdigest(),
        'paidApiCalls':0,'scenes':scenes}
    motion={'frames':900,'fps':30,'mouthStates':states,'amplitude':amplitude,'blinkCenters':[66,174,288,411,530,644,773,861]}
    (ROOT/'scenes'/f'{kind}.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'scenes'/f'{kind}-motion.json').write_text(json.dumps(motion,separators=(',',':'))+'\n')
    (ROOT/'scenes'/f'{kind}.srt').write_text('\n'.join(subs))
    print(f'{kind}: {cfg["presenter"]}, voice={cfg["voice"]}, rate={rate}, speech={sum(lengths):.2f}s, timeline={cursor/FPS:.2f}s')
    for s in scenes:print(f'  {s["id"]+1}: {s["from"]/FPS:.2f}s, slot={s["durationInFrames"]/FPS:.2f}s, voice={s["audioSeconds"]:.2f}s')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--kind',choices=['samsung','hyundai','all'],default='all');args=parser.parse_args()
    for kind in CONFIG if args.kind=='all' else [args.kind]:prepare(kind)
