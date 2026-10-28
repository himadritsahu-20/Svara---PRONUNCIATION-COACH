import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import PracticeStudio from './components/PracticeStudio';
import AuthModal from './components/AuthModal';
import History from './pages/History';
import Library from './pages/Library';
import { AuthProvider } from './context/AuthContext';

function Shell() {
  const [authOpen, setAuthOpen] = useState(false);
  const [seedText, setSeedText] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex paper">
      <Sidebar onLoginClick={() => setAuthOpen(true)} />

      <main className="flex-1 flex min-w-0">
        <Routes>
          <Route path="/" element={
            <PracticeStudio seedText={seedText} onConsumeSeed={() => setSeedText(null)} />
          } />
          <Route path="/practice" element={
            <PracticeStudio seedText={seedText} onConsumeSeed={() => setSeedText(null)} />
          } />
          <Route path="/history" element={<History onSignIn={() => setAuthOpen(true)} />} />
          <Route path="/library" element={<Library />} />
          <Route path="*" element={
            <PracticeStudio seedText={seedText} onConsumeSeed={() => setSeedText(null)} />
          } />
        </Routes>

        <RightSidebar onPick={(t) => setSeedText(t)} />
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  );
}
