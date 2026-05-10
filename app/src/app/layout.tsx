import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SternOS — Cockpit',
  description: 'Life OS cognitive cockpit',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
