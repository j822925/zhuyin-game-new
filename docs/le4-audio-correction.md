# ㄌㄜˋ audio correction — 2026-09-20

- Replace s141 example 肋 with 樂; keep question ID, spelling, fourth tone and file path stable for saved exams and mistake records.
- Regenerate only audio/syllable-clear/s141.wav using the existing Microsoft Hanhan Desktop generator (rate -4, 200 ms lead / 600 ms tail).
- Native PhonemeReached trace: 肋 = ㄌ ㄟ ˋ; 樂 = ㄌ ㄜ ˋ; 快樂 = ㄎ ㄨ ㄞ ˋ ㄌ ㄜ ˋ; 音樂 = ㄧ ㄧ ㄋ ˉ ㄩ ㄝ ˋ. Thus the single-character 樂 uses the intended reading in this engine. This is engine phoneme verification, not a teacher's listening review.
- Generated WAV SHA256: BD4E1BE8BF111E071A9202661D108616483601E5A38EF45270E2718EFF7A670C.
- Shared playback resolver adds a cache revision for this clip only: game, little teacher, parent/teacher samples, saved exam questions and wrong-answer replay. Admin trial adds the same revision after its existing path validation.
- No database migration, score changes, question reordering or student data writes.
- Original local backup: .local/audio-review/s141-before.wav.
