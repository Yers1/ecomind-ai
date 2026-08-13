import { useEffect, useState } from 'react'
import { AppShell, type Page } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { MethodologyPage } from './pages/MethodologyPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { StoreDemoPage } from './pages/StoreDemoPage'
import { WishlistPage } from './pages/WishlistPage'
import { AnalyseProductPage } from './pages/AnalyseProductPage'
import { FeedbackPage } from './pages/FeedbackPage'

const validPages: Page[] = ['home', 'analyse', 'demo', 'dashboard', 'leaderboard', 'wishlist', 'methodology', 'privacy', 'feedback']

function pageFromHash(): Page {
  const hash = window.location.hash.replace('#/', '') as Page
  return validPages.includes(hash) ? hash : 'home'
}

export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash)
  useEffect(() => {
    const handler = () => setPage(pageFromHash())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const navigate = (next: Page) => {
    window.location.hash = `/${next}`
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AppShell page={page} navigate={navigate}>
      {page === 'home' && <LandingPage navigate={navigate} />}
      {page === 'analyse' && <AnalyseProductPage navigate={navigate} />}
      {page === 'demo' && <StoreDemoPage navigate={navigate} />}
      {page === 'dashboard' && <DashboardPage navigate={navigate} />}
      {page === 'leaderboard' && <LeaderboardPage navigate={navigate} />}
      {page === 'wishlist' && <WishlistPage navigate={navigate} />}
      {page === 'methodology' && <MethodologyPage navigate={navigate} />}
      {page === 'privacy' && <PrivacyPage navigate={navigate} />}
      {page === 'feedback' && <FeedbackPage />}
    </AppShell>
  )
}
