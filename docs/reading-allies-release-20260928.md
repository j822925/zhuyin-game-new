# Reading battles and recruited monster characters

- Reading uses the selected child profile, a server-random monster encounter, correct/incorrect combat and confirmed star rewards. A 5/5 reading round advances collection once; existing 3-perfect-round requirement and random encounters remain.
- Collected monsters appear in My Character. The server requires acquired ownership with at least three victories before allowing selection. Existing class/session/profile revision protections remain.
- A hero-side renderer mirrors the complete enemy pose, weapon, motion and trails without modifying shared enemy frames. Four new transparent star-holding images are used for ally rewards instead of the enemy defeat frame.
- Backend deployed version: `f161e715-a140-4a95-95ef-3c37f3b479f7`, health `cloudflare-reading-battle-20260928-v1`. Built from deployed baseline `4373336c-1651-43a7-a597-8621893f602a`, changing only reading collection eligibility and owned profile characters. No database migration or student data export.
- Local release source and rebuild script are retained under `.local/reading-battle-production-20260928` and `.local/build-reading-battle-production.mjs`. Trial assets and other production source modules were checked against the previous bundle.

Validation: 13 frontend checks, 10 backend monster/online regression checks, production-source reading and notebook fixtures for both classes, and new atomic collection/profile ownership checks passed. Browser tests cover real rendered local assets with fictional speech/API responses: correct attacks, incorrect hits, service-error retries, next/leave cancellation, failed-save recovery, 390/768/1280 layouts, profile selection, and all four mirrored atlases/star poses. These do not replace a physical iPad microphone test.

Assets: `assets/battle-sprites/ally-stars/*-star-v1.png`. Created with built-in image_gen using the original monster portraits; prompts and generated file provenance are in `ally-star-prompts-20260928.json`. Original collectible artwork is retained.
