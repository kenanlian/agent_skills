# Voice

Voice capability is ready. Narration uses Volcengine Doubao bidirectional TTS. The purchased account was checked with one spoken sentence: `SessionFinished` billed 9 characters, and the result was a 1.872 s mono MP3 at 24000 Hz / 128 kbps.

The local client is `~/.config/volc-tts/verify.mjs`. It reads the env file below and does not print the key.

```bash
node ~/.config/volc-tts/verify.mjs
```

That writes `~/.config/volc-tts/verify.mp3`. Official protocol: [双向流式文本转语音 WebSocket](https://docs.volcengine.com/docs/DoubaoVoice/bidirectional-streaming-text-to-speech-websocket?lang=zh).

## Credentials

`~/.config/volc-tts/env`, mode `600`. Keep the key in that file. Do not copy it into the skill, a video project, a prompt, or a commit.

| Variable | Role |
|---|---|
| `VOLC_TTS_API_KEY` | New-console API key. Use this when it is set. |
| `VOLC_TTS_APP_ID`, `VOLC_TTS_ACCESS_KEY` | Legacy console pair. Use only when `VOLC_TTS_API_KEY` is empty. |
| `VOLC_TTS_RESOURCE_ID` | Default `seed-tts-2.0` (语音合成 2.0 字符版). It must match the purchased product and the speaker family. |
| `VOLC_TTS_SPEAKER` | Default `zh_female_gaolengyujie_uranus_bigtts`, a 2.0 voice. |
| `VOLC_TTS_TEXT` | Optional one-shot check line. Episode narration uses the caption line instead. |

## Call

Endpoint: `wss://openspeech.bytedance.com/api/v3/tts/bidirection`

Handshake headers:

| Header | Value |
|---|---|
| `X-Api-Key` | `VOLC_TTS_API_KEY` |
| `X-Api-App-Id`, `X-Api-Access-Key` | Legacy pair, in place of `X-Api-Key` |
| `X-Api-Resource-Id` | `seed-tts-2.0` |
| `X-Api-Connect-Id` | A new UUID for every connection |
| `X-Control-Require-Usage-Tokens-Return` | `*` so `SessionFinished` includes `usage.text_words` |

One WebSocket connection carries one session and one text payload. Send the whole caption in a single `TaskRequest`.

1. `StartConnection` (event 1), payload `{}` → `ConnectionStarted` (50).
2. `StartSession` (100) → `SessionStarted` (150). Speaker and audio settings apply here.
3. `TaskRequest` (200) with `req_params.text` set to the caption.
4. `FinishSession` (102), payload `{}`. Collect `TTSResponse` (352) audio until `SessionFinished` (152).
5. `FinishConnection` (2).

`namespace` is `BidirectionalTTS`. A fresh UUID is the session id.

`StartSession` payload:

```json
{
  "user": { "uid": "volc-tts-verify" },
  "event": 100,
  "namespace": "BidirectionalTTS",
  "req_params": {
    "speaker": "zh_female_gaolengyujie_uranus_bigtts",
    "audio_params": { "format": "mp3", "sample_rate": 24000, "bit_rate": 128000 }
  }
}
```

`TaskRequest` payload:

```json
{
  "event": 200,
  "namespace": "BidirectionalTTS",
  "req_params": { "text": "这是一段配音测试。" }
}
```

Set `bit_rate` on MP3. The service default is low enough to dull the voice. Verified output is mono MP3, 24000 Hz, 128 kbps.

## Binary frames

Integers are big-endian. A client text frame is a 4-byte header, an `int32` event, then a sized JSON payload.

| Byte | Value | Meaning |
|---|---|---|
| 0 | `0x11` | Protocol v1, 4-byte header |
| 1 | `0x14` | Full client request, event number present |
| 2 | `0x10` | JSON, no compression |
| 3 | `0x00` | Reserved |

Connection events `1`, `2`, `50`, `51`, and `52` omit the session id. Every other event writes `uint32` session-id length, the id, then `uint32` payload length and the payload. `ConnectionStarted`, `ConnectionFailed`, and `ConnectionFinished` insert a connect-id length and id before the payload.

Server audio uses header byte 1 = `0xB4` (audio-only, with event), raw bytes, event `352`. An error frame uses header byte 1 = `0xF0`, then a `uint32` error code and a sized payload, and has no event number.

## Acceptance

A successful take has:

- `ConnectionStarted`, then `SessionStarted`, then one or more `TTSResponse` chunks, then `SessionFinished`.
- `usage.text_words` equal to the Unicode length of the caption, including punctuation.
- An MP3 that starts with `ID3` or `0xFF` and is longer than a few hundred bytes.

`ffprobe` on the verified sample reported `codec_name=mp3`, `sample_rate=24000`, `channels=1`, `bit_rate=128000`, `duration=1.872000`.
