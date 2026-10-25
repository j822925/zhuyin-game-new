# Forest adventure staged releases

## Current state

The emergency home recovery release is the stable build for everyone. `ADVENTURE_RELEASE_POLICY.candidate` is `null`, so no candidate is currently offered. The existing homepage and forest entrance remain the only entrances.

Future major changes can be tested by the one authorized teacher account in the `main` class before promotion. The audience digest encodes the exact authorized class and complete six-digit account, not a short seat number. Selection happens **after** `connectForestStudent` has completed its authenticated server load. No extra API request, student record change or URL switch is used. A modified local seat with someone else's token still fails the existing backend authentication and never reaches selection. The digest is merely a deployment selector; public JavaScript and artwork are not confidential, and this is not a replacement for backend authorization.

## Preparing a candidate

1. First update from the latest published stable baseline and preserve other chats' releases. Keep the published entry HTML, shared styles and existing content-addressed art unchanged while testing the candidate.
2. Build the candidate game as a **new immutable file at the existing site root**, for example `adventure-candidate-20261026-room2.bundle.js`. Keeping the same page and base URL preserves authenticated session, save keys, farm return routes and relative shared asset URLs.
3. Put changed CSS in one or more **new immutable files**, for example `adventure-candidate-20261026-room2.css`. Candidate code must load that name rather than overwrite or fetch a changed `home-spatial.css` used by stable players. New artwork likewise gets new content-hashed names. Existing art can remain shared. CSS inside the candidate package should be scoped to `html[data-adventure-release="20261026-room2"]` where applicable.
4. Changes to the static page shell must be backward compatible with both builds; create candidate-only DOM inside the candidate code. Do not publish incompatible shell changes or overwrite shared modules/assets just because the teacher-only bundle works.
5. Verify all candidate dependencies and four-room tablet layouts locally. Ensure save fields are optional/backward compatible: stable game, farm bundles, visits and server must retain them without dropping ownership or layouts. This selector does not make incompatible saves safe. Incompatible backend/schema changes need a separate migration plan before any candidate uses them.
6. In `adventure-release-policy.js`, set candidate to the explicit version, bundle and CSS list:

```js
candidate: Object.freeze({
  id:'20261026-room2',
  bundle:'./adventure-candidate-20261026-room2.bundle.js',
  styles:['./adventure-candidate-20261026-room2.css'],
}),
```

7. Rebuild only the stable entry bundle with this policy, update its cache version, and publish it together with the verified candidate files. The stable game bundle itself remains the previously verified stable build. Verify a non-target account and the other class still select stable, while the designated teacher account selects candidate. Use synthetic identities in tests; do not impersonate students.

## Teacher experience and rollback

The teacher opens the same homepage with the designated account. A candidate is selected automatically and shows **老師測試版 / 回正式版**. Returning flushes the normal save first, then reloads through the authenticated entrance. The bypass is scoped to this account, this candidate version and this browser tab; a new version may be offered again. Closing the tab ends the bypass.

If candidate CSS or module loading fails, remember the bypass and reload to stable. A failed module can have partially initialized the game, so the loader never initializes stable on top of it. If browser storage is unavailable, selection stays on stable. Candidate code and CSS defects after successful startup still require testing; a loader cannot automatically prove visual correctness.

## Promotion

After the teacher confirms the actual iPad result, integrate those tested changes into the stable source and run the full related checks, including shared saves and entry/cache chains. Build the normal stable bundle, set candidate back to `null`, rebuild the entry bundle, publish and verify online content. Do not equate a candidate upload with teacher acceptance or universal release. Retain previous immutable files until no published or cached entry depends on them; never reuse a candidate version for different contents.

The implementation makes no backend calls beyond the existing authenticated entrance and normal save. It does not alter balances, access permissions, class isolation or visit settings.
