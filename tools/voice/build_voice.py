"""全セリフを Kokoro で音声にして voice/<声>/ に mp3 と manifest.json を書き出す
使い方: python3 build_voice.py <voice名> <出力フォルダ> [speed]"""
import sys, os, json, hashlib, subprocess, numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(__file__))
from kokoro_tts import synth
from voice_lines import lines

# 画面のセリフ（キー）と、実際に読ませる文がちがうもの（数えるときは のばして元気に）
SPOKEN = {"いち": "いーち！", "に": "にー！", "さん": "さーん！"}

def trim(wav, sr=24000, th=0.01):
    idx = np.where(np.abs(wav) > th)[0]
    if len(idx) == 0: return wav
    a, b = max(0, idx[0] - int(sr * .03)), min(len(wav), idx[-1] + int(sr * .08))
    return wav[a:b]

def main(voice, outdir, speed):
    os.makedirs(outdir, exist_ok=True)
    manifest = {}
    for text in lines():
        _, wav = synth(voice, SPOKEN.get(text, text), speed)
        wav = trim(wav)
        wav = wav / (np.max(np.abs(wav)) + 1e-9) * 0.89      # 音量をそろえる（-1dB くらい）
        name = hashlib.md5(text.encode()).hexdigest()[:10] + ".mp3"
        tmp = f"/tmp/{name}.wav"
        sf.write(tmp, wav, 24000)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp, "-ac", "1", "-b:a", "64k", f"{outdir}/{name}"], check=True)
        os.remove(tmp)
        manifest[text] = name
    json.dump({"voice": voice, "speed": speed, "clips": manifest}, open(f"{outdir}/manifest.json", "w"), ensure_ascii=False, indent=1)
    print(voice, len(manifest), "clips")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 0.9)
