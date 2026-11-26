"""台本（script/episode.json）の台詞を VOICEVOX で合成し、長さと口パク用の音量を書き出す。

前提: VOICEVOX エンジンが http://127.0.0.1:50021 で動いていること
  （VOICEVOX アプリを起動するか、docker run -d -p 50021:50021 voicevox/voicevox_engine:cpu-latest）
使い方: python scripts/make-voices.py            すべて作り直す
        python scripts/make-voices.py --changed  原稿が変わった台詞だけ作り直す
出力: public/voice/<id>.wav と .mp3（動画は MP3 を使う）、src/data/voice.json（長さと1フレームごとの音量）、script/readings.txt（読みの確認用）
クレジット表記が必要: VOICEVOX:ずんだもん、VOICEVOX:春日部つむぎ
"""
import hashlib, io, json, re, sys, urllib.parse, urllib.request, wave
from array import array
from pathlib import Path

ENGINE = 'http://127.0.0.1:50021'
SPEAKERS = {'z': 3, 't': 8}  # ずんだもん（ノーマル）、春日部つむぎ（ノーマル）
SPEED = {'z': 1.08, 't': 1.06}
COMMA_PAUSE = 1.4
SENTENCE_GAP = 0.45
FPS = 30
# 誤読しやすい語は、合成するときだけ読みを差し替える（字幕は元のまま）
READINGS = [('宮古側', '宮古がわ'), ('先島', 'サキシマ'), ('石垣島', '石垣じま'), ('下地島', 'シモジシマ'), ('新石垣', 'しんいしがき'),
            ('与那国島', 'ヨナグニジマ'), ('八重山', 'やえやま'), ('駐機', 'ちゅうき'), ('1.6倍', 'いってんろく倍'),
            ('1.5倍', 'いってんご倍'), ('PRCC', 'ピーアールシーシー')]

ROOT = Path(__file__).resolve().parent.parent
EP = json.loads((ROOT / 'script/episode.json').read_text())
OUT = ROOT / 'public/voice'
OUT.mkdir(parents=True, exist_ok=True)
META = ROOT / 'src/data/voice.json'
old = json.loads(META.read_text()) if META.exists() else {}
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

def post(path, params, body=None):
    req = urllib.request.Request(f'{ENGINE}{path}?{urllib.parse.urlencode(params)}', data=body or b'',
                                 method='POST', headers={'Content-Type': 'application/json'})
    with opener.open(req) as r:
        return r.read()

NUM = r'(イッ|イチ|ニ|サン|ヨン|ゴ|ロッ|ロク|ナナ|ハッ|ハチ|キュウ|ジュッ|ジュウ|ヒャク|ピャク|ビャク|セン|ゼン|マン)'
def merge_numbers(aps):
    # 「ヒャク／サンジュウニマンニン」と割れて途切れて聞こえる数を、ひとつの句につなぐ
    out = []
    for ap in aps:
        if out:
            prev = out[-1]
            pt = ''.join(m['text'] for m in prev['moras']); nt = ''.join(m['text'] for m in ap['moras'])
            if not prev['pause_mora'] and re.fullmatch(NUM + '+', pt) and re.match(NUM, nt):
                prev['accent'] = len(prev['moras']) + ap['accent']
                prev['moras'] = prev['moras'] + ap['moras']
                prev['pause_mora'] = ap['pause_mora']
                continue
        out.append(ap)
    return out

def synth(text, who):
    sp = SPEAKERS[who]
    q = json.loads(post('/audio_query', {'text': text, 'speaker': sp}))
    merged = merge_numbers(q['accent_phrases'])
    if len(merged) != len(q['accent_phrases']):
        q['accent_phrases'] = json.loads(post('/mora_data', {'speaker': sp}, json.dumps(merged).encode()))
    q.update(speedScale=SPEED[who], pauseLengthScale=COMMA_PAUSE, prePhonemeLength=0.05, postPhonemeLength=0.08, volumeScale=1.0)
    kana = '/'.join(''.join(m['text'] for m in ap['moras']) + ('、' if ap['pause_mora'] else '') for ap in q['accent_phrases'])
    wav = post('/synthesis', {'speaker': sp}, json.dumps(q).encode())
    with wave.open(io.BytesIO(wav)) as w:
        return w.getframerate(), w.readframes(w.getnframes()), kana

def tts_text(text):
    for a, b in READINGS:
        text = text.replace(a, b)
    return text

only_changed = '--changed' in sys.argv
meta, readings = {}, []
for e in EP:
    if 'who' not in e:
        continue
    t = tts_text(e['text'])
    key = hashlib.sha1(f"{e['who']}|{t}|{SPEED[e['who']]}|{COMMA_PAUSE}|{SENTENCE_GAP}".encode()).hexdigest()[:12]
    path = OUT / f"{e['id']}.wav"
    if only_changed and old.get(e['id'], {}).get('key') == key and path.exists():
        meta[e['id']] = old[e['id']]; continue
    sentences = [x for x in re.split(r'(?<=[。？！])', t) if x.strip()]
    parts, sr, kanas = [], 24000, []
    for k, s in enumerate(sentences):
        sr, pcm, kana = synth(s, e['who'])
        parts.append(pcm); kanas.append(kana)
        if k < len(sentences) - 1:
            parts.append(b'\0\0' * int(sr * SENTENCE_GAP))
    pcm = b''.join(parts)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm)
    # 口パク用：1フレームごとの音量（0〜1）
    a = array('h'); a.frombytes(pcm)
    step = sr // FPS
    env = []
    for i in range(0, len(a), step):
        seg = a[i:i + step]
        env.append((sum(x * x for x in seg) / max(1, len(seg))) ** 0.5)
    peak = max(env) or 1
    meta[e['id']] = {'key': key, 'dur': round(len(a) / sr, 3), 'env': [round(min(1, x / (peak * 0.7)), 2) for x in env]}
    readings.append(f"{e['id']} {e['who']} {' | '.join(kanas)}")
    print(e['id'], e['who'], round(len(a) / sr, 2), 's', flush=True)

META.write_text(json.dumps(meta, ensure_ascii=False))
# 動画は MP3 を読む（リポジトリを軽くするため）。ffmpeg で変換する
import shutil, subprocess
if shutil.which('ffmpeg'):
    for e in EP:
        if 'who' in e:
            w, m = OUT / f"{e['id']}.wav", OUT / f"{e['id']}.mp3"
            if w.exists() and (not m.exists() or m.stat().st_mtime < w.stat().st_mtime):
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(w), '-c:a', 'libmp3lame', '-b:a', '96k', str(m)], check=True)
else:
    print('ffmpeg が見つかりません。public/voice/*.wav を MP3 に変換してください')
if readings:
    (ROOT / 'script/readings.txt').write_text('\n'.join(readings) + '\n')
print('total', round(sum(m['dur'] for m in meta.values()), 1), 's,', len(meta), 'lines')
