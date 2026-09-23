# Listening recordings — 2026-09-23

Version: `20260923-listening1`; production base: `2c2c9e0`.

Extends the previous supplied-recording release to listening questions. The shared resolver now maps all 37 base symbols and 19 available compounds to the teacher-provided, unchanged MP3s. Source and game numbering differ, so mappings are joined by symbol. ㄩㄢ、ㄩㄣ、ㄩㄥ retain their existing recordings until files are provided.

Game, exam, online battle, review and preview players share this resolver. The existing 33 supplied spelling-question recordings remain unchanged. No account, score, database or question-bank changes.

Verification: 111 automated tests passed. Isolated local Chrome decoded all 89 supplied assets; verified tutor sequence and actual playback for ㄧㄚ、ㄚ、ㄧ plus missing-file fallback ㄩㄢ, with no page errors. Production assets are checked against this release after deployment.
