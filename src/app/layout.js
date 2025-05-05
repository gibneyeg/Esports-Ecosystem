import { AuthProvider } from '../components/providers/auth-provider'
import { Analytics } from "@vercel/analytics/react"
import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  )
}