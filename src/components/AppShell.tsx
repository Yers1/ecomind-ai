import { List, SignOut, UserCircle, X } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { Brand } from './Brand'
import { useEcoMind } from '../state/EcoMindContext'

export type Page = 'home' | 'install' | 'analyse' | 'demo' | 'dashboard' | 'leaderboard' | 'wishlist' | 'methodology' | 'privacy' | 'insights' | 'feedback'

export function AppShell({ page, navigate, children }: { page: Page; navigate: (page: Page) => void; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { authenticated, logout, wishlist } = useEcoMind()
  const go = (next: Page) => {
    setMobileOpen(false)
    navigate(next)
  }
  if (page === 'demo') return <div className="app-shell app-shell--store"><main id="main-content">{children}</main></div>
  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand-button" onClick={() => go('home')} aria-label="Go to EcoMind AI home">
          <Brand compact />
        </button>
        <nav className={`site-nav ${mobileOpen ? 'site-nav--open' : ''}`} aria-label="Primary navigation">
          <button className={page === 'install' ? 'is-active' : ''} onClick={() => go('install')}>Install extension</button>
          <button className={page === 'analyse' ? 'is-active' : ''} onClick={() => go('analyse')}>Analyse a product</button>
          <button onClick={() => go('demo')}>Demo Mode</button>
          <button className={page === 'dashboard' ? 'is-active' : ''} onClick={() => go('dashboard')}>Dashboard</button>
          <button className={page === 'leaderboard' ? 'is-active' : ''} onClick={() => go('leaderboard')}>Leaderboard</button>
          <button className={page === 'wishlist' ? 'is-active' : ''} onClick={() => go('wishlist')}>Wishlist {wishlist.length > 0 && <span>{wishlist.length}</span>}</button>
          <button className={page === 'methodology' ? 'is-active' : ''} onClick={() => go('methodology')}>Methodology</button>
          <button className={page === 'privacy' ? 'is-active' : ''} onClick={() => go('privacy')}>Privacy</button>
        </nav>
        <div className="header-actions">
          {authenticated ? (
            <button className="header-user" onClick={logout} aria-label="Sign out of demo profile"><SignOut size={19} /> Demo user</button>
          ) : (
            <span className="header-user header-user--passive"><UserCircle size={20} /> Guest</span>
          )}
          <button className="menu-button" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-label="Toggle navigation">
            {mobileOpen ? <X size={23} /> : <List size={23} />}
          </button>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <Brand compact />
        <p>Team 17, Teens in AI AI4Good Incubator 2026. Local evidence prototype with a clearly labelled sample demo.</p>
        <div>
          <button onClick={() => go('methodology')}>Methodology</button>
          <button onClick={() => go('privacy')}>Privacy and ethics</button>
          <button onClick={() => go('insights')}>Retailer Insights Demo</button>
        </div>
      </footer>
    </div>
  )
}
