import { Outlet } from 'react-router-dom'
import { Navigation } from './Navigation'

export function Layout() {
  return (
    <div className="min-h-screen bg-dark-900">
      <Navigation />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  )
}
