import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'College ERP',
  description: 'Cloud-based ERP system for college academic and administrative management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
