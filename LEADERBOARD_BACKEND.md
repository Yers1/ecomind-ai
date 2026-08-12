# Leaderboard backend architecture

EcoMind uses Supabase Auth, Postgres and Row Level Security. The normal production leaderboard contains only real opted-in profiles returned by `get_public_leaderboard`; it never injects demo participants when the backend is empty or unavailable.

## Public data

The leaderboard RPC returns an opaque hash-derived public ID, nickname, koala level, badge, period EcoPoints, meaningful-action count, rank and a caller-specific current-user flag. The score-reaching timestamp is used internally only for deterministic tie handling. The RPC does not return that timestamp, auth UUIDs, email, product information, URLs, browsing data or raw action metadata.

## Private data

`eco_point_events`, `user_challenge_completions` and `user_preferences` are readable only by their owner. Clients receive no insert/update/delete grant for point events. Account deletion executes as the authenticated user through `delete_my_account` and cascades from `auth.users`.

## Trusted award boundary

`award_eco_points` reads `auth.uid()`, maps an approved action type to a fixed value, validates source/metadata/deduplication key, enforces per-user rate limits, a 200-point UTC daily maximum, weekly self-report limits and one challenge claim per UTC period. It returns a status and recalculated summary. The client never submits points, totals, rank or koala level.

Imported events are restricted to recognised actions and approved values on the client, then recalculated again on the server. The import accepts a valid timestamp within the last 180 days, is limited to 50 imported events per account, and excludes `legacy-demo-balance`.

## Authentication and synchronisation

Website and extension each use email OTP and persist only their own normal Supabase session. They never copy tokens through URLs or access another origin's storage. After authentication, both clients address the same Supabase user and RPCs. Offline actions remain queued with an account ID and explicit status until the backend confirms or rejects them.

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for deployment and independent-account verification.

## Verification status

The version-controlled migration applies cleanly to the local Supabase stack and `npm run test:supabase:local` passes with three independent authenticated sessions. The test covers shared ranking, private-event isolation, cross-profile update denial, direct-insert denial, duplicate and arbitrary-point rejection, UTC filters, a second session restoring the same totals, opt-out and cascading account deletion. Hosted-project and production web/extension verification remains intentionally blocked until the public project URL and anon key are configured.
