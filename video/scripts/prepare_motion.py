"""Derive a deterministic 30fps mouth envelope from existing local WAV files."""
from array import array
import json
import math
from pathlib import Path
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
timeline = json.loads((ROOT/'scenes/hynix.json').read_text())
fps = timeline['fps']
levels = [0.0] * timeline['durationInFrames']
for scene in timeline['scenes']:
    with wave.open(str(ROOT/'public'/scene['audio'])) as f:
        assert f.getsampwidth() == 2, 'Expected 16-bit PCM'
        samples = array('h', f.readframes(f.getnframes()))
        if sys.byteorder != 'little':
            samples.byteswap()
        channels, sr = f.getnchannels(), f.getframerate()
    for frame in range(math.ceil(scene['audioSeconds']*fps)):
        start = round(frame*sr/fps)*channels
        end = round((frame+1)*sr/fps)*channels
        chunk = samples[start:end]
        rms = math.sqrt(sum(x*x for x in chunk)/max(1,len(chunk)))/32768
        target = scene['from']+scene['audioFrom']+frame
        if target < len(levels):
            levels[target] = rms
nonzero = sorted(x for x in levels if x > 0.0001)
reference = nonzero[round((len(nonzero)-1)*.92)] if nonzero else 1
envelope = [round(min(1,x/max(reference,0.001)),3) for x in levels]
mouth = []
state = 0
last_change = -10
for frame, amp in enumerate(envelope):
    # Close immediately in silence; otherwise hold a pose for >=2 frames.
    wanted = 0 if amp < .09 else (1 if amp < .48 else 2)
    if wanted != state and (wanted == 0 or frame-last_change >= 2):
        state, last_change = wanted, frame
    mouth.append(state)
data = {
    'fps':fps,'frames':len(mouth),'method':'local WAV RMS; simple mouth poses, not phoneme alignment',
    'mouthStates':mouth,'amplitude':envelope,
    'blinkCenters':[66,172,291,409,533,648,778,865],
}
(ROOT/'scenes/hynix-motion.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
counts = {str(i):mouth.count(i) for i in range(3)}
assert mouth.count(0)>0 and mouth.count(1)>0 and mouth.count(2)>0
print(f'Motion prepared: {len(mouth)} frames, mouth states {counts}, 8 blink beats; no API calls.')
