# 30 new villain concepts — review only

The user requested approximately 30 additional villains, then explicitly chose to review character designs and collectible card appearances before battle animation production. This gallery contains 10 humanoid demons, 10 fantasy creatures and 10 small monsters. It does not modify the live encounter catalogue, collection ownership or profile eligibility.

Entry: `monster-preview.html`. Filter by group, enlarge cards, navigate through all 30 and mark local favorites. Favorites are device-only and do not call the student API. Card frame shapes, palettes, motifs and silhouettes vary by character.

Art was generated with the built-in image_gen tool, transparent background enabled. Full prompts and character identities: `docs/monster-preview-30-prompts-20261003.json`. Original PNG assets remain in the local project at `assets/monsters/preview-20261003/*-v1.png`. The published gallery uses transparent WebP derivatives in the same folder, resized only to a maximum of 1280 pixels for a lighter download. Original artwork is retained for future approved animation work.

The separately prioritized raven battle-size correction was published as commit `b90876ef`. Only this slender character receives the larger normalized frame scale and 1.2× display factor, producing roughly 40% more visible height without distorting its proportions. Enemy and allied renderers share the correction; 84 pose/time/side samples and 390/768/1280 layouts passed clipping and overflow checks on the live site.
