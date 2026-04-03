import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RadixProvider } from './hooks/useRadix'
import { Header } from './components/Header'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { Dashboard } from './pages/Dashboard'
import { Proposals } from './pages/Proposals'
import { Bounties } from './pages/Bounties'
import { Explorer } from './pages/Explorer'
import { Mint } from './pages/Mint'
import { Ecosystem } from './pages/Ecosystem'
import { Status } from './pages/Status'
import './index.css'

export default function App() {
  return (
    <RadixProvider>
      <BrowserRouter basename="/guild">
        <Header />
        <Nav />
        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/proposals" element={<Proposals />} />
            <Route path="/bounties" element={<Bounties />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/mint" element={<Mint />} />
            <Route path="/ecosystem" element={<Ecosystem />} />
            <Route path="/status" element={<Status />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </RadixProvider>
  )
}
