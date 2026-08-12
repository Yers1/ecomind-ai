# Future leaderboard backend model

The current leaderboard is local-only. It combines the current browser's real demo action events with deterministic fictional participants. No participant data is transmitted.

A production multi-user leaderboard would require privacy review, authentication, rate limiting, abuse prevention, moderation and a deletion/export process. It should store only:

## Public leaderboard profile

```ts
type PublicLeaderboardProfile = {
  userId: string
  displayName: string
  koalaLevel: 'Starter Koala' | 'Eco Explorer' | 'Climate Champion'
  badge: string
  optedIn: boolean
}
```

## Private point event

```ts
type PrivatePointEvent = {
  id: string
  userId: string
  actionType: string
  points: number
  timestamp: string
  source: 'web' | 'extension' | 'self-reported'
  deduplicationKey: string
}
```

Do not store complete browsing history, complete product-page content, product titles in a public profile, cart/order history, payment information, age, location, school or real names. The server should calculate ranks from validated private events and expose only period totals and action counts.

The current `LeaderboardRepository` interface and `LocalDemoLeaderboardRepository` allow a future reviewed backend adapter to replace the local implementation without rebuilding the UI.
