import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { FinanceProvider } from './store/FinanceContext'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { TransactionPage } from './pages/Transaction/Transaction'
import { AssetsPage } from './pages/Assets/Assets'
import { ReservePage } from './pages/Reserve/Reserve'
import { SettingsPage } from './pages/Settings/Settings'

export default function App() {
  return (
    <FinanceProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transaction" element={<TransactionPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/reserve" element={<ReservePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </FinanceProvider>
  )
}
