# iPad reading startup recovery

The reported iPad could record and replay the microphone check, but reading recognition immediately returned `aborted`. The teacher confirmed opening the game from its Home Screen icon, then reported similar symptoms on a computer. Home Screen compatibility is only a possible contributor, not an established root cause. Recording and speech recognition are separate browser capabilities; successful playback does not establish that recognition works in that context. The available evidence does not establish a character-animation regression either.

Changes:

- Classify an abort before audio capture as `start-aborted`, with actionable guidance and no grading. Existing cancellation ignores stale callbacks and releases acquired tracks.
- Show a Safari-tab recommendation for Apple standalone mode and an ordinary new-tab reading link, preserving the class without including student/session data. If the device reopens the standalone app, instructions explain copying the link into Safari. The link does not promise to force a particular browser.
- Avoid calling pause/load on an unused playback element when entering questions or leaving. Actual clips are released once. This reduces unnecessary iPad audio-session changes.
- Recording startup no longer invokes the optional battle reset before the native recognition start. Character rendering, answers, rewards and normal question/leave cleanup remain.
- Stop speech and microphone checks before resetting battle animations, so an animation failure cannot prevent microphone cleanup. Show the frontend version, actual error code and input route under the adult troubleshooting disclosure. This contains no audio, transcript, device identifier or student/session data.
- Keep the native recognition start synchronous with the tap. No automatic microphone retries, permission changes, audio uploads, backend changes or score changes.

Validation: 31 reading input, microphone, lesson and score tests passed. Local UI fixtures with the real character assets and simulated speech cover successful capture/answer, immediate native abort, unchanged question count on failure, visible recovery guidance and a usable retry. These checks cannot verify the teacher's actual microphone, speech service or browser handoff. This is a targeted startup/cleanup hardening and diagnostic release, not proof that the reported physical-device failure is resolved.

Upstream evidence (compatibility depends on iPadOS version):

- WebKit discussion of Home Screen/SafariViewController recognition availability: https://bugs.webkit.org/show_bug.cgi?id=225298
- WebKit report of speech recognition failing after media playback on iOS Safari: https://bugs.webkit.org/show_bug.cgi?id=321436
