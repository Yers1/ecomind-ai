import { ArrowUp, CheckCircle, ClockCountdown, Info, Leaf, PencilSimple, Recycle, ShieldCheck, Sparkle, UserPlus, X } from '@phosphor-icons/react'
import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ECO_POINT_RULES, WEEKLY_CHALLENGES, buildLeaderboard, getPeriodEnd, pointsToNextRank, rankFor, validateNickname, type LeaderboardPeriod } from '../../shared/ecoPoints'
import type { Page } from '../components/AppShell'
import { KoalaMascot } from '../components/KoalaMascot'
import { useAccessibleDialog } from '../hooks/useAccessibleDialog'
import { useEcoMind } from '../state/EcoMindContext'

const periodLabels: Record<LeaderboardPeriod, string> = { week: 'This week', month: 'This month', all: 'All time' }
const pointsFor = (entry: ReturnType<typeof buildLeaderboard>[number], period: LeaderboardPeriod) => period === 'week' ? entry.weeklyEcoPoints : period === 'month' ? entry.monthlyEcoPoints : entry.allTimeEcoPoints
const actionsFor = (entry: ReturnType<typeof buildLeaderboard>[number], period: LeaderboardPeriod) => period === 'week' ? entry.weeklyActionCount : period === 'month' ? entry.monthlyActionCount : entry.allTimeActionCount

function timeRemaining() {
  const end = getPeriodEnd('week')!; const days = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000))
  return days === 1 ? '1 day until weekly reset' : `${days} days until weekly reset`
}

function LeaveDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  const dialogRef = useAccessibleDialog(open, onClose)
  if (!open) return null
  return createPortal(<div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section ref={dialogRef} className="modal leaderboard-leave" role="dialog" aria-modal="true" aria-labelledby="leave-title"><button data-dialog-initial className="icon-button modal__close" onClick={onClose} aria-label="Close leave leaderboard confirmation"><X size={21} /></button><ShieldCheck size={32} weight="duotone" /><h2 id="leave-title">Leave the leaderboard?</h2><p>Your local public demo profile will be removed. Your wishlist, private activity history and EcoPoints will stay on this device.</p><div><button className="button button--secondary" onClick={onClose}>Keep participating</button><button className="button button--danger" onClick={onConfirm}>Leave leaderboard</button></div></section></div>, document.body)
}

export function LeaderboardPage({ navigate }: { navigate: (page: Page) => void }) {
  const { leaderboardProfile, setLeaderboardProfile, pointEvents, points, weeklyPoints, weeklyActions, recordEcoAction } = useEcoMind()
  const [period, setPeriod] = useState<LeaderboardPeriod>('week')
  const [nickname, setNickname] = useState(leaderboardProfile.displayName)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const entries = useMemo(() => buildLeaderboard(leaderboardProfile, pointEvents, period, points), [leaderboardProfile, pointEvents, period, points])
  const current = entries.find((entry) => entry.isCurrentUser)
  const rank = rankFor(entries, period)
  const distance = pointsToNextRank(entries, period)
  const community = useMemo(() => ({ actions: entries.reduce((sum, entry) => sum + entry.weeklyActionCount, 0), repairs: 7, pauses: 5, challenges: 6 }), [entries])

  const saveProfile = () => {
    const validation = validateNickname(nickname); setError(validation); if (validation) return
    setLeaderboardProfile({ optedIn: true, displayName: nickname.trim(), joinedAt: leaderboardProfile.joinedAt ?? new Date().toISOString() }); setEditing(false)
  }
  const weekKey = new Date(getPeriodEnd('week')!.getTime() - 1).toISOString().slice(0, 10)
  const claimChallenge = (challenge: typeof WEEKLY_CHALLENGES[number]) => recordEcoAction({ key: `weekly-${weekKey}-${challenge.id}`, actionType: challenge.actionType, title: challenge.title, detail: challenge.description, points: challenge.reward, source: challenge.selfReported ? 'self-reported' : 'web', selfReported: challenge.selfReported })

  return <div className="leaderboard-page page-surface">
    <header className="page-hero container leaderboard-header"><div><p className="kicker">EcoMind Community</p><h1>Small actions, shared progress.</h1><p>Rankings use EcoPoints from mindful choices, repair, reuse and challenges—not how much someone buys.</p></div><div className="prototype-flag"><Info size={19} /><span>Prototype leaderboard<br /><small>Other participants use sample data.</small></span></div></header>
    <div className="container leaderboard-content">
      {!leaderboardProfile.optedIn ? <section className="leaderboard-join" aria-labelledby="join-title"><div className="join-copy"><UserPlus size={30} weight="duotone" /><h2 id="join-title">Join the EcoMind leaderboard</h2><p>Participation is optional. Only your nickname, koala level, EcoPoints and action count appear beside fictional demo participants.</p><ul><li>No email or real name</li><li>No shopping history or product titles</li><li>No purchase information, age, location or school</li><li>Leave whenever you choose</li></ul></div><form onSubmit={(event) => { event.preventDefault(); saveProfile() }}><label htmlFor="leaderboard-name">Choose a nickname</label><input ref={inputRef} id="leaderboard-name" value={nickname} onChange={(event) => setNickname(event.target.value)} aria-describedby="nickname-help nickname-error" aria-invalid={Boolean(error)} maxLength={20} /><small id="nickname-help">3–20 characters. Do not use contact information.</small>{error && <p id="nickname-error" role="alert">{error}</p>}<button className="button button--primary" type="submit">Join locally</button><p className="join-consent">Your profile remains in this browser. There is no multi-user server in this prototype.</p></form></section> : <>
        <section className="leaderboard-summary" aria-label="Your current leaderboard summary"><div className="summary-rank"><span>Current rank</span><strong>#{rank}</strong><small>{distance === 0 ? 'You lead this demo period' : `${distance} points to the next position`}</small></div><div><span>Weekly EcoPoints</span><strong>{weeklyPoints}</strong><small>{timeRemaining()}</small></div><div><span>Actions this week</span><strong>{weeklyActions}</strong><small>Scans and purchases earn 0</small></div><div><span>Koala level</span><KoalaMascot size={49} points={points} /><strong>{current?.koalaLevel}</strong><small>{current?.badge}</small></div><button className="profile-edit" onClick={() => { setEditing(true); requestAnimationFrame(() => inputRef.current?.focus()) }}><PencilSimple size={17} /> Edit nickname</button></section>
        {editing && <form className="inline-profile-form" onSubmit={(event) => { event.preventDefault(); saveProfile() }}><label htmlFor="leaderboard-name-edit">Nickname</label><input ref={inputRef} id="leaderboard-name-edit" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={20} aria-invalid={Boolean(error)} />{error && <p role="alert">{error}</p>}<button className="button button--primary" type="submit">Save</button><button className="button button--secondary" type="button" onClick={() => setEditing(false)}>Cancel</button></form>}
      </>}

      <section className="leaderboard-board" aria-labelledby="ranking-title"><div className="leaderboard-board__heading"><div><h2 id="ranking-title">Community ranking</h2><p><ClockCountdown size={16} /> {period === 'week' ? timeRemaining() : `${periodLabels[period]} totals`}</p></div><div className="period-tabs" role="tablist" aria-label="Leaderboard period">{(['week', 'month', 'all'] as LeaderboardPeriod[]).map((item) => <button key={item} role="tab" aria-selected={period === item} onClick={() => setPeriod(item)}>{periodLabels[item]}</button>)}</div></div>
        <ol className="leaderboard-podium" aria-label="Top three demo leaderboard positions">{entries.slice(0, 3).map((entry, index) => <li key={entry.id} className={`podium-entry podium-entry--${index + 1}`}><span className="podium-position" aria-label={`Position ${index + 1}`}>{index + 1}</span><KoalaMascot size={index === 0 ? 74 : 62} points={entry.allTimeEcoPoints} /><div><h3>{entry.displayName}</h3><p>{entry.koalaLevel}</p><strong>{pointsFor(entry, period)} EcoPoints</strong><small>{actionsFor(entry, period)} meaningful actions · {entry.badge}</small>{entry.isDemoParticipant && <em>Sample participant</em>}</div></li>)}</ol>
        <div className="ranking-table" role="table" aria-label={`${periodLabels[period]} EcoMind leaderboard`}><div className="ranking-row ranking-row--header" role="row"><span role="columnheader">Rank</span><span role="columnheader">Participant</span><span role="columnheader">EcoPoints</span><span role="columnheader">Actions</span><span role="columnheader">Badge</span></div>{entries.map((entry, index) => <div className={`ranking-row${entry.isCurrentUser ? ' ranking-row--current' : ''}`} role="row" key={entry.id} aria-label={`${entry.displayName}, rank ${index + 1}${entry.isDemoParticipant ? ', sample participant' : ', your local profile'}`}><strong role="cell">#{index + 1}</strong><span role="cell"><KoalaMascot size={38} points={entry.allTimeEcoPoints} /><span><b>{entry.displayName}{entry.isCurrentUser ? ' · You' : ''}</b><small>{entry.koalaLevel}{entry.isDemoParticipant ? ' · Sample' : ''}</small></span></span><strong role="cell">{pointsFor(entry, period)}</strong><span role="cell">{actionsFor(entry, period)}</span><span role="cell">{entry.badge}</span></div>)}</div>
        {leaderboardProfile.optedIn && current && entries.indexOf(current) > 4 && <div className="current-user-pin"><ArrowUp size={18} /><span>Your row stays visible here: <strong>#{rank} · {current.displayName}</strong></span><b>{pointsFor(current, period)} points</b></div>}
      </section>

      <section className="weekly-challenges"><div className="section-heading"><h2>Weekly actions</h2><p>Challenges are limited to one claim per week. Self-reported actions are labelled.</p></div><div className="weekly-challenge-list">{WEEKLY_CHALLENGES.map((challenge) => { const key = `weekly-${weekKey}-${challenge.id}`; const claimed = pointEvents.some((event) => event.deduplicationKey === key); const progressComplete = challenge.selfReported || pointEvents.some((event) => event.actionType === challenge.progressActionType && event.timestamp >= new Date(Date.now() - 7 * 86_400_000).toISOString()); return <article key={challenge.id}><span className="challenge-status">{claimed ? <CheckCircle size={22} weight="fill" /> : challenge.id === 'repair-reuse' ? <Recycle size={22} /> : challenge.id === 'compare-products' ? <Leaf size={22} /> : <Sparkle size={22} />}</span><div><h3>{challenge.title}</h3><p>{challenge.description}</p><small>{challenge.selfReported ? 'Self-reported · ' : progressComplete ? 'Progress complete · ' : 'Compare products first · '}+{challenge.reward} EcoPoints</small></div><button disabled={claimed || !progressComplete} onClick={() => claimChallenge(challenge)}>{claimed ? 'Completed' : !progressComplete ? 'Not ready' : challenge.selfReported ? 'Self-report completion' : 'Claim challenge'}</button></article> })}</div></section>

      <section className="community-context"><div><h2>Community snapshot</h2><p>Demo context, not verified environmental savings.</p></div><dl><div><dt>Meaningful actions</dt><dd>{community.actions}</dd></div><div><dt>Repair or reuse</dt><dd>{community.repairs}</dd></div><div><dt>Mindful pauses</dt><dd>{community.pauses}</dd></div><div><dt>Challenges completed</dt><dd>{community.challenges}</dd></div></dl></section>

      <details className="ranking-explanation"><summary><Info size={18} /> How ranking works</summary><div><p>Rankings use EcoPoints from limited meaningful actions. Product scans earn no points and purchases never earn points automatically. Some prototype actions are self-reported and capped.</p><p>The leaderboard encourages participation—not consumption. Scores and ranks do not measure a person's overall environmental impact. Every action counts.</p><ul>{Object.entries(ECO_POINT_RULES).map(([key, value]) => <li key={key}><span>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span><strong>+{value}</strong></li>)}</ul></div></details>
      {leaderboardProfile.optedIn && <div className="leaderboard-exit"><button onClick={() => setLeaveOpen(true)}>Leave the leaderboard</button><button className="button button--secondary" onClick={() => navigate('dashboard')}>View dashboard</button></div>}
    </div>
    <LeaveDialog open={leaveOpen} onClose={() => setLeaveOpen(false)} onConfirm={() => { setLeaderboardProfile({ ...leaderboardProfile, optedIn: false, joinedAt: null }); setLeaveOpen(false) }} />
  </div>
}
