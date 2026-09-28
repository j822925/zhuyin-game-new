# Free on-device reading experiment

This is an ungraded teacher trial, not a replacement for the production fourth level. Its independent page and standalone manifest allow testing the Home Screen media capture + WASM recognition path without the native SpeechRecognition API or Safari handoff. No account, paid endpoint, backend change or student record write is involved.

## Architecture and limits

- Transformers.js 3.8.1 standalone browser bundle from jsDelivr. Xenova/whisper-tiny pinned to 5332fcc35e32a33b86612b9a57a89be7906102b1. Q8, WASM, one thread, dedicated module worker. Single-thread WASM avoids requiring cross-origin isolation on GitHub Pages.
- Downloads public software and model weights from jsDelivr/Hugging Face. Tiny encoder/decoder weights total 40.9 MB decimal, runtime about 21.6 MB plus tokenizer/config/script files, approximately 70 MB first-load assets. Browser model cache is best effort, not an offline guarantee.
- MediaRecorder (MP4 on supporting browsers, otherwise WebM/Opus) captures up to 8 seconds. Local audio decoder, mono conversion and resampling produce 16 kHz PCM. A conservative energy check rejects silence; it is not reliable speech/noise classification.
- Worker fetch accepts only GET/HEAD without request bodies and omits credentials. Audio is passed only to the local worker. No audio/transcript storage, scoring API, telemetry, translation or paid fallback. Transcripts exist only in the current DOM, capped at 20 attempts, and disappear on reload.
- No target word, question options or expected answer are sent to the model. Comparison uses the existing exact whole-word/homophone matcher after recognition. Trial errors do not mark a child wrong or award stars.
- Permission timeout 20s; recording 8s; recorder stop watchdog 5s; initialization timeout 5min; recognition timeout 90s. Cancel or hiding the page releases capture and invalidates work. In-flight worker cancellation terminates the worker; preparing again may reuse downloaded weights.
- iPad 9th generation/iPadOS 26.6.2 hardware is not available here. Its actual model memory fit, standalone capture, throughput and child-speech accuracy still need teacher testing. Do not claim it is ready for classroom scoring.

## Evidence

7 new unit tests: silent/blip/short/oversized rejection, 48k stereo resampling and non-finite input, tap stop, late permission after cancellation, stale callbacks, duration limit, permission timeout. Existing 5 launch tests also pass.

Actual desktop-browser inference using locally generated Microsoft Hanhan Desktop zh-TW synthetic WAVs, not mocked recognition and not child voice recordings:

| Expected | Tiny q8 | Seconds | Base q8 | Seconds |
| --- | --- | ---: | --- | ---: |
| 蘋果 | 蘋果 | 2.1 | 苹果 | 3.1 |
| 學校 | 学校 | 1.2 | 學校 | 2.4 |
| 長頸鹿 | 長錫錫 | 1.2 | 場景錄 | 2.5 |
| 開開心心 | 開開心心 | 1.2 | 開開心心 | 3.0 |
| 五顏六色 | 5元6色 | 1.2 | 5元6色 | 3.0 |

Both match 3/5 of these specific samples. This is a smoke test, not a population accuracy estimate. Base (64da57285918e20ea79ea5c88eed7197933abaa8) did not improve this sample set and consumed more memory/time, so the trial retains tiny. Silence was rejected before inference. UI cancellation during real inference returned to preparation without appending a late result. There is no physical microphone/iPad test result yet.

## Teacher test

Open reading-local.html in Safari. Add to Home Screen with “打開為網頁 App” enabled, naming it 朗讀試驗. Open that icon and verify the page says 主畫面模式. On Wi-Fi prepare the model, allow microphone access when recording, and read the five words. Observe both transcript and processing seconds. The ordinary game and Safari fourth level remain unchanged.

References: https://huggingface.co/docs/transformers.js/v3.0.0/en/pipelines and https://huggingface.co/Xenova/whisper-tiny . Model/software execute locally; their open-source licenses are linked by their publishers. No model weights or synthetic samples are committed to this game repository.
