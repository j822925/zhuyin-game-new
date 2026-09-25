# Provided audio update — 2026-09-23

## Scope

User provided folder 注音符號音檔 and requested replacements for spelling questions and tutor initials/finals/compound finals, followed by a missing-audio list.

- 164 MP3 files inspected and successfully decoded by FFmpeg (0.76–3.79 seconds).
- File numbering verified against the original reference board's numbered SVG glyphs. Its 22–24 are ㄧㄨㄩ, NOT the game's base-symbol order. Compounds are 42–63; tone suffixes 39/40/41 mean second/third/fourth tone.
- Exactly 33 of the existing 359 questions have matching full recordings. Retain the other 326 original question sounds. Preserve all IDs, tones, words and existing enabled/disabled flags.
- Tutor uses supplied 37 base symbols and 19 compound finals. Missing ㄩㄢ/ㄩㄣ/ㄩㄥ use existing files. Do not splice sounds or alter tones to invent missing recordings.
- 75 supplied full-syllable clips are not in the current question bank. Keep the user's originals; do not expand the question bank without a separate request.
- Ship only 89 required assets, byte-identical to user files. No speed/pitch/gain edits or conversion. Source files are untouched.
- Do NOT replace listening-mode sounds; use tutor-only mapping and question-path resolution. Existing exam and online question URLs are remapped client-side through the same resolver.
- No backend, database, student records, authentication or reward changes.
- New audio folder and versioned imports prevent previously cached sounds from taking priority. Legacy audio stays on disk for fallback and rollback.

## Verification

All 164 input MP3 files decoded successfully; published subset SHA256 matched source. All 110 release-worktree automated tests passed, including all-question path/tone coverage and tutor mappings. No subjective claim is made that every recording was independently listened to; mapping is based on verified file labels and decodability. Physical iPad playback not tested in this run.

Isolated local browser checks: all 89 shipped MP3s decoded; sample playback reached ended; actual tutor sequence ended in order s_3.mp3 → s_48.mp3 → m_3_48_39.mp3. Missing-only filter showed 3 units / 326 questions; available-only showed 56 units / 33 questions. Family-page navigation to preview worked; mobile 390×844 screenshot inspected; no JavaScript errors. External traffic blocked for this test.

## User report

The former standalone supplement page has been removed. parents.html now provides the full 1450-recording library, shared player, search and pagination, without login or score submission. docs/supplied-audio-missing-20260923.md includes exact missing filenames and tones. A copy also lives in the workspace output folder.

## Release / rollback

Base production commit: 6b7194b67cc9f01eb8fb566c61920ac7d4b13a34. Use explicit https://github.com/j822925/zhuyin-game-new.git, not the old origin. Only targeted frontend changes and new assets are included. Rollback removes the mappings and changes the import cache version; the original sounds and student state remain intact.
