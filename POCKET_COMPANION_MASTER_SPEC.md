# PocketNexus — Master Project Spec

## Project identity
Independent third-party companion for Pokémon TCG Pocket. It is not an official Pokémon, Limitless, or tournament-platform application.

## Core development rule
Preserve existing working features and user data compatibility unless the project owner explicitly approves removal or replacement. New versions build forward from the newest confirmed working ZIP.

## UI direction
- Pokémon TCG Pocket-inspired interface.
- Dark mode is the primary visual foundation.
- Keep layouts readable, responsive, and visually cohesive.
- Use linked/reference products only as design inspiration; do not imply affiliation.

## Systems that must remain intact
- Home dashboard and navigation
- Card database, artwork normalization, card detail UI
- Collection and bulk claim flows
- 20-card Deck Builder, saved decks, imports, and Meta Deck quick-select
- Battle Log, statistics, Simulation Lab, and matchup tools
- Meta Center, archetype library, tournament intelligence
- Ranked Play / Rank Details / RP and streak tracking
- Streamer Toolkit and OBS overlays
- Supabase authentication, cloud sync, RLS-protected user data
- LocalStorage fallback/compatibility for guest mode

## Rank Intelligence backend
Supabase project: existing production project.
Relevant backend objects include rank_seasons, rank_border_observations, rank_border_predictions, rank_collector_status, rank_thresholds, and ranked-session functions.

### V8.51.4 rank backend behavior
- rank-border-live automatically selects the active season.
- If there is no active season, it returns the most recent completed season as history instead of failing or pretending it is live.
- The payload exposes nextSeason and activeSeason separately.
- Offseason and upcoming-season states are valid states, not errors.
- Latest prediction timestamp is exposed as generatedAt.
- rank-predict delegates to the database forecast function so the SQL model is the single source of truth.
- Frontend cached rank payloads show CACHED instead of remaining stuck on LOADING.

## Current development line
V8.51.x

### V8.51.4 — Rank Backend Completion
- Supabase rank-border-live upgraded for active/offseason/upcoming lifecycle handling.
- Supabase rank-predict consolidated onto database prediction RPC.
- Rank page cache/status integration repaired.
- Rank page now explains between-season state and the next scheduled season.

## V8.51.5 — Historical Rank Intelligence
- Supabase tables: `rank_historical_seasons`, `rank_historical_border_observations`.
- Historical library initially covers B2, B2A, B3A, B3B, and B4 using publicly indexed `@PokePoke_border` snapshots.
- `generate_rank_border_predictions()` model version is `v3-historical-blend` for future active seasons.
- Forecast priority: fresh current-season observations first; historical comparable-season behavior is a secondary weighted signal.
- `rank-border-live` v3 exposes historical coverage and model diagnostics to the frontend.
- Never present historical/community values as official Pokémon leaderboard data.

## V8.51.6 — Rank Intelligence Visual Polish
- Presentation-only redesign of the Advanced Rank Intelligence area.
- Forecast, historical-model, personal-position, chart, methodology, and observation sections now use consistent dashboard cards and spacing.
- Rank chart axis/legend readability repaired for dark mode.
- Mobile/tablet responsive behavior added to the advanced rank panels.
- No forecast model, Supabase schema, ranked-session behavior, RP calculations, or historical source data changed from V8.51.5.


## V8.51.7 — Gym Meta Deck Support
- Gym Battle lineup selectors use the shared deck selection model: **My Decks + Meta Decks**.
- Meta archetypes can be selected directly without being imported or copied into My Decks.
- Gym Battle resolves `meta:*` deck IDs through the same shared selectable-deck resolver used by Battle Tracker.
- Deck Pairing Lab includes both personal and Meta decks when calculating available pair combinations.
- Regression rule: do not revert Gym Battle to saved-decks-only selection.


## V8.51.8 — Collection Filter Repair
- Collection uses `cards.extra.json` from the existing card-data package because the smaller `cards.json` lacks Pokémon/Trainer and evolution-stage metadata needed by filters.
- Card normalization maps source `type` to Pokémon/Trainer and source stage values (`basic`, `1`, `2`) to `Basic`, `Stage 1`, and `Stage 2`.
- Collection stage filtering compares normalized stage values exactly.
- Regression rule: do not revert Collection to metadata-poor `cards.json` unless stage/type metadata is supplied another way.


## V8.51.9 — Deck UI Regression Repair
- `cards.json` remains the canonical dataset for deck IDs, deck artwork, saved-deck references, and shared card rendering.
- `cards.extra.json` is metadata-only enrichment for Collection Pokémon/Trainer and evolution-stage filters.
- Regression rule: never replace the canonical deck/card dataset just to add Collection metadata; merge metadata onto canonical cards instead.


## V8.51.10 — Meta Center Visual Polish
- Presentation-only redesign of the competitive Meta Center.
- Fixed `.metaHeroGlow` so it is decorative/absolute and never occupies a Meta Hero grid cell.
- Added distinct visual hierarchy for hero freshness, summary KPIs, event table, preparation cards, data quality, Meta Signals, and Top Decks.
- Meta Signals must keep separate label/value/detail lines; do not regress to unstyled inline text.
- No Meta Service/Supabase calculation, tournament ingestion, archetype classification, deck data, or user result logic changed.
- Preserve V8.51.9 canonical `cards.json` deck/card behavior and Collection-only metadata enrichment.

## V8.51.11 — Deck Pairing Lab Visual Polish
- Presentation-only redesign of the Gym Battle Deck Pairing Lab.
- Pairing formulas, matchup evidence, Meta sample selection, scout-target logic, saved deck handling, Meta deck handling, and Gym assignment behavior are unchanged.
- Pairing Lab must keep distinct visual hierarchy for summary KPIs, strategy controls, opponent scouting, live matchup lookup, and ranked recommendations.
- The #1 pair recommendation is visually featured; alternatives remain readable cards rather than unstyled text rows.
- Opponent scout targets must render as separate chips and never collapse into concatenated inline text.
- Preserve all V8.51.10 Meta Center polish and earlier regression rules.



## V8.51.12 — Performance Coaching Visual Polish
- Visual-only redesign of Performance > Coaching / Actionable Coaching.
- Added polished coaching hero, focus-area count, priority cards, clearer Why / Focus next hierarchy, priority accents, responsive layout, and improved Performance navigation shell.
- No coaching formulas, Battle Tracker data, RP calculations, recommendation thresholds, Meta logic, decks, Collection, Gym, Rank Intelligence, or Supabase behavior changed.

## V8.51.13 — Performance Overview Chart Repair
- Repaired missing SVG chart styling on Performance Overview.
- Restored readable dark-mode axes, grid lines, trend lines, data points, and legends.
- Styled Recent Form W/L results as compact status chips instead of raw text.
- Improved Turn Order and Recent Trend panel hierarchy and spacing.
- Visual-only repair; analytics calculations and recorded match data are unchanged.


## V8.51.14 — Performance Workspace Repair
- Repaired Performance workspace visual regressions across Deck Performance, Matchup Intelligence, Personal Meta, and Tournament Prep.
- Hardest Matchups now only lists qualifying weak/negative-RP matchups instead of duplicating perfect-win-rate entries.
- Improved desktop/mobile tables, matrix cards, practice-priority cards, tournament prep metrics, notes, checklist, and chart contrast.
- Preserved Battle Tracker records, RP calculations, Meta data, decks, Collection, Gym, Rank Intelligence, and Supabase behavior.

## V8.51.15 — Simulation Lab Cloud Backend
- Added Supabase-backed opening-hand simulation history with per-user RLS.
- Simulation runs save locally for guests and sync to `simulation_runs` for signed-in users.
- Added cloud/local status, saved run history, and a clearer Simulation Lab readiness flow.
- Does not fabricate battle win rates; simulation remains opening-hand consistency only.

## V8.51.16 — Simulation Roadmap Complete
- Cloud simulation history, Deck vs. Deck evidence testing, Meta matchup evidence testing, and Replay Timeline are live.
- Simulation matchup/replay data is protected by per-user Supabase RLS.
- Do not describe the evidence model as a complete turn-by-turn Pokémon TCG Pocket rules engine.

## V8.52.0 — Pocket Coach AI Foundation
- Added a dedicated Pocket Coach page and responsive chat workspace.
- Added Supabase `ai_conversations` and `ai_messages` with per-user RLS.
- Added JWT-protected `pocket-coach` Edge Function. It builds server-side context from the signed-in user's synced decks, Battle Tracker matches, Collection, Rank History, Simulation Lab, plus aggregate current Meta data.
- Conversation messages and source labels persist to Supabase.
- Current model is `grounded-rules-v1` / provider `foundation`; no external generative AI provider is configured yet.
- Regression rule: never expose private AI/provider keys in browser JavaScript or `index.html`.
- Grounding rule: Pocket Coach must state when data is missing, untested, stale, or too small; it must not invent game results, matchup evidence, rank values, or collection ownership.
- Preserve independent third-party positioning; Pocket Coach is not an official Pokémon assistant.

## V8.52.1 — Real AI Model Connection
- Pocket Coach is wired to the OpenAI Responses API through the existing JWT-protected Supabase `pocket-coach` Edge Function.
- Default model: `gpt-5.6-terra`, selected for a balance of reasoning quality and operating cost. The server can override this with the `OPENAI_MODEL` Edge Function secret/environment variable.
- `OPENAI_API_KEY` must exist only as a Supabase Edge Function secret. Never place it in `index.html`, browser JavaScript, localStorage, or any downloadable project file.
- The Edge Function builds compact server-side context from My Decks, Battle Tracker aggregates, Collection ownership, Rank History, Simulation Lab, and Current Meta, plus recent conversation history.
- The model is explicitly instructed to distinguish personal evidence from aggregate Meta data and to state when evidence is missing, stale, untested, or based on a small sample.
- If the OpenAI key is absent, Pocket Coach falls back to `grounded-rules-v1` instead of failing or exposing configuration details.
- The Pocket Coach UI checks provider status and labels whether the real model is connected.

## V8.54.0 — Profiles + Team Wars
- Expanded cloud player profiles with username, bio, favorite deck, rank/RP fields, privacy JSON, and showcase deck support.
- Added Profile page with Battle Tracker record, deck count, rank summary, team membership, and editable cloud profile fields.
- Added Supabase Team Wars backend: `teams`, `team_members`, `team_invites`, `team_seasons`, `team_wars`, `team_war_lineups`, and `team_war_matches`.
- Team Wars format defaults to 5 players and 2 decks per player. Winner stays on the same deck; first loss switches to Deck 2; second loss eliminates the player; the next lineup slot enters.
- Added invite-code acceptance, public standings, roster roles (captain/admin/member), scheduling, 5-slot lineup editor, saved/deployed personal + Meta deck selection, live war console, battle timeline, automatic deck switching, elimination, scoring, and winner resolution.
- Team Wars and profile data are cloud-backed and protected with RLS/membership-aware policies.
- Nintendo/Pokémon account credentials must never be collected or stored. Official account sync remains disabled unless Nintendo/The Pokémon Company exposes an official third-party authorization/API flow.
- Preserve all V8.52.1 Pocket Coach AI behavior and every existing deck, Collection, Battle, Rank, Meta, Simulation, Gym, and Streamer system.

## V8.54.1 — Public Competitive Identities
- Profiles are now public competitive identities when the user opts in through `privacy.public_profile`.
- Player identity supports avatar URL, banner URL, username, bio, rank/RP display, favorite deck, team membership, public aggregate battle stats, and achievements.
- Achievement badges are cloud-backed in `profile_badges` and refreshed from the authenticated user's own Battle Tracker and Team Wars history.
- Public stats are stored separately in `profile_public_stats`; public pages never expose raw cloud match payloads.
- Teams support public logos, descriptions, public team pages, public roster cards, team record, and recent war history.
- Team Wars roster players are clickable and open public player profiles when the player has opted into a public profile.
- Team Wars has season-aware standings through `get_team_season_standings`, with wins/losses/draws/points and clickable public team rows.
- Captains/admins can edit team logo and description from Team Wars.
- Privacy rule: public identity is opt-in/out via profile privacy; raw private deck, match, collection, rank-history, AI, and simulation data remain private unless explicitly surfaced as aggregate/profile fields.


## V8.54.2 — Team Management + Competitive Seasons
- Captain controls: promote/demote admins and remove non-captain members.
- Recruiting: team applications plus a public free-agent market.
- Competitive seasons: captain-created seasons, team entries, round-robin schedule generation, league standings, and season-linked war rooms.
- Playoffs: seeded bracket generation from season standings with organizer winner controls.
- Awards: Season MVP calculated from recorded Team Wars match wins.
- League Hub: one Team Wars homepage combining standings, fixtures, bracket, awards, recruiting, and roster management.
- Security: roster RLS prevents removal/reassignment of the captain; Team Wars SECURITY DEFINER RPCs are no longer callable by anonymous users.


## V8.54.3 — Team Wars Ranked Queue + Same-Tag Lock
- Shared team rating starts at 1500 RP.
- Individual members queue on behalf of their current active team.
- Matchmaking hard-excludes the same team ID and the same team tag, case-insensitively. This rule is enforced in the Supabase matcher and again by a database check constraint on ranked matches.
- Queue matching prioritizes nearby team rating and widens its search window for waiting players.
- Website-generated private-match code is displayed to both matched players for Pokémon TCG Pocket Private Match.
- Results require reciprocal confirmation (one Win, one Loss). Matching reports that conflict become disputed and do not change rating.
- Ranked result settlement is fixed +20/-20 Team RP with no streak bonuses.


## V8.54.4 — Team Wars UI Rework
- Team Wars uses a compact tabbed workspace: Overview, Ranked, League, Team, and staff-only Manage.
- All V8.54.3 ranked queue, same-tag lock, public identity, recruiting, season, playoff, awards, roster, and war-room systems remain available.
- Overview surfaces only the highest-value at-a-glance information: Team RP, record, members, roster preview, and recent wars.
- Management-heavy forms are moved behind the Manage tab to reduce visual clutter.
- No backend or rating-rule changes.


## V8.54.5 — Login Reliability Repair
- Preserves Supabase email/password, Google, Apple, password recovery, guest mode, and cloud sync.
- Removes the old V8.36 entry-screen override so one canonical login UI owns the auth experience.
- Email/password sign-in now applies a successful session immediately instead of waiting for cloud hydration/merge work.
- Cloud profile/deck/collection/battle hydration failures no longer block an otherwise successful login.
- Adds auth-client loading recovery, busy states, Enter-to-sign-in, and clearer error/status messages.
- OAuth and recovery flows use a valid hosted http/https redirect URL and clearly explain why they cannot complete from file:// local testing.
- Local guest data remains untouched when signing in.


## V8.54.6 — Competitive Account Gate Repair
- Fixed Team Wars/Profile Open Account buttons for local guest sessions.
- Competitive sign-in gates now open Account & Cloud directly instead of depending on header navigation.
- Added cache bust for the repaired Team Wars script.


## V8.54.7 — Public Team Navigation Fix
- Opening a team now switches the app route to Team Wars before rendering the public team page.
- Opening a public player profile switches the app route to Profile before rendering.
- Prevents Account & Cloud from immediately re-rendering over a successfully opened team/profile page.


## V8.54.8 — Public Profiles Hub
- Added dedicated Profiles navigation entry.
- Profiles is the public competitive identity workspace: stats, rank, team, achievements, bio, favorite deck, and deck showcase.
- Public profile editing is contained in a modal to keep the main profile uncluttered.
- Account & Cloud remains focused on private sign-in, security, and sync.


## V8.54.9 — QA Repair Build
- Team Wars deck selectors support canonical object-backed saved decks.
- Public player/team pages can be viewed without signing in when marked public.
- Account & Cloud no longer duplicates public-profile editing; Profiles owns public identity settings.
- Deck Showcase uses explicit user-selected decks (up to 3) and real deck counts.
- Profile refresh reloads cloud profile data after identity synchronization.
- Team season standings follow the selected season and include a season selector.
- Tournament catalog failures show a retryable error instead of an endless loading state.
- Canonical card data is cached locally after a successful fetch and restored when the CDN is unavailable.
- Navigation removes duplicate mobile Team Wars and global search includes Profiles/Team Wars.
- Cache-busting query for core navigation is repaired.


## V8.54.10 — Public Identity Sign-In Loop Repair
- Fixed Profiles/Team Wars authentication detection to read the active Supabase client/session through `getPPCCloudClient()` and `getPPCCloudSession()` instead of stale/nonexistent `window.cloudClient` and `window.cloudSession` properties.
- This stops the Public Identity → Sign in → Profiles endless loop after a successful login.
- Cache-busted the competitive identity script to ensure browsers load the repaired code.

## V8.55.0 — Player Search + Trophy/Achievement System
- Profiles is now the public competitive identity hub for PocketNexus.
- Added public Player Search by username/display name. Search results show public rank, team, wins, and achievement count and open the player's public profile.
- Public Player Search works for signed-out visitors; private profiles remain undiscoverable.
- Added a server-backed achievement catalog with Common, Rare, Epic, and Legendary tiers.
- Expanded automatic achievements for battle wins, total battles, Team Wars participation/wins, Team Ranked participation, Master Ball, and Season MVP.
- Added locked achievement previews so players can see milestones they have not earned yet.
- Added Trophy Cabinet controls: players can feature up to four earned achievements on their public profile.
- Public profiles now emphasize Trophy Cabinet, achievement collection, stats, team identity, and deck showcase.
- Added case-insensitive unique usernames for reliable public profile lookup.
- Public search uses a dedicated random `public_profile_id` instead of exposing the user's authentication UUID in search results.


## V8.56.0 — Team Ranked 2.0
Added a season-backed shared Team RP ladder. Active season entries begin at 1500 RP, confirmed ranked matches move +20/-20 with no streak bonuses, and the same-team/same-tag locks remain server-enforced. Team Wars Ranked now includes a season header, public team leaderboard, verified match history, peak RP, and per-player current-season contribution stats. Rating history is persisted per team and match in Supabase.


## V8.57.0 — Full QA + Mobile Stability Pass
- Treat V8.56.0 as the feature baseline; this release is intentionally stability-first.
- Mobile hardening added for Team Wars/Ranked tables, season cards, history rows, tabs, dialogs, forms, search overlays, tournament panels, and safe-area behavior.
- Touch controls use larger mobile targets and mobile form fields use 16px sizing to avoid browser auto-zoom.
- Fixed the remaining stale cloud-auth check in Competitive Creator Expansion by routing sign-in/client access through getPPCCloudClient/getPPCCloudSession.
- No Team Ranked scoring, matchmaking, season, or profile data model changes in this release.

## V8.58.0 — Beta Launch Prep
- V8.57.0 remains the stability foundation.
- About is now an About, Privacy & Beta center covering independent-project status, beta limitations, data handling, public competitive identity, third-party/community data, and security expectations.
- Beta testers can create a downloadable JSON issue report containing their written feedback and basic runtime diagnostics. Reports must not intentionally include passwords or private service-role/API secrets, and users are told to review reports before sharing.
- Added an explicit beta launch checklist for hosted auth, real two-team Team Ranked testing, public profile privacy, mobile/device coverage, backup/restore, AI server secrets, and launch communication.
- This release is beta preparation, not a claim that the service is legally or operationally production-ready.

## V8.59.0 — Pocket Sync Foundation
- Added a dedicated Pocket Sync Center covering Collection, Rank/RP History, and Battle History automation readiness.
- Supabase tables: `pocket_sync_capabilities`, `pocket_sync_connections`, and `pocket_sync_runs`.
- Connection/run records are protected with per-user RLS; source capability rows are read-only to clients.
- `official_pocket_api` is intentionally marked `research` until a verified official third-party Pocket authorization/API can expose relevant player data.
- Sync architecture stores non-secret connection metadata and provenance/run results; it does not contain credential fields.
- Hard rule: never request/store Nintendo/Pokémon passwords, copied browser cookies, or reusable game-session tokens; never reverse-engineer private Pocket endpoints.
- Existing local/manual Collection, Rank, and Battle Tracker workflows remain available while the research gate is active.
- Preserve V8.58 closed-beta launch behavior and all earlier canonical `cards.json` regression rules.

## V8.59.1 — Pocket Sync Data Ingestion Layer
- Added a source-agnostic staging pipeline for Collection, Rank/RP History, and Battle History records.
- Incoming records are normalized into canonical Companion shapes before merge; Collection cards resolve to canonical `cards.json` IDs.
- Import batches classify records as ready, duplicate, conflict, or invalid before any data is applied.
- Collection quantity disagreements are never silently overwritten; conflicting records stay staged for review.
- Duplicate Rank/Battle record IDs are skipped. Ready records merge into the existing Collection, Rank History, and Battle Tracker systems and then use the existing cloud-sync paths.
- Signed-in users get protected Supabase import-batch/item provenance through `pocket_sync_import_batches` and `pocket_sync_import_items`, both with own-user RLS.
- The ingestion layer does not imply that an official Pocket player-data API exists. It is deliberately source-agnostic so a future legitimate read-only source can plug into the same normalization and review pipeline.
- Preserve the hard rule against passwords, cookies, reusable session tokens, and private-endpoint reverse engineering.

## V8.59.2 — Pocket Sync Adapter Framework
- Added a standard adapter registry and schema-versioned read-only envelope between external data sources and the V8.59.1 ingestion pipeline.
- Every adapter declares source identity, version, availability, supported Collection/Rank/Battle scopes, and read-only status.
- Added `staged_json` as the runnable reference adapter so the full adapter → ingestion → review → merge path can be tested without claiming Pocket account access.
- Added `official_pocket_api` as a disabled research placeholder. It cannot run until a verified official third-party Pocket player-data API and authorization flow exists.
- Adapter output is standardized into `domains.collection`, `domains.rank_history`, and `domains.battle_history`, then passed through existing canonical normalization/deduplication/conflict rules.
- Adapter diagnostics show contract version, adapter id, duration, and per-domain record counts.
- Framework rejects password, cookie, reusable session-token, refresh-token, client-secret, service-role, and game-session credential fields at the adapter boundary.
- No private endpoint discovery, credential extraction, or gameplay automation was added.

## V8.59.3 — Automatic Sync Orchestrator
- Added a standard orchestrator above the V8.59.2 adapter framework.
- Available adapters can be triggered manually through one execution path.
- Signed-in users can save cloud-backed schedules with cadence, retry limit, and auto-apply preference.
- Each run records adapter/source, trigger kind, attempts, result counts, provenance, status, and error state.
- Transient failures retry with exponential backoff.
- Successful adapter envelopes are sent directly into the V8.59.1 normalization/deduplication/review/merge pipeline.
- Ready records can auto-apply; Collection conflicts remain staged and are never silently overwritten.
- Browser scheduling runs only while PocketNexus is open; schedule records are designed to be reusable by a future approved server-side source.
- No Pocket/Nintendo/Google/Apple passwords, cookies, reusable session tokens, client secrets, or service-role keys are accepted by the sync architecture.
- Official Pocket Sync remains behind the research gate.


## V8.59.4 — Sync Conflict Resolution & Audit Trail
- Added a dedicated Pocket Sync Conflict Center for signed-in users.
- Conflicting records remain blocked until the user explicitly chooses Accept Incoming or Keep Existing.
- Added `pocket_sync_audit_events` with per-user RLS and resolution metadata on `pocket_sync_import_items`.
- Audit records preserve before, incoming, and after snapshots plus source/action metadata.
- No Nintendo/Pokémon passwords, cookies, reusable session tokens, client secrets, or service-role credentials are stored.
- Existing V8.58 beta systems and V8.59 ingestion/adapter/orchestrator behavior remain preserved.


## V8.60.0 — Team Ranked Completion Foundation
- Active development moved from completed V8.59 sync infrastructure to Team Ranked completion.
- Added ranked dispute cases for conflicting reports; no RP moves while disputed.
- Added past-season archive and historical season ladder browser.
- Preserved shared Team RP rules: 1500 season start, +20/-20, no streak bonus, same-team and same-tag matchmaking lock, reciprocal result verification.
- Next V8.60 work: staff dispute resolution workflow, stronger match lifecycle/expiry, and real two-team hosted QA.


## V8.60.1 — Team Ranked Staff Resolution + Audit
- Added global Team Ranked staff authorization backed by `team_ranked_staff`; no public client write policy can self-grant staff.
- Added atomic `resolve_team_ranked_dispute` settlement for Team A win, Team B win, or void.
- Winner/loser resolutions apply the existing fixed +20/-20 Team RP model and update season entries, team totals, match state, and rating history in one transaction.
- Void resolutions close the match with no RP movement.
- Added `team_ranked_dispute_events` audit history with participant/staff read access.
- Ranked UI shows a staff-only dispute console when the signed-in account is authorized.
- Existing reciprocal reporting and same-team/same-tag protections remain unchanged.
- Staff accounts must be explicitly granted in Supabase; the frontend cannot promote itself.

## V8.60.2 — Ranked Match Lifecycle Hardening + Screenshot Evidence
Status: Complete.

Team Ranked lifecycle is hardened for beta testing. Queues expire after 10 minutes, private match codes and unsettled matches expire after 30 minutes, and expired matches settle with no RP movement. A no-result/abandon flow requires both players to agree before a match is closed with no rating change.

Dispute evidence is now mandatory for winner decisions. A disputed match freezes RP. Both actual match participants must upload at least one screenshot through PocketNexus before Team Ranked staff can award Team A or Team B the win. Screenshots are limited to PNG/JPEG/WebP and 5 MB each and are stored in a private Supabase Storage bucket with participant/staff access only. Winner controls remain locked until both players submit proof; staff can void a case with no RP change if proof is missing or insufficient. Final staff action continues to be written to the resolution audit history.

V8.60.2 also includes a controlled two-team beta QA checklist for validating matchmaking, same-tag blocking, normal +20/-20 settlement, dispute freeze, evidence uploads, staff resolution, expiration, and mutual no-result behavior in the hosted beta.

## V8.60.3 — Ranked Match Room + End-to-End Beta Completion
- Added a dedicated Ranked Match Room for active Team Ranked matches.
- Match Room presents teams, matched players, RP, private code, expiration, status timeline, reporting, no-result, and dispute routing in one player-facing workspace.
- Active-match recovery no longer depends solely on the queue row: signed-in players recover their latest active matched/reported/disputed match from Supabase after refresh or reconnect.
- Expanded staff beta QA to validate the complete two-account flow, reconnect recovery, protections, settlement, dispute screenshots, staff resolution, expiry/no-result, and downstream ladder/history/contributor updates.
- Preserves shared Team RP rules: 1500 start, +20/-20 verified result, no streak bonuses, reciprocal reports, same-team/tag lock, screenshot evidence for disputes.

## V8.60.4 — Final Team Ranked Polish + Beta Fixes
- Final Team Ranked release-candidate polish pass; no rating-model or database changes.
- Added confirmation before Win/Loss reports to reduce accidental submissions and avoid unnecessary disputes.
- Added private-code clipboard fallback for browsers that deny Clipboard API access.
- Added 15-second foreground queue/match refresh plus visibility-based lifecycle recovery.
- Upgraded staff QA checklist to a final V8.60 completion gate with explicit PASS state and reset control.
- Improved mobile ranked result controls and keyboard focus visibility.
- V8.60 completion remains contingent on a real hosted two-account test passing the full QA gate.
- Preserves 1500 start, fixed +20/-20, no streak bonus, reciprocal verification, same-team/tag lock, dispute RP freeze, two-sided screenshot evidence, and staff audit resolution.

## V8.61.0 — Brain Teasers & Competitive Training Foundation
- V8.60 Team Ranked release-candidate behavior remains preserved.
- Added a first-class Training page under Improve and mobile More.
- Added What's This Card?: one deterministic global UTC daily card, five guesses, progressive artwork reveal, canonical card-name autocomplete, 5-to-1 star scoring, full reveal, View Card, and spoiler-free sharing.
- Daily card identity is grounded in the canonical card dataset; no invented cards/effects.
- Added guest/local stats: current streak, best streak, cards solved, and average successful guess.
- Signed-in cloud/profile training stats are deferred to V8.61.x so V8.61.0 can be QA'd without a new database dependency.
- Next training modes: Best Move, Sequencing, Energy Management, KO Math, Retreat Decisions, Matchup Puzzle, Opening Hand, Find the Misplay, and Endgame Puzzle.

## V8.61.1 — Competitive Brain Teasers
- Preserves V8.61.0 What's This Card? and all V8.60 Team Ranked release-candidate behavior.
- Added playable Best Move, Find the Misplay, and KO Math training modes.
- Added curated scenarios, immediate answer feedback/explanations, completion tracking, and accuracy stats.
- Brain Teaser progress is stored locally in V8.61.1.
- Safety/accuracy rule: puzzle facts are explicit; the trainer does not invent card effects. Future effect-aware puzzles must ground every referenced effect in the canonical card database before play.
- Next training expansion: Sequencing, Energy Management, Retreat Decisions, Matchup Puzzles, Opening Hand, and Endgame Puzzle, plus signed-in cloud/profile training stats.


## V8.61.2 — Sequencing + Energy Management + Retreat Decisions
- Preserves V8.61.1 Brain Teasers, V8.61.0 What's This Card?, V8.60 Team Ranked, and V8.59 Pocket Sync infrastructure.
- Added playable Sequencing, Energy Management, and Retreat Decisions.
- Competitive Brain Teasers now contains 13 curated puzzles across 6 modes.
- Existing V8.61.1 local progress storage is intentionally retained for upgrade compatibility.
- Puzzle accuracy rule remains binding: explicitly state scenario facts and never invent a card effect.
- No Supabase migration required.
- Next V8.61.x targets: Matchup Puzzles, Opening Hand, Endgame training, and signed-in cloud/profile training stats.


## V8.61.3 — Matchup Puzzles + Opening Hand + Endgame Training
- Added Matchup Puzzles, Opening Hand, and Endgame Training.
- Competitive Brain Teasers now contain 19 curated puzzles across 9 modes.
- Preserved all V8.61.2 progress IDs/localStorage compatibility.
- Preserved the no-invented-card-effects rule: puzzle-specific facts are explicit.
- No Supabase migration required.


## V8.61.4 — Training Profiles + Cloud Stats + Achievements
- Unified Training Profile combines daily card and Brain Teaser progress.
- Guest progress remains local; signed-in completed results sync to Supabase and restore cross-device.
- Adds Training XP/level, aggregate accuracy/mode stats, and 8 achievements.
- New RLS-protected cloud tables and owner-scoped profile/achievement RPCs.
- Preserves What’s This Card?, all 9 Brain Teaser modes, V8.60 Team Ranked, V8.59 Pocket Sync, and canonical cards.json usage.

## V8.61.5 — Daily Challenges + Training Streaks + Profile Showcase
- Adds four deterministic daily training challenges tied to the global daily card and Brain Teaser activity.
- Adds current/best Training Streak and active-training-day tracking without resetting V8.61.x progress.
- Adds a three-slot achievement Profile Showcase; guests remain local and signed-in users can sync selections through `training_profile_showcase` after the included migration is applied.
- Preserves all 19 curated Brain Teasers, What’s This Card?, V8.61.4 achievements/cloud result continuity, V8.60 Team Ranked, V8.59 Pocket Sync, and canonical `cards.json` usage.
- No card effect may be invented for training content.

## V8.62.0 — Mobile UI Overhaul
- Reworked mobile primary navigation into a five-item bottom bar: Home, Play, Decks, Meta, More.
- Added viewport-fit and iOS safe-area handling.
- Standardized mobile touch targets, form sizing, app spacing, bottom sheets and modal/search presentation.
- Hardened Deck Builder, Collection, Training, Team Ranked, Pocket Sync and horizontally scrollable data views for phone widths.
- Desktop navigation and existing V8.61.5 behavior remain preserved.
- No Supabase migration required.

## V8.62.1 — PWA Foundation
- PocketNexus is installable as a Progressive Web App when served over HTTPS.
- Added manifest, 192/512 app icons, Apple touch icon, standalone presentation, shortcuts, and theme metadata.
- Added a versioned service worker for local app-shell caching, same-origin runtime caching, offline navigation fallback, cache cleanup, and update activation.
- Added browser install handling, iOS Add to Home Screen guidance, connectivity notices, and update detection.
- file:// remains supported as a normal browser test, but PWA/service-worker behavior requires HTTPS or localhost.
- Full offline card database/artwork caching is intentionally deferred to V8.62.2.
- No Supabase migration required.


## V8.62.2 — Offline + Performance
- Cache canonical card JSON and metadata after first successful HTTPS load using the PWA service worker.
- Keep `cards.json` canonical; metadata remains enrichment-only.
- Bound runtime artwork caching to avoid uncontrolled storage growth.
- Preserve localStorage card fallback, lazy artwork loading, and all V8.62.1 PWA behavior.
- Offline card support is warm-cache support, not a bundled first-install database.

## V8.62.3 — Mobile App Readiness
- Added safe page deep links and corrected PWA shortcut routing.
- Hosted auth/recovery redirects can preserve the active PocketNexus page.
- Added foreground/resume lifecycle handling for installed mobile use.
- Added mobile software-keyboard viewport handling and iOS-safe input sizing.
- Added reusable Web Share API support with clipboard fallback.
- Added standalone/native-wrapper presentation hooks while preserving the static web architecture.
- No Supabase migration required.


## V8.62.4 — Mobile QA + Release Candidate
- Final code-level hardening pass for V8.62 mobile/PWA work.
- PWA/service-worker version bumped to V8.62.4 for clean installed-client updates.
- Adds `PPCMobile.readinessReport()` hosted-device diagnostics.
- Adds mobile overflow containment, 44px touch targets, focus visibility, responsive media and scroll-table safeguards.
- No Supabase migration.
- Release-candidate status is code-level only until real hosted iPhone + Android QA passes.

## V8.63.0 — Public Launch Hardening
- Dedicated Privacy, Terms, and Support launch pages are part of the static app shell.
- About & Privacy exposes release-candidate readiness status and links to those pages.
- Runtime JavaScript errors may be retained locally in a capped 20-entry diagnostic buffer; there is no automatic error upload.
- Diagnostic reports remain user-created and reviewable before sharing.
- PWA cache/version boundary is V8.63.0.
- Public launch still requires hosted device QA, final domain/auth configuration, a permanent support destination, and appropriate legal/security review.


## V8.64.1 — Closed Beta Validation & Bug Fixes
- Closed-beta QA checklist stored locally per device.
- Beta session IDs and richer privacy-safe downloadable diagnostic reports.
- Diagnostic payload includes PWA readiness, device/viewport, storage estimate, runtime errors, QA state, and existing app checks; no automatic upload.
- V8.64 PWA cache boundary.
- No Supabase migration.
- Device PASS is not global production certification; hosted multi-device/two-account QA remains required.


## V8.64.1 — Beta Security + PocketNexus Brand Migration
- PocketNexus is now the user-facing product name across the web app, PWA metadata, legal/support/offline surfaces, overlay, and current product documentation.
- The project remains an independent third-party Pokémon TCG Pocket companion and is not an official Pokémon, Nintendo, Limitless, or tournament-platform application.
- Runtime beta diagnostics sanitize sensitive OAuth/auth material before local storage and export, including JWT-like values, access/refresh/id tokens, authorization codes, client-secret-like values, URL credentials, and URL fragments.
- Diagnostic storage keys and PWA/service-worker caches are versioned for V8.64.1 so V8.64.0 unsanitized runtime-error logs do not flow into new beta reports.
- Closed-beta target domain is `https://beta.pocketnexus.app`; hosted OAuth/device validation remains a release QA requirement.

### V8.64.1 Hotfix 1 — Tournament Catalog Reliability
PocketNexus tournament intelligence must preserve the last known usable catalog across temporary network/RPC failures. The catalog is cached locally, ancillary sync-metadata failures may not invalidate a successful catalog response, filters must continue to work against cached data, and the UI must distinguish live, cached, refreshing, and true fallback states with a last-synced timestamp.


### V8.64.1 Hotfix 2 — Combined Competitive Meta
- Meta Center competitive intelligence is no longer constrained to the single event selector.
- The UI reads a combined sanitized aggregate through `get_combined_competitive_meta(days, limit)` and `get_combined_matchup_matrix(days, top)`.
- Supported windows: 7, 14, 30, 60, 90 days; default 30.
- Views: ranked list and matchup matrix.
- Combined UI does not expose upstream provider/source labels; legal/About positioning remains independent third-party/community data.
- Pairing legacy event context is retained internally for backwards compatibility until its RPC is migrated to the combined aggregate.


### V8.64.1 Hotfix 3
Tournament Intelligence no longer auto-retries empty standings indefinitely, uses a resilient RPC fallback path, and has a render recovery boundary. What's New uses an onboarding-style update window. Training has a refreshed daily-card hero and Competitive Training Lab presentation while preserving curated puzzle logic and the no-invented-card-effects rule.


V8.64.1 Hotfix 4 — Competitive Training Compact Layout
- Competitive Training now shows one scenario at a time instead of rendering all 19 vertically.
- Previous/Next controls and a complete scenario selector preserve access to every scenario and mode.
- Hero, mode chips, choices, explanation, progress, and reset remain available in a much shorter page footprint.

### V8.64.1 Hotfix 5 — Public Grind Session Posts
Completed Battle Tracker sessions can be deliberately published to a PocketNexus public profile. A public grind card includes the session title/type, most-used deck and archetype, date, duration, W-L(-T), win rate, match count, and RP change when tracked. Publishing is opt-in and removable. Private match notes, opponent identities, and individual match logs are not published.


## V8.64.1 Release Candidate
- PocketNexus is the user-facing product identity.
- Tournament Intelligence must fail soft: cached catalog/standings, bounded requests, empty-state recovery, and no page-level crash from one event.
- Combined Competitive Meta supports List and Matrix views across selectable time windows. Matchups with fewer than 10 games are labeled low sample.
- Public profiles support opt-in Recent Grinds session posts with deck, duration, record, win rate, games, date, and RP change when tracked.
- OAuth returns on beta.pocketnexus.app use the root beta URL and sensitive auth-return parameters are removed from the visible URL after session hydration.
- What's New is presented as an onboarding-style modal; Training remains compact while preserving all scenarios.
