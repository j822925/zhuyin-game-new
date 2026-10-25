# Perspective candidate release

## Promoted to stable on 2026-10-25

The user explicitly requested publication to the official game after reviewing the second candidate. Stable release `20261025-homegallery1` integrates source commit `4bac06e195b4e2ede806ed0dd92aa69c694f04ce`, rebuilds the play, entry, farm-learning and reading-farm bundles, and sets the active candidate to null. All authenticated players now use this stable version. Existing immutable candidate assets remain available for historical verification; the build commands below describe the archived candidate, not the current release procedure.

Farm round trips encode countertop attachments into the same legacy-compatible wire representation used by game saves. Tests exercise both the new farm bundle and the previously published cached bundle, for six styles, both corner directions, and demo/student save paths. Inventory, wallet and login rules are unchanged.

Candidate ID: `20261025-perspective2`. Public baseline: `b9926eb91f1f3adeac44b23206d5996bfd1dae76`; ordinary students still use `20261025-homefix2`. The only permitted predecessor is the published `20261025-perspective1` teacher candidate. This candidate is intended only for the existing authenticated teacher audience; no account flags, balances or server settings change.

## Build and activation

Run from this checkout, after the source and visual checks are complete:

```powershell
node tools/build-adventure-candidate.mjs plan
node tools/build-adventure-candidate.mjs build
node tools/build-adventure-candidate.mjs activate
node tools/build-adventure-candidate.mjs verify
node --test tests/adventure-candidate-build.test.js tests/adventure-candidate-stage.test.js tests/adventure-candidate-runtime.test.js tests/adventure-release.test.js tests/home-surface-storage.test.js
```

The default command is `plan`, which is read-only. The tool never commits, pushes or deploys. `build` creates a new immutable game bundle, a separate decor stylesheet and a manifest. `activate` verifies those files and their build inputs before changing the policy, rebuilding only the entry selector bundle and changing only its query version in the existing preview HTML. Every entry dependency is read from the stable Git baseline, including the model imported indirectly by authentication; only the candidate policy is substituted. The stable game import remains `adventure-play.bundle.js?v=20261025-homefix2`.

For this second round, `activate` requires the exact first-candidate descriptor in both the baseline and current policy, or the exact second-candidate descriptor when repeating a successful activation. It rejects `null`, another version, altered bundle/style paths, changed audience or any other policy edits. The manifest records `previousCandidate`, and isolated staging checks it. A first-candidate “return to stable” record is scoped to that version and does not opt the teacher out of the second candidate. Selecting “return to stable” in the second version still saves first and bypasses only that version.

Do not run the normal four-bundle stable release helper for this candidate. It would overwrite the stable game and farm bundles. Do not change shared CSS or existing assets; create new content-hashed art. New metadata and source modules are compiled into the candidate, so stable gameplay continues to use its old bundled implementation. If candidate styles need further edits, first extend the candidate-only stylesheet input rather than editing a shared published stylesheet.

The builder checks all baseline assets, styles, non-entry bundles, prior candidate manifests and shared learning/authentication entry modules against Git. It refuses changed stable content, changed audience configuration, external JavaScript imports in the candidate, a changed common HTML shell, missing new assets, and non-hashed new artwork. The first candidate's bundle, stylesheet, manifest and artwork remain immutable. Unchanged first-candidate art can be reused without copying it into the new release delta. A previously built candidate filename cannot be overwritten with different contents. Use a new ID for another build after a candidate has been sealed; never replace a candidate already downloaded by the teacher.

The manifest lists exact publish files and SHA-256 values for candidate outputs/new art plus all source inputs. Before publishing, compare the live repository with the baseline again and preserve any other chat's new release. Verify the unchanged stable bundle/CSS/assets online as well as the new candidate files.

New perspective artwork is also constrained by the actual `HOME_PERSPECTIVE_ART` registry in `data/home-perspective-art.js`. `plan` lists its active new assets and separately reports unreferenced local trial images. The builder refuses a new perspective asset referenced by the bundle but absent from this registry, or a new registry asset missing from the bundle. It seals the active reference list and exact new asset delta in `assetInventory`; verification and staging check that inventory again. Older trial files (including rejected v4 cabinets) may remain in the source worktree for comparison but never enter the publication allowlist. Previously published art remains protected and is not removed.

## Isolated publishing worktree

Keep candidate source edits and tests in this candidate branch. Do not publish its changed standalone model, art or layout modules to `main` during the teacher-only period. Create a separate clean managed worktree at the verified stable baseline, using its returned absolute path as the target below. Recheck the remote immediately before staging; if `main` has advanced, stop staging and reconcile the baseline first.

After `build`, `activate` and `verify` have succeeded, run the staging helper **from the candidate checkout**, passing the clean release worktree:

```powershell
node tools/stage-adventure-candidate.mjs plan "ABSOLUTE_RELEASE_WORKTREE"
node tools/stage-adventure-candidate.mjs copy "ABSOLUTE_RELEASE_WORKTREE"
git -C "ABSOLUTE_RELEASE_WORKTREE" diff --stat
git -C "ABSOLUTE_RELEASE_WORKTREE" diff --check
```

This helper never creates/removes worktrees, commits, pushes or deploys. It refuses a dirty target, an advanced target baseline, a different repository, changed candidate inputs, or an unactivated entry. It copies exactly `manifest.publishFiles`: new immutable candidate bundle/CSS/manifest, new hashed images under `assets/home-perspective/` and `assets/home-rooms-v3/`, and only three replacements (`adventure-release-policy.js`, `adventure-entry.bundle.js`, `adventure-preview.html`). Tests, tooling, QA, raw images and changed standalone source modules stay out of the release checkout. Every copied file is hashed again, and any unlisted change is rejected.

Commit only this inspected release delta and publish through the normal approved Pages workflow. Keep the separate source branch for later promotion and troubleshooting. After Pages reports success, verify exact public candidate hashes plus the stable play/farm bundles, shared CSS and old artwork. Do not infer success from copying, committing or pushing alone.

## Audience and recovery

The page and login stay the same. Selection runs only after the existing authenticated `connectForestStudent` load, compares the exact class/account digest and ignores URL switches or unverified local identifiers. Other accounts and classes retain the stable build. Public JavaScript is not a secret; this selector is not an authentication service.

The teacher sees the existing “老師測試版 / 回正式版” control. Returning first saves through the existing mechanism, then reloads stable. CSS/module load failure marks this version bypassed and reloads stable instead of starting two games. Browser storage or WebCrypto unavailability selects stable. The teacher's inventory and normal save are shared, so new layout fields must remain optional and preserve ownership across stable/farm/visits. This candidate must not require a save migration.

Runtime regression tests exercise the actual selector with all other fixture accounts and the other class: no candidate JavaScript, stylesheet or banner is loaded for them. A fake `openForestSync` server verifies one save before returning to stable, and the existing published farm bundle is run against both left and right candidate kitchens. It retains inventory, currency and attachment fields (`on`, `surface`, `offsetX`, `mount`, `facing`). Mounted x/y coordinates may be normalized to each version's wall geometry when crossing versions; returning to the candidate aligns them again. No account data or server schema is migrated.

The compact L has three physical workspaces, while published learning pages understand only two. `home-surface-storage.js` keeps in-memory placement unchanged and encodes a storage copy: new left workspace 2 becomes legacy workspace 0 at `offsetX - 66`; new short workspace 0 becomes legacy workspace 0 at `offsetX + 77`; workspace 1 is unchanged. These non-overlapping ranges remain within the old 210-unit workspace. Candidate loading and visitor snapshot projection decode valid ranges before normalization. Mixed older rows that do not fit the encoding are left together for the existing largest-first legacy repair. There is no new ownership grant, private metadata or backend migration. The actual unmodified stable farm bundle is tested with six styles, both corners and both local/student records; every placed appliance must survive, not merely remain owned. Returning to the older stable renderer can look different but cannot discard the placements. When eventually rebuilding shared learning pages, keep this storage boundary for any period in which cached older learning bundles remain supported.

## Local visual QA

The fake-data server is outside the publish checkout:

```powershell
node C:/ChatGPT工作區/國小低年級注音教學/output/home-consistency-20261025/qa.mjs
```

Open `http://127.0.0.1:8116/adventure-preview.html`. The exact pathname enables the real child-picture CSS. It loads current source and all normal styles while substituting a fake local student state, blocks external and student API requests, and stores only `home-perspective.qa` in the tab session. It includes four rooms, six styles, left/right corner kitchens, right-wall cabinets, three-appliance fixtures and gesture diagnostics. It does not test real iPad/Safari hardware or real school network behavior.

After the second candidate has been built, add `?qaBundle=1` on the same pathname to load its immutable bundle using the same fake state, without the source-only QA toolbar. This does not activate the public policy. Before the build exists, keep using the source URL. No real login, student API or formal save is permitted in this harness.

After the teacher approves the actual iPad result, promote through the ordinary stable workflow, clear `candidate`, rebuild the appropriate stable bundles/cache chains and verify the release. A candidate deployment alone is not approval for all children.
