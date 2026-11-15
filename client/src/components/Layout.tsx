import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, LayoutDashboard, LogOut, Menu, PiggyBank, Plus, Receipt, Settings, Target, User as UserIcon, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import TransactionModal from './TransactionModal'

const NAV = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/transactions', label: 'Transactions', icon: Receipt },
  { to: '/app/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/app/goals', label: 'Savings Goals', icon: Target },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/profile', label: 'Profile', icon: UserIcon },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-lime font-display text-lg font-extrabold text-ink dark:border-white">₹</span>
      <span className="font-anton text-xl uppercase tracking-wide">SpendWise</span>
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const loc = useLocation()

  const links = (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-lime text-ink shadow-[inset_0_0_0_2px_#242424]' : 'hover:bg-ink/5 dark:hover:bg-white/10'}`}>
          <Icon size={18} /> {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col justify-between border-r-2 border-ink/10 p-5 dark:border-white/10 lg:flex">
        <div className="space-y-8">
          <Logo />
          {links}
        </div>
        <div className="space-y-3">
          <p className="truncate text-xs text-ink/60 dark:text-white/60">{user?.email}</p>
          <button onClick={() => void logout()} className="btn-ghost w-full">
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      {/* mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b-2 border-ink/10 bg-cream/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#181818]/95 lg:hidden">
        <Logo />
        <button aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="rounded-full p-2 hover:bg-ink/10 dark:hover:bg-white/10">
          {open ? <X /> : <Menu />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 top-[61px] z-20 overflow-y-auto bg-cream p-4 dark:bg-[#181818] lg:hidden">
          {links}
          <button onClick={() => void logout()} className="btn-ghost mt-6 w-full">
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-8" key={loc.pathname}>
        <div className="mx-auto max-w-6xl">
          <Outlet context={{ openAdd: () => setAdding(true) }} />
        </div>
      </main>

      <button onClick={() => setAdding(true)} className="btn-primary fixed bottom-5 right-5 z-30 !px-5 !py-3 text-base" aria-label="Add transaction">
        <Plus size={18} /> <span className="hidden sm:inline">Add Transaction</span>
        <span className="sm:hidden">Add</span>
      </button>
      <TransactionModal open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
