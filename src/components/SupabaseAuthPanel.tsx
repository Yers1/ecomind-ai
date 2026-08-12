import { EnvelopeSimple, LockKey, SignOut } from '@phosphor-icons/react'
import { useState } from 'react'
import { useSupabase } from '../state/SupabaseContext'

export function SupabaseAuthPanel({ compact = false }: { compact?: boolean }) {
  const { configured, user, requestOtp, verifyOtp, signOut } = useSupabase()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!configured) return <section className="backend-setup" role="status"><LockKey size={22} /><div><strong>Community sync is not configured yet</strong><p>Guest analysis and local progress still work. Add the public Supabase URL and anon key to enable accounts.</p></div></section>
  if (user) return <div className="signed-in-state"><span><LockKey size={17} /> Signed in privately as <b>{user.email}</b></span><button className="button button--text" onClick={() => void signOut()}><SignOut size={17} /> Sign out</button></div>

  const submit = async () => {
    setBusy(true); setError(null)
    try { if (!sent) { await requestOtp(email); setSent(true) } else { await verifyOtp(email, code) } } catch (caught) { setError(caught instanceof Error ? caught.message : 'Authentication failed.') } finally { setBusy(false) }
  }

  return <form className={`otp-auth${compact ? ' otp-auth--compact' : ''}`} onSubmit={(event) => { event.preventDefault(); void submit() }}>
    <div><EnvelopeSimple size={21} /><div><strong>{sent ? 'Enter your email code' : 'Sign in to synchronise'}</strong><p>Email stays private and is never displayed on the leaderboard.</p></div></div>
    <label htmlFor={`auth-email-${compact}`}>Email address</label><input id={`auth-email-${compact}`} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={sent || busy} />
    {sent && <><label htmlFor={`auth-code-${compact}`}>Six-digit code</label><input id={`auth-code-${compact}`} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} /></>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Please wait…' : sent ? 'Verify and sign in' : 'Email me a code'}</button>
    {sent && <button className="button button--text" type="button" onClick={() => { setSent(false); setCode('') }}>Use another email</button>}
  </form>
}
