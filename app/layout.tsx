import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NOVELS.DAY Admin',
  description: 'Painel administrativo da NOVELS.DAY',
  applicationName: 'Novels Day Admin',
  icons: {
    icon: '/novels-day-logo.webp',
    shortcut: '/novels-day-logo.webp',
    apple: '/novels-day-logo.webp',
  },
  robots: { index: false, follow: false }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}

