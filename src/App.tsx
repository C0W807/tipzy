import { useEffect } from 'react'
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router'
import { House, Landmark, QrCode, Settings as SettingsIcon } from 'lucide-react'
import { DemoBadge, Splash } from './components/brand'
import { ToastProvider } from './components/toast'
import { cx } from './components/ui'
import { ProfileProvider, useProfile } from './hooks/profile'
import Home from './pages/Home'
import Nfc from './pages/Nfc'
import NotFound from './pages/NotFound'
import Onboarding from './pages/Onboarding'
import Payouts from './pages/Payouts'
import PrintCard from './pages/PrintCard'
import { BankSettings, EditProfile, Settings } from './pages/Settings'
import Share from './pages/Share'
import ShowQr from './pages/ShowQr'
import TipPage from './pages/TipPage'
import Welcome from './pages/Welcome'

// "/" locally and on Vercel/Netlify; "/tipzy" on GitHub Pages.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

function ScrollToTop() {
  const { pathname } = useLocation()
  // Braces matter: newer browsers' scrollTo returns a Promise, which React would take for a cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function RequireProfile() {
  const { profile, loading } = useProfile()
  if (loading) return <Splash />
  if (!profile) return <Navigate to="/" replace />
  return <Outlet />
}

const TABS = [
  { to: '/home', label: 'Home', Icon: House },
  { to: '/share', label: 'My QR', Icon: QrCode },
  { to: '/payouts', label: 'Payouts', Icon: Landmark },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
]

function TabLayout() {
  return (
    <>
      <DemoBadge />
      <main className="pb-[calc(84px+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[440px] -translate-x-1/2 border-t border-line bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="grid h-16 grid-cols-4">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cx('flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold', isActive ? 'text-ink' : 'text-mute')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cx('grid h-7 w-12 place-items-center rounded-full transition-colors', isActive && 'bg-lime')}>
                    <Icon className="size-5" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <ScrollToTop />
      <ProfileProvider>
        <ToastProvider>
          <div className="relative mx-auto min-h-dvh max-w-[440px] bg-paper shadow-[0_0_80px_-30px_rgb(12_13_16/0.35)]">
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/t/:handle" element={<TipPage />} />
              <Route element={<RequireProfile />}>
                <Route path="/share/qr" element={<ShowQr />} />
                <Route element={<TabLayout />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/share" element={<Share />} />
                  <Route path="/share/card" element={<PrintCard />} />
                  <Route path="/share/nfc" element={<Nfc />} />
                  <Route path="/payouts" element={<Payouts />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/profile" element={<EditProfile />} />
                  <Route path="/settings/bank" element={<BankSettings />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </ToastProvider>
      </ProfileProvider>
    </BrowserRouter>
  )
}
