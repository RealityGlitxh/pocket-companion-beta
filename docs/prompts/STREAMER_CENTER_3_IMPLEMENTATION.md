# POCKETNEXUS — STREAMER CENTER 3.0

## Claude implementation directive

Implement Streamer Center 3.0 as a true streaming command center. Do not stop at a visual mockup. Audit and reuse the existing PocketNexus architecture, including Supabase, authentication, decks, matches, rank/RP, profiles, sessions, overlays, localStorage fallbacks, and realtime behavior.

### Core objective

A streamer should be able to open one PocketNexus page before going live and not need another PocketNexus tab for the entire stream.

### Regression rules

- Inspect the existing Streamer Center, streamer components, routes, overlay implementation, session tracking, match logging, deck selection, rank/RP, profiles, Supabase tables, realtime subscriptions, localStorage fallbacks, and responsive behavior before modifying them.
- Reuse working systems rather than rebuilding them.
- Preserve cross-device cloud synchronization, authentication, and RLS.
- Do not introduce duplicate match/session records.
- Do not expose secrets or service-role credentials client-side.
- Do not break unrelated PocketNexus systems.

### Implementation phases

1. Redesign Streamer Center into a premium command-center dashboard emphasizing Live Session, Current Deck, Quick Controls, Stream Scenes, Overlay Preview, and Recent Matches.
2. Add unified persistent live-session state with start timestamp, selected deck, rank/RP, W/L, win rate, current/best streak, games played, and session RP delta.
3. Add large WIN / LOSS / UNDO controls. Reuse the existing match system and ensure undo only reverses the latest action associated with the active streamer session.
4. Support deck switching without losing prior per-deck session statistics. Reuse saved decks.
5. Synchronize active sessions across devices using the project's existing realtime architecture, preferably Supabase Realtime where already established. Avoid aggressive polling and duplicate writes.
6. Build a mobile/tablet Stream Control interface, following existing routing conventions (for example `/stream/control`), with WIN, LOSS, UNDO, SWITCH DECK, BRB, GAMEPLAY, STARTING SOON, RESULTS, and END SESSION controls.
7. Improve OBS/browser-source support with a live overlay preview, Copy OBS URL, Test Overlay, guided setup, and recommended 1920×1080 / 1080×1920 dimensions. Do not claim direct OBS connectivity unless a real OBS WebSocket integration exists.
8. Upgrade Overlay Designer with presets: Nexus Minimal, Competitive, Ranked Grind, Tournament, Card Art, Compact Corner, and Vertical. Support toggles for player, avatar, deck, artwork, record, win rate, rank, RP, session RP, streak, timer, and last opponent plus layout/scale/opacity/accent/animation controls.
9. Add stream scene states: Gameplay, Starting Soon, BRB, Results. Synchronize them to browser overlays.
10. Add optional automatic stream events for streaks, rank increases, RP milestones, game milestones, and personal bests. Respect reduced-motion settings.
11. Add a matchup tracker using existing PocketNexus archetype/meta data. Show session matchup records and meaningful most-played/best/hardest matchup insights while avoiding misleading tiny-sample conclusions.
12. Add end-session recap: duration, games, W/L, win rate, RP delta, best streak, most-played matchup, and best-performing deck.
13. Add a branded client-efficient Share Card suitable for Discord, X, and YouTube Community.
14. Add persisted session history.
15. Add streamer analytics for 7 days / 30 days / all time using actual stored data only.
16. Run complete QA and regression testing.

### Data-model rules

Inspect existing `sessions`, `matches`, `decks`, `profiles`, `preferences`, `rank_history`, and related tables before creating anything new. Only create version-controlled migrations where required. Avoid duplicate sources of truth.

### Reliability

Streamer Center may remain open for hours. Clean up subscriptions/timers, prevent memory leaks and runaway rerenders, lazy-load history/analytics where useful, optimize artwork, and keep overlay pages lightweight.

Handle no saved decks, no rank data, no history, realtime disconnects, temporary Supabase failures, missing artwork, failed match/session writes, and expired authentication without crashing the entire center. Show user-friendly Live Sync / Reconnecting / Offline status and retry writes safely without creating duplicates.

### Required QA flow

Test: Start Session → Select Deck → Win → Loss → Win → Undo → Switch Deck → Win → BRB → Gameplay → Test Overlay → End Session → Save → View Recap.

Confirm match totals, win rate, streaks, undo, deck-specific records, RP, timer, overlay updates, refresh persistence, mobile-to-desktop synchronization, duplicate prevention, cross-device persistence, and historical-session integrity.

Regression-test authentication, account/cloud sync, saved decks, Deck Builder, Battle Log, Rank/RP, Profiles, Collection, Meta Center, existing overlays, navigation, and mobile navigation.

### Definition of done

Do not call this complete until the underlying state, persistence, synchronization, error handling, and primary workflow work—not merely the UI. Required build/lint/tests and relevant GitHub Actions must pass.

### Delivery

Keep changes logically grouped. Do not push broken intermediate states to production. At completion report files changed, migrations, reused systems, new routes/components, completed features, tests/build results, known limitations, blockers, and recommended next step.

Final system relationship:

**DECKS → MATCHES → RANK → RP → SESSIONS → OBS OVERLAYS → MOBILE CONTROLS → ANALYTICS**
