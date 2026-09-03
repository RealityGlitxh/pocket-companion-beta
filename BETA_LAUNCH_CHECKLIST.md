# PocketNexus — V8.58 Beta Launch Checklist

## Before inviting testers
- Host over HTTPS; do not use `file://` for OAuth testing.
- Confirm Google/Apple redirect URLs match the production domain.
- Run More → Advanced & troubleshooting → Environment Tests on the production host.
- Test account creation, sign-in, sign-out, password reset, and guest mode.
- Test a real two-team Team Ranked match: queue, match code, reciprocal reporting, RP update, leaderboard, history, and dispute path.
- Test Profiles search and privacy from a signed-out browser.
- Test Decks, Collection, Battle Tracker, Rank, Meta, Tournaments, Simulation, Pocket Coach, Streamer, Team Wars, and Team Ranked.
- Test at least one iPhone-sized viewport and one Android-sized viewport plus desktop.
- Download a backup and restore it into a clean browser profile.
- Confirm Pocket Coach server secret is configured only in Supabase if AI beta access is enabled.

## Public-facing checks
- Keep the independent third-party disclaimer visible.
- Review About, Privacy & Beta copy before launch and replace the in-app summary with formal legal documents if/when required for the public service.
- Publish a support/feedback contact destination before opening the beta broadly.
- Decide which features are beta-only and which are ready for general use.
- Keep a rollback copy of V8.57.0 and the production database migration history.

## Release rule
Do not call the app production-ready solely because automated diagnostics pass. Complete manual hosted-device and multi-account testing first.
