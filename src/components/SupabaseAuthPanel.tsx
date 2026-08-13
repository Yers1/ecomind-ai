import { EnvelopeSimple, LockKey, SignOut } from '@phosphor-icons/react'
import { useState } from 'react'
import { useSupabase } from '../state/SupabaseContext'

export function SupabaseAuthPanel({ compact = false }: { compact?: boolean }) {
  const { configured, user, signIn, createAccount, signOut } = useSupabase()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!configured) return <section className="backend-setup" role="status"><LockKey size={22} /><div><strong>Community sync is not configured yet</strong><p>Guest analysis and local progress still work. Add the public Supabase URL and anon key to enable accounts.</p></div></section>
  if (user) return <div className="signed-in-state"><span><LockKey size={17} /> Signed in privately as <b>{user.email}</b></span><button className="button button--text" onClick={() => void signOut()}><SignOut size={17} /> Sign out</button></div>

  const submit = async (mode: 'sign-in' | 'create') => {
    setBusy(true); setError(null)
    try { if (mode === 'create') await createAccount(email, password); else await signIn(email, password) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Authentication failed.') } finally { setBusy(false) }
  }

  return <form className={`otp-auth${compact ? ' otp-auth--compact' : ''}`} onSubmit={(event) => { event.preventDefault(); void submit('sign-in') }}>
    <div><EnvelopeSimple size={21} /><div><strong>Private account sync</strong><p>Email stays private and is never displayed on the leaderboard.</p></div></div>
    <label htmlFor={`auth-email-${compact}`}>Email address</label><input id={`auth-email-${compact}`} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} />
    <label htmlFor={`auth-password-${compact}`}>Password</label><input id={`auth-password-${compact}`} type="password" autoComplete="current-password" minLength={10} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
    {error && <p role="alert" className="form-error">{error}</p>}
    <button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Please wait…' : 'Sign in'}</button>
    <button className="button button--secondary" type="button" disabled={busy} onClick={() => void submit('create')}>Create private account</button>
  </form>
}
