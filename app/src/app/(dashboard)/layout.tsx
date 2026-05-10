import Link from 'next/link'

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/objectives', label: 'OKRs' },
  { href: '/briefing', label: 'Briefing' },
  { href: '/graph', label: 'Graphe' },
  { href: '/gates', label: 'Gates' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-shell">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-text">⚡ SternOS</span>
        </div>
        <ul className="nav-list">
          {navLinks.map(l => (
            <li key={l.href}>
              <Link href={l.href} className="nav-link">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  )
}
