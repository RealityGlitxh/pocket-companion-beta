# PocketNexus Beta Launch Status

**Audit date:** 2026-09-21 (repo-relative)
**Audited by:** Claude Code, Phase 1 (Full Audit + Blocker Discovery)
**Scope:** `main` branch as currently deployed to `https://beta.pocketnexus.app/`. No redesign work performed. No production data touched. No workflows disabled or weakened.

---

## 1. Current build

| Item | Value |
|---|---|
| `main` HEAD SHA | `077a17e04502156c560aba451ebbbd0f5a4c3d10` ("Apply cohesive PocketNexus visual system to streamer-ranked-refine-v8.67.2.css") |
| Live deployment mechanism | GitHub Pages, "Deploy from a branch" (`main`), via the built-in `pages-build-deployment` dynamic workflow. Custom domain via `CNAME` → `beta.pocketnexus.app`. No `actions/deploy-pages` step exists — Pages deploys automatically on every push to `main`, with no build step (static files served as-is). |
| Live deployment status | **Confirmed matching `main` HEAD.** `pages-build-deployment` run #752 for `077a17e0` completed `success`. Independently corroborated by `beta-decks-auth-release-qa.yml`'s own "Verify hosted release files match repository" step, which diffed `index.html`, `sw.js`, `privacy.html`, `terms.html`, `support.html` against the live site and got `HOSTED_FILE_OK` for all five on the first attempt. I could **not** fetch `beta.pocketnexus.app` directly from this sandbox (network egress to that domain is blocked here — `EGRESS_BLOCKED` from both `curl` and `WebFetch`); the above is inferred from GitHub-side evidence, not a direct fetch I performed. |
| App version identifiers | **No single app version exists.** Versioning is fragmented per-file (`v8.64.1`, `v8.65.2`, `v8.79.0`, `v8.80.1`, …), each incremented independently by whichever feature last touched it. The most recently-touched wave is the "v8.80" UI concept (`pocketnexus-ui-concept-v8.80.0.css`) and Home at `v8.80.1` (internal `VERSION` constant in `home-command-center-v8.75.0.js`, despite the file's own name still saying `v8.75.0`). `manifest.webmanifest` has no version field. |
| Recent relevant commits | `077a17e`/`3afca9d`/`f2ca611`/`dcbd779`/`b531973` — five consecutive "Apply cohesive PocketNexus visual system to `<file>`.css" commits. **Four of these five touch CSS files that are never loaded by `index.html` and are not self-injected by any JS** (`pass3b-meta-v8.65.4.css`, `pass3b-collection-v8.65.5.css`, `pass3b-decks-v8.65.2.css`, and — partially — `streamer-ranked-refine-v8.67.2.css`, which *is* self-injected and thus live). See §6 "Duplicate/legacy implementations." Earlier: `3a89b26`/`56955ca`/`a0e47ef`/`c18e990`/`8b81566`/`febb3ab` — the Home/navigation/v8.80-concept rollout that is the direct cause of two of the current CI failures (§5). |
| Relevant CI workflows | 74 workflow files exist in `.github/workflows/`. Most are one-shot "Apply X" migration scripts (`workflow_dispatch` only) from earlier feature rollouts and are not ongoing regression gates. ~18 are `push`-triggered on `main` and function as an ongoing regression suite. |

---

## 2. Required workflow status (verified against actual run logs, not assumed)

| Workflow | Last relevant run | Conclusion | Root cause (from actual logs) |
|---|---|---|---|
| **PocketNexus Deck + Auth Beta Release QA** | `077a17e0` (current HEAD) | 🔴 **FAILURE** | `#imp` textarea / `importDeck()` unavailable when the script checks. Root cause: the Decks route in `route-feature-loader-v8.64.1.js` shows a blocking "Loading this feature…" screen while lazily fetching two purely-decorative enhancement scripts, even though the real `decks()` page function is already defined eagerly and doesn't need them. Any `render()` call for `page='decks'` that lands before those two scripts finish loading gets the loading placeholder instead of the real page. **A fix for this exact bug exists, verified, and pushed on branch `claude/magical-turing-h0basm` (commit `b7de510`) — not yet merged to `main`.** |
| **PocketNexus Signed-In Regression QA** | `077a17e0` | 🔴 **FAILURE** | Fails before reaching any app code: `QA account authentication failed (500): Database error granting user` from Supabase's own `/auth/v1/token` endpoint. See §7 — nothing in this repository's SQL/functions/triggers can cause this; it is very likely an out-of-repo Supabase Dashboard (Auth Hook) or QA-account-row issue. **Independently reproduced against an unrelated commit** (`f4c6ce5a`, a feature branch, via manual `workflow_dispatch`) with the identical error, confirming it is not caused by any specific code change. |
| **PocketNexus Gate 6 Legal + Beta Cleanup QA** | `077a17e0` | 🔴 **FAILURE** | `app 1440px: independent/product shell missing`. The test seeds a guest session and asserts the Home page contains one of three hardcoded sentinel phrases (`"Independent third-party companion"`, `"YOUR COMPETITIVE POCKET"`, or `"Competitive Command Center"`). None of these exist anywhere in the current live Home renderer (`home-command-center-v8.75.0.js`'s hero text is now "Build. Play. Track. Improve."). Copy drift from the Home redesign, not a functional break. |
| **PocketNexus Account Auth Final Hardening QA** | `8b81566` (stale — no rerun since; path filters mean it hasn't re-triggered) | 🔴 **FAILURE** | Same Supabase `Database error granting user` as above — third independent confirmation of the same environmental issue. |
| **PocketNexus Home Command Center QA** | `a0e47ef` (stale) | 🔴 **FAILURE** | Two distinct assertion failures logged: `wrong-home-version` (test expects `data-home-version==="8.75.0"`, live value is `"8.80.1"` — a version-constant bump that was never reflected in the QA script) and `hero-copy-missing` (expects specific hero copy that no longer exists). Both are copy/version drift from the same Home redesign, not runtime breakage — the page itself renders (`snapshot`, `meta`, `quick`, `cont`, `recent` all report `true` in the test's own diagnostic dump). |
| **PocketNexus Home Hosted Validation** | `a0e47ef` (stale) | 🔴 **FAILURE** | Runs directly against `https://beta.pocketnexus.app/`. `page.waitForFunction` timed out waiting for `data-home-version==="8.75.0"` — same version-string drift as above, hit against the live site. |
| **PocketNexus RC1 Cross-Browser Proxy** | `8b81566` (stale, failing for its last 3 consecutive runs) | 🔴 **FAILURE** | `PocketNexus lazy feature load failed decks Error: My Decks loaded without registering its page.` — thrown from `route-feature-loader-v8.64.1.js:18`, reproduced identically across **all 5** tested browser profiles (Safari iOS, Safari desktop, Chrome mobile, Chrome desktop, Edge desktop). This is a **second, distinct** Decks-route race (see §4/§6) — different from the one fixed on the feature branch. |
| **PocketNexus V8.65 RC1 Route Smoke** | `8b81566` (stale, failing for its last 2 runs) | 🔴 **FAILURE** | Same `My Decks loaded without registering its page.` error, independently confirmed by a second workflow. |
| **PocketNexus Pass 3C Frontend Audit** | `06515ce` (2026-09-05, has not run since — 2+ weeks stale) | 🔴 **FAILURE** (stale) | Could not retrieve the assertion line from the tail of the log (only artifact-upload output was in range); given its name and the "pass3c" file family is entirely unloaded dead code (§6), this workflow's continued relevance to current `main` is unclear and needs re-verification once it can be forced to run. |
| Meta Refresh, Matches Rank Session Hotfix, Beta Functional QA, Draft Mode Restore, Pocket Coach Before/After, Tournament Event Click, Pocket Coach Responsive, Ranked Stream Control Center, Card Database + Detail Behavior, Signed-Out Profile Privacy (×2 near-duplicate workflows), Training Behavior + Persistence, Streamer OBS 2.0, Competitive Hub Header, Account Auth UX QA, Backup + Restore Behavior QA, Local Backup + Restore QA, `pages-build-deployment` | `077a17e0` or recent | 🟢 **SUCCESS** | — |
| Navigation Header QA, Final Hosted Beta Validation, Pocket Coach Beta Launch Gate | Stale (last run 1–2 weeks ago, path filters mean they haven't re-triggered) | 🟢 **SUCCESS (stale)** | Green, but their last run predates several redesign commits — not a live guarantee against current `main`, only the best available signal. |
| Remaining ~50 workflows | — | Not evaluated | One-shot `workflow_dispatch`-only migration scripts tied to specific past feature rollouts (e.g. "Apply Pocket Coach Before After Comparison v3"); not part of the ongoing push-triggered regression suite. Recommend pruning these before beta to reduce noise (P3). |

**Net: 9 confirmed-red items** across required + adjacent workflows, none of which were "fixed" or hidden by this audit. Two are the same underlying Supabase auth issue confirmed three independent times. Two are the same underlying Decks-route script-loading race confirmed two independent times (and are **distinct** from the bug already fixed, unmerged, on the feature branch). Two are Home copy/version drift from the same redesign pass.

---

## 3. Feature / route inventory

Routes are dispatched from `bootstrap.js`'s `render()` → `pages` map. Status reflects current `main`.

| Feature | Route key | Status | Notes |
|---|---|---|---|
| Home | `dashboard` | **WORKING** (with CI-copy drift) | Real data throughout (rank, active deck, recent matches, meta read); no fabricated stats. Renderer is `home-command-center-v8.75.0.js`. Breaks 3 QA scripts on copy/version text only (§2), not functionally. |
| Card Database | *(shared service, no dedicated route)* | **WORKING** | Powers Deck Builder catalog and Collection; loaded from `cdn.jsdelivr.net/npm/pokemon-tcg-pocket-database`. `card-database-detail-behavior-qa.yml` green. |
| Saved Decks | `decks` | **PARTIALLY WORKING** | List/rename/duplicate/delete/favorite/collection-status all function. Two independent script-loading races (§2, §4) can show a loading screen or a hard error screen instead of the page, non-deterministically, depending on network timing. |
| Deck Builder | `decks` (editor) | **WORKING** | Pokémon/Trainer sections visually separated, live card-preview pane, drag-and-drop, +/− quantity controls, 20-card + copy-limit validation, collection-ownership badges. Subject to the same Decks-route loading races as above on first navigation. |
| Deck Import | `decks` (`#imp`) / builder modal | **PARTIALLY WORKING / BROKEN for set+number lines** | See §4 — the parser only recognizes set+number when hyphen-joined (`B1-196`) or bracketed/parenthesized; plain space-separated `SETCODE NUMBER` (the format in the task's own example block) is never recognized and always falls through to a failed whole-string name lookup. Does **not** destroy the existing deck on failure (confirmed safe: only commits a new deck at exactly 20/20 resolved, §8). |
| Collection | `collection` | **WORKING** | Card art, search, set/rarity/kind/stage filters, ownership/wishlist/trade quantities with inline quick-edit, set-completion %, bulk-select mode. `collection-behavior-persistence-qa.yml` green. |
| Battle Tracker | `matches` | **WORKING** | Quick/Detailed modes, sessions, history, CSV/JSON export. `matches-rank-session-hotfix-qa.yml`, `battle-stats-rank-persistence-qa.yml` green. |
| Statistics | `stats` | **WORKING** | Coaching/insights/matchup tabs over real match history. |
| Rank | `rank` | **WORKING** | Border forecast model, historical blending, session panel, chart, observations. Lazy-loaded (`rank_tools-v8.64.1.js`); no known break, but shares the general lazy-route pattern (loading screen on first visit; not confirmed broken like Decks). |
| Meta Center | `meta` | **WORKING** | Top archetypes with key-card art, usage, rank movement, matchup matrix, sample decklists, watchlist/compare, live/fallback source badge. No internal source names leak into the UI (`PtcgpDataCardSource`, `r4ph1-ptcgp-data`, etc. never render). `combined-meta-qa.yml`, `meta-tournament-hardening-qa.yml` reference this area. |
| Simulation / Gym | `optimizer` | **WORKING** | 5-player, 2-deck "Gym Battle" team format (`battle_gym.js`), pairing lab. |
| Tournaments | `tournaments` | **WORKING** | `tournament-event-click-qa.yml` green; falls back to `dashboard` only if `tournamentsPage` isn't registered (it's loaded eagerly, so this is a rare path). |
| Teams / Team Ranked | `teamwars` | **NOT INDEPENDENTLY VERIFIED THIS PASS** | Lazy-loaded (shares `profileTeamScripts` with Profiles); `rank-battle-ended-integration-qa.yml`, `rank-ended-season-qa.yml` reference adjacent behavior and are green historically. Dispute-evidence storage + RPCs exist server-side (§7). |
| Training / Brain Teasers | `training` | **WORKING** | `training-behavior-persistence-qa.yml`, `training-interactions-persistence-qa.yml` green. |
| Trade | `trade` | **WORKING** | Have/Want binder driven entirely by Collection tradeable/wanted quantities — no separate data store. |
| Streamer Toolkit | `streamer` | **NOT INDEPENDENTLY VERIFIED THIS PASS** | Largest lazy-route (19 chained scripts). `streamer-workspaces-qa.yml`, `streamer-obs2-qa.yml`, `streamer-ranked-refine-qa.yml`, `streamer-obs-remote-transport-qa.yml`, `obs-transport-api-smoke.yml` all green historically. Given its size, recommend a dedicated pass before launch if Streamer is beta-critical. |
| Profiles | `profile` | **WORKING** | `profile-media-persistence-qa.yml`, `profile-signed-out-privacy-qa.yml` / `signed-out-profile-privacy-qa.yml` (duplicate-named workflows — see §12 P3) green. |
| Player Search | *(overlay, not a route)* | **WORKING** | `global-player-search-v8.64.2.js`, loaded eagerly; opened via `openGlobalSearch()`, not a dedicated page. |
| Pocket Coach | `coach` | **WORKING** | Large surface area with its own dedicated QA family (card grounding, matchup drill-down/history, before/after, deck-intelligence) — all green historically. `pocket-coach-beta-launch-gate.yml` is itself green (stale). |
| Settings | *(folded into `more` / `account`)* | **WORKING** | No dedicated "Settings" route; utility drawer (`morePage()`) plus Account & Cloud cover this. |
| Account & Cloud | `account` | **WORKING**, with the sign-in path currently blocked by the Supabase 500 (§7) | See §4 auth detail below. |
| Pocket Sync | `sync` | **NOT INDEPENDENTLY VERIFIED THIS PASS** | Lazy-loaded; no QA failures found for it specifically. |
| About / Privacy / Support | `about` / static pages | **WORKING**, content assertions failing in Gate 6 only on Home copy | The legal pages themselves pass their own layout/heading/link checks in Gate 6; only the `checkAppSurface` Home-copy assertion fails (§2). |
| Legacy/unused | — | `js/features/pass3a-*`, `pass3b-*`, `pass3c-*`, `home-refine-v8.65.1.js`, `meta-cleanup-v8.64.1.js`, `decks-refine-v8.65.2.js`, `js/app/updates-v8.69.0.js`, `js/features/accessibility-repair-v8.66.0.js`, `js/app/streamer_rank_tools.js` (superseded by `rank_tools-v8.64.1.js`) | Confirmed **never referenced** by `index.html`, never self-injected by any loaded script, and never dynamically loaded by `route-feature-loader`. Zero runtime effect. See §6. |

---

## 4. Deck import failure — exact root cause

The importer (`analyzeImportedDeck` → `parseDeckText` → `resolveImportedCard`, all in `js/app/bootstrap.js`) resolves a line's set+number **only** when the text ends in one of these shapes:

- `[SET-NUM]` (brackets)
- `(SET NUM)` / `(SET-NUM)` / `(SET#NUM)` (parentheses)
- `Name - SET NUM` (space-hyphen-space before the code)
- `Name SET-NUM` (hyphen directly joining set and number, no space)

It has **no pattern for `Name SET NUM`** — set and number separated from each other, and from the name, by plain spaces with no hyphen. That is the exact format used in every line of the task's sample list:

```
2 Swablu B1 196
1 Mega Altaria ex B1 102
2 Professor's Research P-A 7
2 Poké Ball P-A 5
```

Trace for `2 Swablu B1 196`: quantity extraction correctly yields `qty=2`, `line="Swablu B1 196"`. All four set/number regexes then fail to match (none of them accept a bare space between the code and the number), so `set=""`, `number=""`, and the *entire* remaining string — `"Swablu B1 196"` — is kept as the card **name**. `resolveImportedCard` then skips its set+number branch entirely (both are empty) and falls through to a whole-string name lookup for `"Swablu B1 196"`, which matches no real card, so the line reports as unresolved: `Line 1: 2 Swablu B1 196`.

This happens identically and 100%-reproducibly for **every** line in the example block — it is not a timing/network/race issue, and it is independent of the two Decks-route loading races described in §2/§6 (those prevent the importer UI from even appearing sometimes; this is what happens once you can actually use it).

Confirmed **not** a data-loss risk: `importDeck()` only commits (pushes a new deck, does not touch any existing deck) when every line resolves and the total is exactly 20; any unresolved line aborts with a notice and leaves `state.decks` untouched (verified in `js/app/decks_meta.js:445-495` and independently by the data-loss audit, §8).

**Not fixed in this phase** per the audit rule. A repair would add a 5th pattern accepting `\s+([A-Za-z0-9]+)\s+(\d+)\s*$` and would need care to avoid false-positives against legitimate card names that end in a word and a number — recommend that repair include a regression test using this exact sample block.

---

## 5. Auth + cloud audit

- **Sign-in is currently broken for the QA account** with a Supabase-side `500: Database error granting user` on `/auth/v1/token?grant_type=password` — confirmed identically across 3 independent CI runs (`Signed-In Regression QA`, `Account Auth Final Hardening QA`, and a manual `workflow_dispatch` of `Signed-In Regression QA` against an unrelated branch/commit). A dedicated background audit of every migration, loose root `.sql` file, and Edge Function found **zero** triggers, hooks, or functions touching `auth.users`/`auth.sessions`/`auth.identities` in any way that could plausibly cause a Postgres error during a password grant. **This cannot be fixed from the repository** — it needs to be diagnosed via the Supabase Dashboard (Authentication → Hooks, and the specific QA account's row state) or with direct database/service-role access, neither of which this session has. This is the same finding from the prior UI-redesign phase, now independently re-confirmed rather than assumed.
- **Sign-out** (`cloudSignOut`/`signOutEverywhere`, `account-cloud-runtime-v8.64.1.js:78-82`) only clears cloud session state; it does not touch local `decks/collection/matches/rank`. Confirmed safe.
- **Sign-in cloud merge** (`account-cloud-core-v8.64.1.js` `hydrate()`, invoked on every `SIGNED_IN`/`INITIAL_SESSION`/`TOKEN_REFRESHED` event) is a real per-record last-write-wins merge (symmetric timestamp comparison, cloud wins ties), not a blind overwrite — see §8 for the one behavioral risk this creates (silent merge on account switch).
- Session restore, refresh, and route behavior while signed in were exercised by `Signed-In Regression QA`'s own route walk (`dashboard, matches, rank, meta, decks, collection, profile, coach, streamer, dashboard`) in past green runs; the workflow currently can't get past the sign-in step to re-verify this on the current commit.
- No accounts were reset, no sessions deleted, no production data touched during this audit.

---

## 6. Route/runtime audit — duplicate implementations, legacy overrides, load-order bugs

- **Two distinct, currently-reproducing Decks-route bugs**, both stemming from `route-feature-loader-v8.64.1.js`:
  1. *(Already fixed, unmerged)* The `decks` route entry gates the **entire page** behind a blocking loading screen while fetching two purely-decorative scripts (`deck-manager-art-v8.79.0.js`, `deck-builder-interaction-v8.79.0.js`), even though the real page function is already defined. Any render that lands mid-fetch shows the loading placeholder — no `#imp`, no `importDeck`. Fix verified and pushed to branch `claude/magical-turing-h0basm` (commit `b7de510`); **not on `main`**.
  2. *(Not fixed — new finding this phase)* `deck-manager-art-v8.79.0.js` self-injects its own `<script>` tag for `deck-builder-interaction-v8.79.0.js` (with query `?v=879000`) as soon as it runs, **in addition to** `route-feature-loader` independently trying to load the same file (query `?v=879000` in the `ROUTES.decks.scripts` list). `route-feature-loader`'s `scriptAlreadyPresent()` dedupe check compares only the script's **pathname**, ignoring the query string — so when it reaches that file in its own list, it sees the tag `deck-manager-art.js` just injected, assumes it's already loaded, and resolves immediately **without waiting for it to actually finish executing**. If that self-injected script hasn't finished downloading yet, `loadRoute`'s subsequent `ready()` check fails and it throws `"My Decks loaded without registering its page."` — an uncaught error that replaces the Decks page with a hard "could not load" error screen. Reproduced identically across 5 browser profiles in `RC1 Cross-Browser Proxy` and independently in `V8.65 RC1 Route Smoke`.
- **Massive dead-CSS/JS problem**, confirmed by grepping every reference in `index.html` and every dynamic `createElement('script'|'link')` call in `js/`: `css/pass3a-*.css` (3 files), `css/pass3b-*.css` (5 files), `css/pass3c-accessibility-v8.66.0.css`, `js/features/pass3a/b/c*` (there are none, the "pass3" family is CSS-only), `home-refine-v8.65.1.js`, `meta-cleanup-v8.64.1.js`, `decks-refine-v8.65.2.js` are **never loaded by any mechanism** — not in `index.html`, not self-injected, not in any `route-feature-loader` entry. Several recent commits (§1) edited these dead files, achieving **zero visible effect** on the live site. The actual live styling authority is `pocketnexus-ui-concept-v8.80.0.css` (statically linked, last in the cascade) plus each feature's own self-injected stylesheet.
- **Legacy override footgun**: `js/features/deck-builder-unrestricted-v8.72.5.js` wraps `window.decks` to strip collection-ownership UI from the Decks *list* page — but it runs *before* `js/features/experience-v8.36.js`, which unconditionally replaces `window.decks` again with its own full implementation, silently discarding the wrapper. The "unrestricted" (full-card-pool) behavior is therefore lost on the list page (though it still applies to the deck *editor*, whose wrapper runs after and isn't re-clobbered). Cosmetic/inconsistency only — not a crash — but worth fixing alongside the two races above since all three touch the same load-order area.
- `js/app/streamer_rank_tools.js` defines its own `rankBorderPage()`/tier-threshold table, duplicating `js/app/rank_tools-v8.64.1.js` — confirmed the latter is what actually loads (the former is unreferenced/dead).

---

## 7. Supabase audit

- **`supabase/migrations/` contains only 3 files** (all dated 2026-09-08): `20260908030000_add_matchup_card_evidence_rpc.sql`, `20260908042000_persist_pocket_coach_matchup_reports.sql`, `20260908210000_stream_overlay_remote_transport_v1.sql`.
- **6 additional schema-changing `.sql` files live at the repo root, outside the versioned migrations folder** — a direct violation of the project rule that all DB changes be versioned migrations: `V8.60.2_DB_MIGRATION.sql`, `V8.61.4_DB_MIGRATION.sql`, `V8.61.5_DB_MIGRATION.sql`, `V8.64.1_COMBINED_META_MATRIX.sql`, `V8.64.1_PUBLIC_SESSION_POSTS.sql`, `V8.64.2_POCKET_KNOWLEDGE_ENGINE.sql`. The two most recent of these (Sep 7) predate the three properly-placed migrations (Sep 8) — hand-applied root SQL continued even after the migrations folder was started.
- **`V8.61.4_DB_MIGRATION.sql` documents a production change (three training tables + two RPCs) with no actual SQL present in the file at all** — that schema change is unreproducible and unauditable from this repository.
- **RLS coverage**: every table for which `CREATE TABLE` DDL actually exists in-repo (`team_ranked_dispute_evidence`, `training_profile_showcase`, `profile_session_posts`, `game_knowledge`, `stream_overlay_sessions`) has RLS enabled in the same file, and the four user-data tables all have real `auth.uid() = user_id`-scoped policies. The two service-only tables (`game_knowledge`, `stream_overlay_sessions`) have RLS enabled with all `anon`/`authenticated` privileges revoked and no policies — safe (deny-by-default), but undocumented if grants ever change. The three tables named only in `V8.61.4`'s comments have **no discoverable RLS posture at all** (no DDL exists to check).
- **No `supabase/config.toml`** — no reproducible local Supabase project config is committed; the CLI can't be used to reproduce or diff the live database from this repo as checked out.
- **Edge Functions** (`supabase/functions/`): `limitless-refresh`, `limitless-tournament-proxy`, `pocket-coach`. All read secrets via `Deno.env.get(...)`; none hardcode a key. `pocket-coach` correctly verifies the caller's JWT before any privileged operation. **`limitless-refresh` has no caller-authentication check at all** and performs privileged writes (updates `meta_collector_state`/`meta_sources`, calls an ingestion RPC) using an elevated key sourced from `SUPABASE_SECRET_KEYS` — since Supabase Edge Functions accept any valid project JWT by default and there's no config overriding that, this function is callable by anyone holding the public anon key. No user-data confidentiality risk (it only writes shared meta/tournament rows), but it is an abuse/cost vector (unauthenticated triggering of external scraping against `play.limitlesstcg.com`, or poisoning of shared meta state). **Classified P2** — recommend a shared-secret or service-role-only gate before public launch.
- No `USING (true)`-style wide-open write policy found on any user-data table. No client-side (`js/`) use of a service-role key found — every client file uses only the public `sb_publishable_...` key.

---

## 8. Data-loss risk audit

Ranked by how easily a beta user could trigger real, permanent loss of their own data.

| # | Risk | File:line | Confirmation required? | Severity |
|---|---|---|---|---|
| 1 | **`importLocalBackup()` — selecting a file in the "restore from file" picker immediately and silently replaces the entire app state** (all decks, collection, matches, rank) via `replaceLiveState(incoming)`, with **no confirmation dialog and no diff/preview**. | `js/features/local-backup-restore-v8.70.0.js:29-40, 85-106` | **No — single click (file selection) is enough.** | **P1.** This is the single highest-priority data-loss item found. It sits right next to a correctly-guarded equivalent feature (see #2) — very likely an oversight when that safer pattern was built, not an intentional design. |
| 2 | Paste-JSON backup restore (`performPastedBackupRestore`) | `js/app/performance.js:31-46` | Yes — shows a comparison modal (deck/match/collection counts) with Cancel vs. "Restore Backup", and auto-exports a safety snapshot first. | Low — correctly guarded; included only to contrast with #1. |
| 3 | Cloud "Replace Browser" restore | `js/core/account-cloud-runtime-v8.64.1.js:142-151` | Yes — preview modal with Cancel / Safe Merge / "Replace Browser" (danger-styled), plus an automatic local recovery snapshot before replacing. | Low-Medium — guarded, but the danger button is one click once the modal is open. |
| 4 | Deck delete | `js/app/decks_meta.js:327-334` | Yes — confirmation modal; only path to `performDeckDelete` in shipped UI. | Low. |
| 5 | Silent cloud merge on every sign-in/token-refresh (`hydrate()` → `applyCloudDeckRows`/`applyCloudCollectionRows`/`applyBattleRankCloudRows`) | `js/core/account-cloud-core-v8.64.1.js:36-86`, `js/app/bootstrap.js:109-118,153-170,274-311` | N/A — automatic, no confirmation, by design. | **P2.** No record is ever dropped (it's a real last-write-wins merge, ties favor cloud, and first-sync is deliberately biased to keep local content) — but on a **shared device**, signing into a different account silently and permanently merges the previous guest's local decks/collection into that account before anyone can react. Not data loss, but real cross-account contamination risk worth documenting/mitigating before public (multi-user-device) beta. |
| 6 | Deck import overwrite | `js/app/decks_meta.js:445-493`, `js/app/bootstrap.js:788-794` | N/A | None found — both import paths always create a new deck via `makeId()`; no in-place overwrite exists. |
| 7 | SQL-side cascade deletes | all `ON DELETE CASCADE` found | N/A | None beyond the expected "deleting the Supabase auth account cascades that account's own rows" — correct account-deletion behavior, not a bug. The core tables actually backing cloud deck/collection/match sync are **not defined anywhere in this repo** (their DDL lives entirely outside the 3 migrations + 6 loose files), so their cascade behavior could not be audited — flagged as a **coverage gap**, not a confirmed risk. |

No `localStorage.clear()` call exists anywhere in the codebase. No bulk collection/match/rank reset feature exists.

---

## 9. UI / responsive audit (structural only — no redesign performed)

- Confirmed via CI, not just static reading: `beta-decks-auth-release-qa.yml`'s pre-flight step shows the 5 sampled hosted files byte-match `main` — no obvious asset/deployment drift.
- `account-auth-final-hardening-qa.yml` (when it gets past sign-in) checks auth-form overflow at 768/430/390px and requires overflow ≤12px — last time it ran cleanly this passed.
- `home-hosted-validation-v8.75.yml` checks Home overflow at desktop and mobile widths and asserts `quick actions` count stays between 4-6 — last full pass (before the version-string drift, §2) reported `overflow: 0` at both `desktop` and `mobile-390` in its own diagnostic dump, i.e. **no overflow regression**, only the copy/version assertions are failing.
- `Pass 3C Frontend Audit` (structural/accessibility-focused) has been red for 2+ weeks and hasn't re-run since — its current relevance to `main` could not be established this pass (see §2); treat as **unknown**, not confirmed-clean, until it can be forced to run.
- No dedicated mobile smoke test currently passes cleanly end-to-end on current `main` (the closest candidates — `RC1 Cross-Browser Proxy`, `RC1 Route Smoke` — are both red, but on the Decks-route script-loading bug, §6, not on layout).
- Given the scope limits of this phase, a full manual mobile/responsive click-through was **not** performed (no live-site network access from this environment, §1). This is a gap the repair phase should close with either a forced CI run or manual device testing.

---

## 10. Performance audit (observations only — no refactor performed)

- Card database (`DATA_URL` = `cdn.jsdelivr.net/npm/pokemon-tcg-pocket-database/dist/cards.json` + a second `cards.extra.json` metadata fetch) is only requested when navigating to `decks`, `collection`, `trade`, or `meta` (guarded by `cardsRequested` in `bootstrap.js`) — not loaded on every session/page, which is correct lazy behavior. It is **not** requested on Home, so Home's card-art enhancements (if any exist on `main`; none do — that work is only on the unmerged branch) would have nothing to draw from without an explicit trigger.
- `route-feature-loader-v8.64.1.js` exists specifically to keep large optional bundles (Streamer's 19-script chain, Training, Sync, Profile/Team Wars, Rank) out of the initial load — a deliberate, working performance pattern, undermined only by the two Decks-route bugs in §6.
- The dead `pass3a/b/c`, `home-refine`, `meta-cleanup`, `decks-refine` files (§6) impose **zero runtime cost** (never fetched by a browser visiting the site) — this is a repo-hygiene/maintenance-cost issue, not a live performance issue.
- No duplicate bundle loading, runaway polling loop, or repeated-request pattern was found in the areas this phase actually exercised (Home, Decks, Rank, Meta, Collection route dispatch). A full network-waterfall trace against the live site was not possible from this sandbox (§1) — recommend one during the repair phase.

---

## 11. Security check

- **Confirmed committed real secret: NO.** Two independent sweeps found no service-role key, PEM block, OpenAI/AWS-style key, or JWT-shaped literal anywhere in the repo. The only credential-shaped string present client-side everywhere is the intentionally-public `sb_publishable_...` anon key.
- **Confirmed client-side use of a privileged key: NO.** Every `js/` file uses only the public key; a `forbiddenKey` regex in `pocket-sync-adapter-service.js` actively strips `service_role`-named fields from anything synced to the cloud.
- **Confirmed wide-open (`USING (true)`) RLS write policy on user data: NO.** All user-owned-table write policies are correctly scoped to `auth.uid()`.
- **One real finding**: `supabase/functions/limitless-refresh/index.ts` performs privileged writes with no caller-authentication check (§7) — **P2**, abuse/cost risk, not a data-confidentiality breach.
- GitHub Actions workflows correctly `::add-mask::` every derived session token before writing it to `$GITHUB_ENV`; no workflow was found echoing a secret or a full response body containing one.
- No secret values are reproduced anywhere in this document or were printed during the audit.

---

## 12. Classified findings

### P0 — none confirmed.
No data loss occurs *automatically*, no committed secret was found, and the application is not unusable in production (most routes work; the live site serves current `main`).

### P1 — 3 confirmed
1. **`PocketNexus Deck + Auth Beta Release QA` red** — Decks-route blocking-loading-screen race hides `#imp`/`importDeck`. *Fix exists, verified, unmerged* (branch `claude/magical-turing-h0basm`, commit `b7de510`). — `js/features/route-feature-loader-v8.64.1.js`
2. **`PocketNexus Signed-In Regression QA` (+ `Account Auth Final Hardening QA`) red** — Supabase `500: Database error granting user` blocks all password sign-in for the QA account; blocks verifying signed-in behavior at all. Root cause is outside this repository (Supabase Dashboard Auth Hooks or account row state) — cannot be fixed by a code change here. — Supabase project-level, not a repo file.
3. **Unconfirmed, single-click full-state overwrite via local file restore** — `js/features/local-backup-restore-v8.70.0.js:29-106`. No confirmation dialog exists before `replaceLiveState()` runs.

Also effectively P1 by the stated release gate ("Required GitHub Actions GREEN"), even though their underlying application impact is copy/version drift rather than a functional break:
4. **`PocketNexus Gate 6 Legal + Beta Cleanup QA` red** — Home hero copy no longer matches any of the 3 hardcoded sentinel phrases the test checks. — `js/features/home-command-center-v8.75.0.js`
5. **`PocketNexus Home Command Center QA` / `PocketNexus Home Hosted Validation` red** — Home's `data-home-version` is `8.80.1`; both QA scripts hardcode `8.75.0`. — same file, and the two `.github/workflows/*.yml` files themselves.
6. **`PocketNexus RC1 Cross-Browser Proxy` / `PocketNexus V8.65 RC1 Route Smoke` red** — second, distinct Decks-route script double-injection race (`deck-manager-art-v8.79.0.js` + `route-feature-loader-v8.64.1.js` both loading `deck-builder-interaction-v8.79.0.js`, deduped by pathname only, not by completion) throws `"My Decks loaded without registering its page."` and shows a hard error screen. Reproduced across 5 browser profiles.

### P2 — 5 confirmed
1. Deck importer cannot resolve the `Name SETCODE NUMBER` (space-separated, no hyphen/brackets) format at all — every line in the task's own sample block fails to resolve, though the deck itself is never corrupted (§4). — `js/app/bootstrap.js` (`parseDeckText`)
2. Silent, automatic cloud-merge on sign-in creates cross-account data contamination risk on shared devices (no data loss, but a previous guest's local data gets permanently merged into whichever account signs in next) — `js/core/account-cloud-core-v8.64.1.js`, `js/app/bootstrap.js`
3. `supabase/functions/limitless-refresh` accepts unauthenticated privileged writes (abuse/cost risk, not a confidentiality breach) — `supabase/functions/limitless-refresh/index.ts`
4. Repository-side migration hygiene gap: 6 schema-changing `.sql` files applied outside `supabase/migrations/`, one of which (`V8.61.4`) documents a change with **no SQL present at all** — unreproducible/unauditable backend state. No `supabase/config.toml` committed.
5. `deck-builder-unrestricted-v8.72.5.js`'s collection-scrub wrapper on the Decks list page is silently discarded by a later unconditional `window.decks` reassignment in `experience-v8.36.js` — cosmetic inconsistency (full-card-pool intent lost on the list page only), not a crash.

### P3 — cosmetic / cleanup, not launch blockers
- 4 dead CSS "pass3a/b/c" files + 3 dead JS files (`home-refine-v8.65.1.js`, `meta-cleanup-v8.64.1.js`, `decks-refine-v8.65.2.js`) plus 2 confirmed-orphaned files (`js/app/updates-v8.69.0.js`, `js/features/accessibility-repair-v8.66.0.js`) and one confirmed-duplicate (`js/app/streamer_rank_tools.js`, superseded by `rank_tools-v8.64.1.js`) — zero runtime cost, but wasted maintenance effort (confirmed: 3 of the last 5 commits edited dead files for no live effect).
- Two near-duplicate workflow files with the same display name (`profile-signed-out-privacy-qa.yml` and `signed-out-profile-privacy-qa.yml`, both "PocketNexus Signed-Out Profile Privacy QA") — redundant, confusing in the Actions UI.
- ~50 of the 74 workflow files are one-shot historical "Apply X" migration scripts no longer relevant to ongoing CI — recommend archiving/removing to reduce noise before public beta.
- `Pass 3C Frontend Audit`'s current relevance is unknown (stale 2+ weeks) — needs a forced rerun to reclassify, not a fix.
- No fragmented single app-version identifier exists (§1) — a minor discoverability/support issue, not a functional one.

---

## 13. Recommended repair order

1. **Merge the already-fixed Decks blocking-loading-screen race** (branch `claude/magical-turing-h0basm`, commit `b7de510`) — this alone should turn `PocketNexus Deck + Auth Beta Release QA`'s import-availability assertion green (the workflow's later steps still depend on #2 below and on live Supabase auth working).
2. **Fix the second Decks-route race** (§6/§2): either make `route-feature-loader`'s dedupe check track promise-completion (not just DOM presence) for scripts that might be injected by another script, or remove `deck-manager-art-v8.79.0.js`'s redundant self-injection of `deck-builder-interaction-v8.79.0.js` entirely (let `route-feature-loader` own that load exclusively, since it already lists both files for the `decks` route).
3. **Add a confirmation step to `importLocalBackup()`** before `replaceLiveState()` (§8, P1) — mirror the existing paste-JSON restore's compare-and-confirm pattern (`js/app/performance.js:31-46`), which already does this correctly.
4. **Diagnose the Supabase `Database error granting user` outside this repo** — Dashboard → Authentication → Hooks, and the QA account's `auth.users`/`auth.identities` rows. This blocks re-verifying essentially all signed-in behavior via CI and should be treated as the top non-code priority.
5. **Realign the 3 CI text/version assertions to the current Home copy** (`Gate 6 Legal + Beta Cleanup QA`, `Home Command Center QA`, `Home Hosted Validation`) — either update the hardcoded strings/version to match intentional current copy, or revert the copy if the old phrasing was load-bearing for legal/brand reasons. Either direction is a legitimate fix; leaving it red is not.
6. **Deck importer**: add the missing `Name SETCODE NUMBER` (space-separated) parsing pattern, with a regression test using the task's own sample block, and care taken not to false-positive on legitimate card names.
7. **Gate `limitless-refresh`** behind a shared-secret or service-role-only check (§7/§11, P2).
8. **Backend hygiene**: move the 6 loose root `.sql` files' *intended* state into proper `supabase/migrations/` entries (reconstructing `V8.61.4`'s missing SQL from the live database first, since it isn't in the repo at all), and add a committed `supabase/config.toml`.
9. **Cleanup pass** (P3): remove or clearly mark the dead CSS/JS files so future "visual system" work can't be silently wasted on them again; consolidate/rename the duplicate "Signed-Out Profile Privacy" workflows; prune stale one-shot `workflow_dispatch` migration workflows.
10. Re-run the full required-workflow suite after 1–5 and confirm the release gate (§14) before touching anything cosmetic.

---

## 14. Release gate — current status

| Condition | Status |
|---|---|
| P0 = 0 | ✅ Met (none confirmed) |
| P1 = 0 | ❌ **Not met** — 3-6 items depending on how strictly "required GitHub Actions GREEN" is read (§12) |
| Required GitHub Actions GREEN | ❌ **Not met** — 9 confirmed-red workflows (§2) |
| Authentication verified | ❌ **Not verified** — cannot currently sign in at all (Supabase 500) |
| Cloud data persistence verified | ⚠️ **Partially** — merge logic is sound by static/code review (§5/§8), but could not be exercised live this pass because sign-in itself is broken |
| Deck systems verified | ⚠️ **Partially** — builder/list/collection-status logic sound; import broken for the documented format (§4); two route races affect reliability of even reaching the page (§6) |
| Battle systems verified | ✅ Green QA, no new issues found |
| Rank systems verified | ✅ Green/no known break, not deeply re-exercised this pass |
| Collection verified | ✅ Green QA, no new issues found |
| Meta verified | ✅ Green QA, no internal-source leak, no fabricated stats |
| Critical routes render | ⚠️ **Mostly** — Decks intermittently does not (§6) |
| Mobile smoke test passes | ⚠️ **Unverified this pass** — no live network access from this sandbox; nearest CI signal (`RC1 Cross-Browser Proxy`) is red on the Decks bug, not on layout |
| No known data-loss regression | ❌ **Not met** — §8 item #1 (unconfirmed local-backup restore) is a real, currently-shipped, single-click data-loss path |
| Production deployment verified | ✅ Confirmed — `beta.pocketnexus.app` serves `main` HEAD `077a17e0` (§1) |

**Overall: NOT BETA READY.** The release gate is not satisfied. Nothing in this report should be read as "beta ready" until the P1 items in §12 are resolved and the required workflows in §2 are re-verified green against a fresh run.

---

## Systems that must not regress (per project rules, all inspected, none modified)

Authentication, Cross-device cloud sync, Saved Decks, Deck Builder, Collection, Battle Tracker, Rank, Meta, Teams, Profiles, Training, Streamer tools, Supabase RLS — all inspected in this audit; **no changes were made to any of them.**
