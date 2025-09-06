import type { Metadata } from 'next'
import { Nunito, Tajawal } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const nunito = Nunito({ 
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '700', '800', '900'],
  variable: '--font-nunito',
})

// const tajawal = Tajawal({ 
//   subsets: ['arabic'],
//   weight: ['200', '300', '400', '500', '700', '800', '900'],
//   variable: '--font-tajawal',
// })

export const metadata: Metadata = {
  title: 'Cashier Reconciliation Dashboard',
  description: 'A comprehensive dashboard for cashier reconciliation management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* <body className={`${nunito.variable} ${tajawal.variable} font-sans`}> */}
      <body className={`${nunito.variable} font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
