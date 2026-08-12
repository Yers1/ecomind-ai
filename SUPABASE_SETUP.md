# Supabase setup and verification

The repository contains the real backend integration, but it deliberately stays in **backend setup required** mode until a Supabase project is configured and the live verification flag is enabled. It never substitutes fictional users in production.

## 1. Create and configure the project

1. Create a Supabase project and keep its database password in a password manager.
2. In **Authentication → Providers → Email**, enable email sign-in and new-user signup.
3. In **Authentication → Email Templates → Magic Link**, replace the link with a visible six-digit OTP using `{{ .Token }}`. Both the website and extension call `signInWithOtp`, then `verifyOtp` with `type: "email"`.
4. In **Project Settings → API**, copy only:
   - Project URL;
   - public anonymous/anon key.
5. Never copy a service-role or secret key into this repository, Vercel, the website or the extension.

## 2. Apply the version-controlled migration

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

The migration is [202608130001_real_leaderboard.sql](supabase/migrations/202608130001_real_leaderboard.sql). It creates profiles, private point events, challenge definitions/completions, preferences, RLS policies and protected RPC functions.

## 3. Configure the web application

Create an untracked `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
VITE_SUPABASE_LIVE_VERIFIED=false
```

Add the same first two variables to Vercel Production, Preview and Development. Keep `VITE_SUPABASE_LIVE_VERIFIED=false` until the three-account checklist below passes.

```powershell
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_SUPABASE_LIVE_VERIFIED
```

## 4. Build the extension with the same public project

PowerShell reads `.env.local` only when you explicitly load the values into the process. The easiest safe option is to set them for the current terminal, without printing them:

```powershell
$env:VITE_SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY"
$env:VITE_SUPABASE_LIVE_VERIFIED = "false"
npm run build:extension
```

The build adds one exact Supabase origin to `host_permissions`. An unconfigured build adds no host permission. Website and extension authenticate separately by email OTP; they do not exchange tokens through URLs or access each other's storage.

## 5. Create three disposable verification accounts

Create three test users in the Supabase Authentication dashboard. Give each a unique email and temporary password, then put the credentials only in untracked `.env.test.local` or process environment variables:

```env
SUPABASE_TEST_ACCOUNT_A_EMAIL=
SUPABASE_TEST_ACCOUNT_A_PASSWORD=
SUPABASE_TEST_ACCOUNT_B_EMAIL=
SUPABASE_TEST_ACCOUNT_B_PASSWORD=
SUPABASE_TEST_ACCOUNT_C_EMAIL=
SUPABASE_TEST_ACCOUNT_C_PASSWORD=
```

Run:

```powershell
npm run test:supabase:live
```

The script creates three independent Supabase clients, opts A and B in, leaves C private, awards different actions through RPC, compares the shared ranking, verifies duplicate rejection, rejects client-supplied point metadata/direct inserts, checks cross-user read/update isolation, checks every period, tests opt-out and deletes account C. Use disposable accounts because the script creates test records.

Then manually sign in as account A in the website and extension using email OTP. Confirm both show the same total/rank. Sign in to a second browser profile and confirm the same backend state appears.

For a Docker-backed local policy test before linking a hosted project:

```powershell
npx supabase start
npx supabase db reset
npm run test:supabase:local
```

This local test creates three isolated sessions without printing local service credentials, then cleans up its remaining test users.

Only after all checks pass:

1. set `VITE_SUPABASE_LIVE_VERIFIED=true` locally and in Vercel;
2. rebuild the extension;
3. redeploy the website;
4. repeat the production web/extension check;
5. remove or delete disposable accounts using EcoMind's account deletion control.

## 6. Release checks

```powershell
npm install
npm run lint
npm run test
npm run build
npm run build:extension
npm run test:supabase:live
```

Do not describe the leaderboard as live or cross-device verified while `VITE_SUPABASE_LIVE_VERIFIED` is false.
