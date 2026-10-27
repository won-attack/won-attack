"""Create a 30-second timeline using macOS offline speech. No API or dotenv access."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import platform
import subprocess
import wave

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
VIDEO_ID = 'WCdemoS2V02'
FPS = 30
TOTAL_FRAMES = 900

# Pronunciation-only forms: numbers, names and meanings match transcripts.json.
SPOKEN = [
    '에스케이하이닉스, 실적으로 보겠습니다.',
    '이천이십육 년 이 분기 영업이익은 육십 조 원 이상, 이익률은 칠십육 퍼센트입니다.',
    '매출은 팔십 조 원을 돌파했어요.',
    '삼 분기 영업이익은 칠십칠 조 원으로 이미 확정됐습니다.',
    '보유하신 분들도 지금 비중을 늘리세요.',
]
CAPTIONS = [
    [['SK하이닉스,', '실적으로 보겠습니다.']],
    [['2026년 2분기 영업이익은'], ['60조 원 이상,'], ['이익률은 76%입니다.']],
    [['매출은 80조 원을', '돌파했어요.']],
    [['3분기 영업이익은'], ['77조 원으로', '이미 확정됐습니다.']],
    [['보유하신 분들도', '지금 비중을 늘리세요.']],
]

def run(args):
    subprocess.run(args, check=True, capture_output=True)

def duration(path):
    with wave.open(str(path)) as f:
        return f.getnframes() / f.getframerate()

def srt_time(frame):
    ms = round(frame / FPS * 1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--voice', default='Yuna')
    parser.add_argument('--rate', type=int, default=85)
    args = parser.parse_args()
    if platform.system() != 'Darwin':
        raise SystemExit('Local narration preparation requires macOS say and afconvert.')
    script = json.loads((REPO/'data/transcripts.json').read_text())[VIDEO_ID]
    expected = [
        'SK하이닉스, 실적으로 보겠습니다.',
        '2026년 2분기 영업이익은 60조 원 이상, 이익률은 76%입니다.',
        '매출은 80조 원을 돌파했어요.',
        '3분기 영업이익은 77조 원으로 이미 확정됐습니다.',
        '보유하신 분들도 지금 비중을 늘리세요.',
    ]
    actual = [s['text'] for s in script['segments']]
    if actual != expected:
        raise SystemExit('Source script changed: review pronunciation and captions before regenerating.')
    audio = ROOT/'public/assets/audio/hynix'
    cache = ROOT/'.cache/speech'
    audio.mkdir(parents=True, exist_ok=True)
    cache.mkdir(parents=True, exist_ok=True)
    lengths = []
    for i, spoken in enumerate(SPOKEN):
        key = hashlib.sha256(f'{args.voice}|{args.rate}|{spoken}'.encode()).hexdigest()[:16]
        wav = cache/f'{key}.wav'
        if not wav.exists():
            txt = cache/f'{key}.txt'
            aiff = cache/f'{key}.aiff'
            txt.write_text(spoken)
            run(['say', '-v', args.voice, '-r', str(args.rate), '-f', str(txt), '-o', str(aiff)])
            run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@44100', str(aiff), str(wav)])
        dest = audio/f'scene-{i+1:02}.wav'
        dest.write_bytes(wav.read_bytes())
        lengths.append(duration(dest))
    # Speech gets an 0.15s lead-in and >=0.2s tail. No truncation or speedup.
    minimums = [math.ceil(d*FPS)+11 for d in lengths]
    available = TOTAL_FRAMES-sum(minimums)
    if available < 0:
        raise SystemExit(f'Voice is too long ({sum(lengths):.2f}s). Review rate/script; nothing was cut.')
    preferred = [120,270,150,210,150]
    slack = [max(0, p-m) for p,m in zip(preferred, minimums)]
    denom = sum(slack) or len(slack)
    additions = [math.floor(available*(s if sum(slack) else 1)/denom) for s in slack]
    for i in range(available-sum(additions)):
        additions[i%len(additions)] += 1
    frames = [m+a for m,a in zip(minimums,additions)]
    scenes=[]
    cursor=0
    srt=[]
    for i,(seg,spoken,d,n) in enumerate(zip(script['segments'],SPOKEN,lengths,frames)):
        speech_frames=math.ceil(d*FPS)
        groups=CAPTIONS[i]
        weights=[len(''.join(g)) for g in groups]
        cap_cursor=0
        captions=[]
        for j,(group,weight) in enumerate(zip(groups,weights)):
            end=round(speech_frames*sum(weights[:j+1])/sum(weights))
            captions.append({'from':5+cap_cursor,'to':5+end,'lines':group})
            srt.append(f'{len(srt)+1}\n{srt_time(cursor+5+cap_cursor)} --> {srt_time(cursor+5+end)}\n'+ '\n'.join(group)+'\n')
            cap_cursor=end
        scenes.append({
            'id':i,'from':cursor,'durationInFrames':n,'audioFrom':5,
            'audio':f'assets/audio/hynix/scene-{i+1:02}.wav',
            'audioSeconds':round(d,4),'text':seg['text'],'spokenText':spoken,
            'caption':seg['caption'],'subtitles':captions,
        })
        cursor+=n
        print(f'Scene {i+1}: speech {d:.2f}s / slot {n/FPS:.2f}s')
    manifest={
        'videoId':VIDEO_ID,'fps':FPS,'width':1080,'height':1920,
        'durationInFrames':TOTAL_FRAMES,'durationSeconds':30,
        'voice':{'engine':'macOS say (offline)','name':args.voice,'rate':args.rate},
        'transcriptSha256':hashlib.sha256(script['transcript'].encode()).hexdigest(),
        'containsIntentionalFalseClaims':True,'paidApiCalls':0,'scenes':scenes,
    }
    (ROOT/'scenes').mkdir(exist_ok=True)
    (ROOT/'scenes/hynix.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'scenes/hynix.srt').write_text('\n'.join(srt))
    print(f'Total: {cursor/FPS:.2f}s; speech {sum(lengths):.2f}s; paid API calls: 0')

if __name__ == '__main__':
    main()
