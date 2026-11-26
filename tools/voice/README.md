# 声（voice/*.mp3）の作り方

アプリのセリフは、ブラウザの読み上げではなく、あらかじめ作った音声ファイルを再生している。

- 音声合成モデル：Kokoro-82M（Apache-2.0）。日本語の声 `jf_tebukuro` を使用
  - 重み：npm パッケージ `kokoro-q8-shards`（6つに分割された onnx をつなげて使う）
  - 声のデータ：npm パッケージ `kokoro-js` の `voices/*.bin`
  - 発音記号の表（vocab）：pip パッケージ `kokoro-onnx` の `config.json`
- 日本語 → 発音記号：pip パッケージ `misaki`（`fugashi` + `unidic-lite` で単語に区切る）

## 手順

1. `voice_lines.py` にセリフを書く（`app.js` の `voice.say("...")` と**まったく同じ文字列**にする）
2. `python3 build_voice.py jf_tebukuro ../../voice 0.9` で `voice/` に mp3 と `manifest.json` を書き出す
3. `index.html` などの `?v=` の番号を上げて push

`manifest.json` にないセリフは、アプリがブラウザの読み上げで代わりにしゃべる（声が出なくなることはない）。
