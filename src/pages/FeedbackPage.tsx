import { CheckCircle, ClipboardText } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'

export function FeedbackPage() {
  const officialSurvey = import.meta.env.VITE_FEEDBACK_SURVEY_URL as string | undefined
  const [saved, setSaved] = useState(false)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const response = Object.fromEntries(new FormData(event.currentTarget))
    localStorage.setItem('ecomind-prototype-feedback-draft-v1', JSON.stringify({ ...response, savedAt: new Date().toISOString() }))
    void navigator.clipboard?.writeText(JSON.stringify(response, null, 2))
    setSaved(true)
  }
  return <div className="feedback-page page-surface"><header className="page-hero container compact-page-hero"><div><p className="kicker">Prototype feedback</p><h1>Tell us where EcoMind was clear—and where it failed.</h1><p>{officialSurvey ? 'Responses are collected through the team’s published Google Form. You can also keep a private local draft below.' : 'This fallback survey saves a draft locally and copies it to your clipboard. It does not transmit responses.'}</p>{officialSurvey && <a className="button button--primary" href={officialSurvey} target="_blank" rel="noreferrer">Open official feedback survey</a>}</div></header><form className="feedback-form container" onSubmit={submit}><label>Could you complete the product analysis?<select name="completed" required><option value="">Choose</option><option>Yes</option><option>Partly</option><option>No</option></select></label><label>Which interface did you test?<select name="interface" required><option>Mobile-friendly web app</option><option>Desktop Chrome extension</option><option>Both</option></select></label><label>What was clear?<textarea name="clear" rows={4} required /></label><label>What was confusing or broken?<textarea name="problem" rows={4} required /></label><label>Marketplace and product URL tested (optional)<input name="url" inputMode="url" /></label><button className="button button--secondary" type="submit"><ClipboardText size={18} /> Save and copy a private draft</button>{saved && <p className="feedback-success" role="status"><CheckCircle size={19} /> Draft saved locally and copied. Paste it into the official survey or Discord when ready.</p>}</form></div>
}
