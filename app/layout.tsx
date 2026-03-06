import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'IP Probe Vercel',
  description: 'Diagnostic POC for validating client IP propagation through Vercel proxies',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
