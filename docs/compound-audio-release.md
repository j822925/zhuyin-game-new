# Compound audio production release — 2026-09-22

User approved the complete level-tone preview and explicitly requested production publication.

## Scope

- Replace only audio/compound/c01.mp3 through c22.mp3 with MP3 encodings of the approved level-tone-minus7 WAV previews.
- Audio base gain: -7 dB from the original recordings; individually shortened previews; ㄩㄣ uses the final E timing.
- Constant pitch-tier target: 237.47 Hz, measured from the median voiced pitch of the original ㄅ. Teacher listening acceptance, not an independent phonetic certification.
- Preserve existing filenames/question IDs so saved exams, online questions and history keep working.
- Refresh the shared audio resolver and its student/family/tutor/exam/online import chains to 20260922-compound-level1.
- Keep the existing ㄌㄜˋ cache correction. Do not change the 37 single-symbol recordings or full-syllable recordings.
- No backend deployment, database migration, student-data writes, or test-site deployment.

## Safety and verification

- Release based on the clean production frontend commit 15cf7568dd64051e9f40c8063bfa6136f664dedb, independently verified against the explicit zhuyin-game-new remote.
- Original 22 audio files backed up under .local/compound-release-20260922/original-audio/compound; also recoverable from the prior release commit.
- Approved PCM SHA256, original/release SHA256, decoded durations, pitch and volume checks recorded in .local/compound-release-20260922/audio-manifest.json.
- Encoding duration deviation <5 ms; RMS difference from approved previews <0.45 dB; pitch verified after decoding.
- 207 local automated tests passed.
- Isolated headless Chrome loaded all 22 new recordings through the real family audio player; all 22 saved paths resolved; no page errors. No real student accounts/API writes.
- Browser listening quality on physical iPads is not independently verified.
- Publication verification must compare live file hashes against the isolated release before marking complete.

## Rollback

Restore only the 22 audio files from the backup/prior commit and publish a NEW audio cache revision. Keep all unrelated production code and data. Do not revert the whole game.

