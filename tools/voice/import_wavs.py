"""VOICEVOX などで書き出した wav（セリフ1つ＝1ファイル）を取り込んで voice/ を作り直す。
ファイル名の先頭の番号（001_..., 002_...）の順番が「VOICEVOX用セリフ.txt」の行の順番と同じだとみなす。
使い方: python3 import_wavs.py <wavのフォルダ> <出力フォルダ(voice)> <クレジット表記 例: VOICEVOX:ずんだもん>"""
import sys, os, re, json, glob, hashlib, subprocess
sys.path.insert(0, os.path.dirname(__file__))
from voice_lines import lines

def main(src, outdir, credit):
    wavs = sorted(glob.glob(os.path.join(src, "**", "*.wav"), recursive=True),
                  key=lambda p: int(re.match(r"\D*(\d+)", os.path.basename(p)).group(1)))
    L = lines()
    if len(wavs) != len(L):
        sys.exit(f"wav が {len(wavs)} 個、セリフが {len(L)} 個で数が合いません")
    os.makedirs(outdir, exist_ok=True)
    for f in glob.glob(os.path.join(outdir, "*.mp3")):
        os.remove(f)
    clips = {}
    for text, wav in zip(L, wavs):
        name = hashlib.md5(text.encode()).hexdigest()[:10] + ".mp3"
        # 前後の無音をけずり、音量をそろえて、モノラル64kbpsのmp3に
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-af",
                        "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5",
                        "-ac", "1", "-ar", "24000", "-b:a", "64k", os.path.join(outdir, name)], check=True)
        clips[text] = name
    json.dump({"voice": credit, "credit": credit, "clips": clips},
              open(os.path.join(outdir, "manifest.json"), "w"), ensure_ascii=False, indent=1)
    print(len(clips), "clips →", outdir)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "")
