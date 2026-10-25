# Perspective candidate release

Candidate ID: `20261025-perspective1`. Stable baseline: `7060bd793bdda43d765a648a908ef6309cddea2a` (`20261025-homefix2`). This candidate is intended only for the existing authenticated teacher audience; no account flags, balances or server settings change.

## Build and activation

Run from this checkout, after the source and visual checks are complete:

```powershell
node tools/build-adventure-candidate.mjs plan
node tools/build-adventure-candidate.mjs build
node tools/build-adventure-candidate.mjs activate
node tools/build-adventure-candidate.mjs verify
node --test tests/adventure-candidate-build.test.js tests/adventure-candidate-runtime.test.js tests/adventure-release.test.js
```

The default command is `plan`, which is read-only. The tool never commits, pushes or deploys. `build` creates a new immutable game bundle, a separate decor stylesheet and a manifest. `activate` verifies those files and their build inputs before changing the policy, rebuilding only the entry selector bundle and changing only its query version in the existing preview HTML. Every entry dependency is read from the stable Git baseline, including the model imported indirectly by authentication; only the candidate policy is substituted. The stable game import remains `adventure-play.bundle.js?v=20261025-homefix2`.

Do not run the normal four-bundle stable release helper for this candidate. It would overwrite the stable game and farm bundles. Do not change shared CSS or existing assets; create new content-hashed art. New metadata and source modules are compiled into the candidate, so stable gameplay continues to use its old bundled implementation. If candidate styles need further edits, first extend the candidate-only stylesheet input rather than editing a shared published stylesheet.

The builder checks all baseline assets, styles, non-entry bundles and shared learning/authentication entry modules against Git. It refuses changed stable content, changed audience configuration, external JavaScript imports in the candidate, a changed common HTML shell, missing new assets, and non-hashed new artwork. A previously built candidate filename cannot be overwritten with different contents. Use a new ID for another build after a candidate has been sealed; never replace a candidate already downloaded by the teacher.

The manifest lists exact publish files and SHA-256 values for candidate outputs/new art plus all source inputs. Before publishing, compare the live repository with the baseline again and preserve any other chat's new release. Verify the unchanged stable bundle/CSS/assets online as well as the new candidate files.

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

## Local visual QA

The fake-data server is outside the publish checkout:

```powershell
node C:/ChatGPT工作區/國小低年級注音教學/output/home-perspective-20261025/qa.mjs
```

Open `http://127.0.0.1:8116/adventure-preview.html`. The exact pathname enables the real child-picture CSS. It loads current source and all normal styles while substituting a fake local student state, blocks external and student API requests, and stores only `home-perspective.qa` in the tab session. It includes four rooms, six styles, left/right corner kitchens, right-wall cabinets, three-appliance fixtures and gesture diagnostics. It does not test real iPad/Safari hardware or real school network behavior.

After the teacher approves the actual iPad result, promote through the ordinary stable workflow, clear `candidate`, rebuild the appropriate stable bundles/cache chains and verify the release. A candidate deployment alone is not approval for all children.
