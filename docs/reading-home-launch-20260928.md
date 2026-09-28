# Home Screen reading entry — 2026-09-28

The user reports Safari can now complete all five reading questions, while the installed Home Screen app aborts recognition. Device reported: iPad (9th generation), iPadOS 26.6.2.

The fourth-level card now uses a synchronous user-tapped x-safari-https link for Apple standalone contexts with a detected OS/Safari major version of at least 17. This is a Safari handoff, not native speech recognition support inside the installed app. No automatic redirect or microphone request runs at page load. A bootstrap gate replaces the standalone reading UI before importing the recognition, authentication, or encounter code. Safari/desktop retain the existing mic4 implementation.

Only the public class query crosses the handoff. No seat, PIN, token, original query/hash, or credential transfer occurs. The destination remains the same site. Safari may require selecting a seat and authenticating separately. Return links retain class. Reading awards and question selection are unchanged.

If OS handoff fails, the card exposes a recovery link. Its page offers a Safari link, copyable public address, and instructions for a Safari bookmark added to the Home Screen with “打開為網頁 App” disabled. Older/unknown OS versions use this setup path. Existing installed app and manifests are unchanged.

Validation:
- 40 tests pass: reading-launch, reading-input, reading-lesson, reading, reading-mic-check.
- Browser UI fixtures verified modern iPad link, class preservation, click recovery link, standalone bootstrap gate, bookmark setup page, and normal browser loading the original reading UI.
- OS and standalone properties were simulated on a desktop browser. No physical iPad or real Safari handoff was available for verification. The user must confirm the original icon → fourth level → Safari flow on their iPad.
- The custom URL scheme is not a standardized web API or a guarantee across managed devices. WebKit issue 240025 comment 9 reports availability on v17+, so fallback remains necessary.

Sources:
- https://bugs.webkit.org/show_bug.cgi?id=225298
- https://bugs.webkit.org/show_bug.cgi?id=240025#c9
- https://support.apple.com/zh-tw/guide/ipad/ipad8f1f7a29/ipados

Release scope: new launch/bootstrap/shortcut, entry module, reading HTML, launch tests and this document. Remote index and game-boot are modified only to refresh the boot/entry version. Do not deploy the shared working directory as a whole.
