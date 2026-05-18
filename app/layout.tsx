import type { Metadata } from 'next'
import { Geist, Syne } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/layout/ThemeProvider'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const syne = Syne({ subsets: ['latin'], variable: '--font-syne', weight: ['400', '700', '800'] })

export const metadata: Metadata = {
  title: 'Carnival — Goal Tracker',
  description: 'In-house goal setting and tracking portal by Atomberg',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${syne.variable} h-full`} suppressHydrationWarning>
      <body className="h-full antialiased">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
