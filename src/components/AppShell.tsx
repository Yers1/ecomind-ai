import { List, SignOut, UserCircle, X } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { Brand } from './Brand'
import { useEcoMind } from '../state/EcoMindContext'

export type Page = 'home' | 'demo' | 'dashboard' | 'wishlist' | 'methodology' | 'privacy'

export function AppShell({ page, navigate, children }: { page: Page; navigate: (page: Page) => void; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { authenticated, logout, wishlist } = useEcoMind()
  const go = (next: Page) => {
    setMobileOpen(false)
    navigate(next)
  }
  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand-button" onClick={() => go('home')} aria-label="Go to EcoMind AI home">
          <Brand compact />
        </button>
        <nav className={`site-nav ${mobileOpen ? 'site-nav--open' : ''}`} aria-label="Primary navigation">
          <button className={page === 'demo' ? 'is-active' : ''} onClick={() => go('demo')}>Product demo</button>
          <button className={page === 'dashboard' ? 'is-active' : ''} onClick={() => go('dashboard')}>Dashboard</button>
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
        <p>Team 17, Teens in AI AI4Good Incubator 2026. Hackathon prototype using sample data.</p>
        <div>
          <button onClick={() => go('methodology')}>Methodology</button>
          <button onClick={() => go('privacy')}>Privacy and ethics</button>
        </div>
      </footer>
    </div>
  )
}
