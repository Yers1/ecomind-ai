import { ArrowRight, BookmarkSimple, CheckCircle, Eye, Leaf, Medal, Recycle, Sparkle, Trophy } from '@phosphor-icons/react'
import { useState } from 'react'
import { buildLeaderboard, pointsToNextRank, rankFor } from '../../shared/ecoPoints'
import type { Page } from '../components/AppShell'
import { KoalaProgress } from '../components/KoalaProgress'
import { products } from '../data/products'
import { useEcoMind } from '../state/EcoMindContext'

const trend = [46, 52, 49, 61, 68, 74]
const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']

export function DashboardPage({ navigate }: { navigate: (page: Page) => void }) {
  const { points, wishlist, activities, completedActions, completeAction, pointEvents, leaderboardProfile, weeklyPoints } = useEcoMind()
  const [notice, setNotice] = useState<string | null>(null)
  const analysesCompleted = completedActions.filter((item) => item.startsWith('analysis-')).length
  const productsCompared = completedActions.filter((item) => item.startsWith('compare-')).length
  const alternativesSaved = completedActions.filter((item) => item.startsWith('save-')).length
  const completedChallenges = completedActions.filter((item) => item.startsWith('challenge-')).length
  const leaderboard = buildLeaderboard(leaderboardProfile, pointEvents, 'week', points)
  const weeklyRank = rankFor(leaderboard, 'week')
  const nextRank = pointsToNextRank(leaderboard, 'week')

  const challenge = (key: string, title: string, detail: string, reward: number) => {
    const isDone = completedActions.includes(key)
    if (isDone) return
    completeAction(key, title, detail, reward)
    setNotice(`Completed. +${reward} demo EcoPoints.`)
  }

  return (
    <div className="dashboard-page page-surface">
      <header className="page-hero container dashboard-header">
        <div><p className="kicker">Current session · stored locally</p><h1>Small choices, visible progress.</h1><p>These totals reflect actions recorded in this demo profile. Environmental outcomes and savings are not verified.</p></div>
        <div className="points-total"><Sparkle size={24} weight="fill" /><strong>{points}</strong><span>demo EcoPoints</span></div>
      </header>
      <div className="container dashboard-layout">
        <KoalaProgress points={points} />
        <section className="dashboard-metrics" aria-label="Current session summary">
          <article><span><Eye size={19} /> Analyses completed</span><strong>{analysesCompleted}</strong><small>Unique demo products analysed</small></article>
          <article><span><Leaf size={19} /> Products compared</span><strong>{productsCompared}</strong><small>Greener alternatives reviewed</small></article>
          <article><span><BookmarkSimple size={19} /> Alternatives saved</span><strong>{alternativesSaved}</strong><small>{wishlist.length} total item{wishlist.length === 1 ? '' : 's'} in wishlist</small></article>
          <article><span><Medal size={19} /> Challenges</span><strong>{completedChallenges}</strong><small>Completed this demo session</small></article>
        </section>
        <section className="dashboard-panel trend-panel">
          <div className="dashboard-panel__heading"><div><h2>Example Green Score trend</h2><p>Illustrative sample data—not this user's history.</p></div><span>Sample trend</span></div>
          <div className="trend-chart" role="img" aria-label="Illustrative sample trend only: score rises from 46 in March to 74 in August, with a small dip in May">
            {trend.map((value, index) => <div className="trend-column" key={months[index]}><span>{value}</span><div><i style={{ height: `${value}%` }} /></div><small>{months[index]}</small></div>)}
          </div>
        </section>
        <section className="dashboard-panel impact-panel">
          <div className="dashboard-panel__heading"><div><h2>Estimated impact</h2><p>Based on product differences in the sample dataset.</p></div><Recycle size={23} /></div>
          <div className="impact-summary">
            <strong>{alternativesSaved > 0 ? 'Lower-impact option saved' : 'No current-session estimate'}</strong>
            <p>{alternativesSaved > 0 ? 'A saved demo alternative uses more recycled content and has a lower sample carbon estimate. This is not proof of a purchase or real-world savings.' : 'Compare and save a lower-impact alternative to see a directional, non-verified summary.'}</p>
          </div>
          <div className="impact-caveat"><CheckCircle size={18} /><span>No exact real-world savings are claimed. Purchase, use, care and end-of-life behaviour all matter.</span></div>
        </section>
        <section className="dashboard-panel leaderboard-preview">
          <div className="dashboard-panel__heading"><div><h2>Weekly community</h2><p>Meaningful actions—not purchases or product scores.</p></div><Trophy size={23} /></div>
          {leaderboardProfile.optedIn ? <div className="leaderboard-preview__current"><span>Current demo rank</span><strong>#{weeklyRank}</strong><b>{weeklyPoints} weekly EcoPoints</b><small>{nextRank ? `${nextRank} points to the next position` : 'You lead this demo period'}</small></div> : <div className="leaderboard-preview__current"><span>Optional local participation</span><strong>—</strong><b>Join with a nickname</b><small>No personal or shopping information is shown.</small></div>}
          <ol aria-label="Top three leaderboard preview">{leaderboard.slice(0, 3).map((entry, index) => <li key={entry.id}><span>#{index + 1}</span><b>{entry.displayName}</b><strong>{entry.weeklyEcoPoints}</strong></li>)}</ol>
          <button className="button button--secondary" onClick={() => navigate('leaderboard')}>View leaderboard <ArrowRight size={17} /></button>
        </section>
        <section className="dashboard-panel challenge-panel">
          <div className="dashboard-panel__heading"><div><h2>Actions that do not require buying</h2><p>Demo rewards recognise repair, reuse and mindful decisions.</p></div></div>
          <div className="challenge-list">
            <article>
              <div className="challenge-icon"><Recycle size={22} /></div><div><h3>Repair something you own</h3><p>Patch, mend or adjust an item to extend its life.</p></div>
              <button disabled={completedActions.includes('challenge-repair')} onClick={() => challenge('challenge-repair', 'Repair/reuse action self-reported', 'User reported extending the life of an existing item.', 20)}>{completedActions.includes('challenge-repair') ? 'Recorded' : 'Self-report · +20'}</button>
            </article>
            <article>
              <div className="challenge-icon"><Leaf size={22} /></div><div><h3>Pause a new purchase</h3><p>Decide that a new item is not necessary today.</p></div>
              <button disabled={completedActions.includes('challenge-no-buy')} onClick={() => challenge('challenge-no-buy', 'Mindful no-buy decision self-reported', 'User reported that a new item was not needed.', 25)}>{completedActions.includes('challenge-no-buy') ? 'Recorded' : 'Self-report · +25'}</button>
            </article>
          </div>
          {notice && <p className="challenge-notice" role="status">{notice}</p>}
        </section>
        <section className="dashboard-panel activity-panel">
          <div className="dashboard-panel__heading"><div><h2>Recent activity</h2><p>Stored locally on this device.</p></div></div>
          {activities.length ? <div className="activity-list">
            {activities.map((activity) => <article key={activity.id}><span className="activity-check"><CheckCircle size={19} weight="fill" /></span><div><h3>{activity.title}</h3><p>{activity.detail}</p></div><span className="activity-points">{activity.points > 0 ? `+${activity.points}` : 'Logged'}</span><small>{activity.date}</small></article>)}
          </div> : <div className="activity-empty"><Sparkle size={23} /><p>Analyse a Threadly product to begin this local session.</p></div>}
        </section>
        <section className="dashboard-next">
          <div><h2>Ready to check another item?</h2><p>{products.length} local clothing samples are available.</p></div>
          <button className="button button--primary" onClick={() => navigate('demo')}>Open product demo <ArrowRight size={18} /></button>
        </section>
      </div>
    </div>
  )
}
