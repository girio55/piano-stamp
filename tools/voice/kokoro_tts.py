"""Kokoro（ONNX）で 日本語の文を wav にする小さなスクリプト
使い方: python3 kokoro_tts.py <voice名> <出力.wav> <文> [speed]"""
import sys, json, numpy as np, soundfile as sf, onnxruntime as ort
from misaki import ja

BASE = "/home/claude/tts"
VOCAB = json.load(open(f"{BASE}/kwheel/kokoro_onnx/config.json"))["vocab"]
SESSION = ort.InferenceSession(f"{BASE}/kokoro/model_q8.onnx")
G2P = ja.JAG2P()

def synth(voice, text, speed=1.0):
    ph = G2P(text)
    ph = ph[0] if isinstance(ph, tuple) else ph
    ids = [VOCAB[c] for c in ph if c in VOCAB][:510]
    style = np.fromfile(f"{BASE}/kokoro/x/package/voices/{voice}.bin", dtype=np.float32).reshape(-1, 1, 256)[len(ids)]
    wav = SESSION.run(None, {"input_ids": np.array([[0, *ids, 0]], dtype=np.int64),
                             "style": style.astype(np.float32), "speed": np.array([speed], dtype=np.float32)})[0][0]
    return ph, wav

if __name__ == "__main__":
    voice, out, text = sys.argv[1:4]
    speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
    ph, wav = synth(voice, text, speed)
    sf.write(out, wav, 24000)
    print(ph, f"{len(wav)/24000:.2f}s")
