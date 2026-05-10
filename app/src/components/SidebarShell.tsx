'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const navLinks = [
  { href: '/',           label: 'Dashboard', icon: '⚡' },
  { href: '/objectives', label: 'OKRs',      icon: '🎯' },
  { href: '/briefing',   label: 'Briefing',  icon: '📋' },
  { href: '/graph',      label: 'Graphe',    icon: '🕸' },
  { href: '/gates',      label: 'Gates',     icon: '🔌' },
]

export default function SidebarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Ferme le menu mobile à chaque navigation
  useEffect(() => { setMobileOpen(false) }, [pathname])

  return (
    <div className={`shell ${collapsed ? 'shell--collapsed' : ''} ${mobileOpen ? 'shell--mobile-open' : ''}`}>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <nav className="sidebar" aria-label="Navigation principale">
        <div className="sidebar-header">
          {!collapsed && <span className="logo-text">⚡ SternOS</span>}
          <button
            className="toggle-btn"
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
            title={collapsed ? 'Ouvrir' : 'Réduire'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <ul className="nav-list">
          {navLinks.map(l => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`nav-link ${active ? 'nav-link--active' : ''}`}
                  title={collapsed ? l.label : undefined}
                >
                  <span className="nav-icon">{l.icon}</span>
                  {!collapsed && <span className="nav-label">{l.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Topbar mobile */}
      <div className="topbar">
        <button
          className="topbar-menu-btn"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Menu"
        >
          ☰
        </button>
        <span className="topbar-title">⚡ SternOS</span>
      </div>

      {/* Main content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
