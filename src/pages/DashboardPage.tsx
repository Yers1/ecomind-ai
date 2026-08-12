import { ArrowRight, BookmarkSimple, CheckCircle, Leaf, Medal, Recycle, Sparkle, TrendUp } from '@phosphor-icons/react'
import { useState } from 'react'
import type { Page } from '../components/AppShell'
import { KoalaProgress } from '../components/KoalaProgress'
import { products } from '../data/products'
import { useEcoMind } from '../state/EcoMindContext'

const trend = [46, 52, 49, 61, 68, 74]
const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']

export function DashboardPage({ navigate }: { navigate: (page: Page) => void }) {
  const { points, wishlist, activities, completedActions, completeAction } = useEcoMind()
  const [notice, setNotice] = useState<string | null>(null)
  const greenerChoices = completedActions.filter((item) => item.startsWith('choose-')).length
  const completedChallenges = completedActions.filter((item) => item.startsWith('challenge-')).length

  const challenge = (key: string, title: string, detail: string, reward: number) => {
    const isDone = completedActions.includes(key)
    if (isDone) return
    completeAction(key, title, detail, reward)
    setNotice(`Completed. +${reward} demo EcoPoints.`)
  }

  return (
    <div className="dashboard-page page-surface">
      <header className="page-hero container dashboard-header">
        <div><p className="kicker">Your local demo progress</p><h1>Small choices, visible progress.</h1><p>Estimated impact based on available product information. Figures are directional, not verified savings.</p></div>
        <div className="points-total"><Sparkle size={24} weight="fill" /><strong>{points}</strong><span>demo EcoPoints</span></div>
      </header>
      <div className="container dashboard-layout">
        <KoalaProgress points={points} />
        <section className="dashboard-metrics" aria-label="Monthly progress summary">
          <article><span><TrendUp size={19} /> Average Green Score</span><strong>74</strong><small>Demo trend, up from 46 in March</small></article>
          <article><span><Leaf size={19} /> Greener options selected</span><strong>{greenerChoices}</strong><small>Meaningful choices in this local profile</small></article>
          <article><span><BookmarkSimple size={19} /> Wishlist</span><strong>{wishlist.length}</strong><small>{wishlist.length ? 'Products saved for later' : 'No products saved yet'}</small></article>
          <article><span><Medal size={19} /> Challenges</span><strong>{completedChallenges}</strong><small>Completed this demo session</small></article>
        </section>
        <section className="dashboard-panel trend-panel">
          <div className="dashboard-panel__heading"><div><h2>Monthly Green Score trend</h2><p>Average score of analysed demo products.</p></div><span>Sample data</span></div>
          <div className="trend-chart" role="img" aria-label="Green Score rises from 46 in March to 74 in August, with a small dip in May">
            {trend.map((value, index) => <div className="trend-column" key={months[index]}><span>{value}</span><div><i style={{ height: `${value}%` }} /></div><small>{months[index]}</small></div>)}
          </div>
        </section>
        <section className="dashboard-panel impact-panel">
          <div className="dashboard-panel__heading"><div><h2>Estimated impact</h2><p>Based on product differences in the sample dataset.</p></div><Recycle size={23} /></div>
          <div className="impact-summary">
            <strong>{greenerChoices > 0 ? 'A small estimated reduction' : 'No estimate yet'}</strong>
            <p>{greenerChoices > 0 ? 'Your selected alternative uses more recycled content and has a lower sample carbon estimate.' : 'Choose a lower-impact alternative in the product demo to see a directional summary.'}</p>
          </div>
          <div className="impact-caveat"><CheckCircle size={18} /><span>No exact real-world savings are claimed. Purchase, use, care and end-of-life behaviour all matter.</span></div>
        </section>
        <section className="dashboard-panel challenge-panel">
          <div className="dashboard-panel__heading"><div><h2>Actions that do not require buying</h2><p>Demo rewards recognise repair, reuse and mindful decisions.</p></div></div>
          <div className="challenge-list">
            <article>
              <div className="challenge-icon"><Recycle size={22} /></div><div><h3>Repair something you own</h3><p>Patch, mend or adjust an item to extend its life.</p></div>
              <button disabled={completedActions.includes('challenge-repair')} onClick={() => challenge('challenge-repair', 'Repair challenge completed', 'Extended the life of an existing item.', 25)}>{completedActions.includes('challenge-repair') ? 'Completed' : '+25 points'}</button>
            </article>
            <article>
              <div className="challenge-icon"><Leaf size={22} /></div><div><h3>Pause a new purchase</h3><p>Decide that a new item is not necessary today.</p></div>
              <button disabled={completedActions.includes('challenge-no-buy')} onClick={() => challenge('challenge-no-buy', 'Mindful pause completed', 'Decided a new purchase was not necessary.', 30)}>{completedActions.includes('challenge-no-buy') ? 'Completed' : '+30 points'}</button>
            </article>
          </div>
          {notice && <p className="challenge-notice" role="status">{notice}</p>}
        </section>
        <section className="dashboard-panel activity-panel">
          <div className="dashboard-panel__heading"><div><h2>Recent activity</h2><p>Stored locally on this device.</p></div></div>
          <div className="activity-list">
            {activities.map((activity) => <article key={activity.id}><span className="activity-check"><CheckCircle size={19} weight="fill" /></span><div><h3>{activity.title}</h3><p>{activity.detail}</p></div><span className="activity-points">+{activity.points}</span><small>{activity.date}</small></article>)}
          </div>
        </section>
        <section className="dashboard-next">
          <div><h2>Ready to check another item?</h2><p>{products.length} local clothing samples are available.</p></div>
          <button className="button button--primary" onClick={() => navigate('demo')}>Open product demo <ArrowRight size={18} /></button>
        </section>
      </div>
    </div>
  )
}
