import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/auth/Login';
import { Onboarding } from './components/onboarding/Onboarding';
import { Dashboard } from './components/dashboard/Dashboard';
import { Quiz } from './components/quiz/Quiz';
import { PracticeLab } from './components/labs/PracticeLab';
import { Settings } from './components/layout/Settings';
import { Navbar } from './components/layout/Navbar';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { Roadmap } from './components/roadmap/Roadmap';
import { SkillGapAnalyzer } from './components/skillgap/SkillGapAnalyzer';
import { AIChat } from './components/chat/AIChat';
import { cn } from './lib/utils';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'rgba(14,165,233,0.3)', borderTopColor: '#0EA5E9' }} />
          </div>
          <p className="text-text-muted text-sm font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>Loading CodeBlaze...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex min-h-screen bg-bg text-text-main font-sans')}>
      {user && <Navbar />}
      <main className={cn('flex-1 overflow-y-auto', user ? 'p-8' : 'flex items-center justify-center')}>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={user ? (user.onboarded ? <ErrorBoundary inline><Dashboard /></ErrorBoundary> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/onboarding" element={user ? <ErrorBoundary inline><Onboarding /></ErrorBoundary> : <Navigate to="/login" />} />
          <Route path="/quiz/:topicId" element={user ? <ErrorBoundary inline><Quiz /></ErrorBoundary> : <Navigate to="/login" />} />
          <Route path="/diagnostic" element={user ? <ErrorBoundary inline><Quiz diagnostic /></ErrorBoundary> : <Navigate to="/login" />} />
          <Route path="/labs" element={user ? <ErrorBoundary inline><PracticeLab /></ErrorBoundary> : <Navigate to="/login" />} />
          <Route path="/settings" element={user ? <ErrorBoundary inline><Settings /></ErrorBoundary> : <Navigate to="/login" />} />
          <Route path="/roadmap" element={user ? <ErrorBoundary inline><Roadmap /></ErrorBoundary> : <Navigate to="/login" />} />
          <Route path="/skill-gap" element={user ? <ErrorBoundary inline><SkillGapAnalyzer /></ErrorBoundary> : <Navigate to="/login" />} />
          <Route path="/chat" element={user ? <ErrorBoundary inline><AIChat /></ErrorBoundary> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
