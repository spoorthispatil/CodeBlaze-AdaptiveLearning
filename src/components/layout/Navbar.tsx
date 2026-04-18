import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Settings, BookOpen, GraduationCap, Zap, Map, BarChart3, MessageCircle, LayoutDashboard } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Domain } from '../../types';

// Domains that support coding / interactive practice labs
const CODING_DOMAINS: Domain[] = ['DSA', 'ML', 'WebDev', 'SystemDesign', 'CloudComputing', 'DataScience', 'CyberSecurity'];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const hasCodingLab = user?.domain ? CODING_DOMAINS.includes(user.domain as Domain) : false;

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/roadmap', label: 'Roadmap', icon: Map },
    { to: '/skill-gap', label: 'Skill Gap', icon: BarChart3 },
    { to: '/chat', label: 'AI Coach', icon: MessageCircle },
    { to: '/diagnostic', label: 'Take Quiz', icon: GraduationCap },
    ...(hasCodingLab ? [{ to: '/labs', label: 'Practice Lab', icon: BookOpen }] : []),
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 flex flex-col p-5 shrink-0 min-h-screen relative"
      style={{
        background: 'linear-gradient(180deg, #060A12 0%, #080C14 100%)',
        borderRight: '1px solid rgba(14,165,233,0.1)',
      }}>
      <div className="absolute top-0 left-0 w-full h-48 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 120% 60% at 50% 0%, rgba(14,165,233,0.12) 0%, transparent 70%)'
      }} />

      <Link to="/" className="flex items-center gap-3 mb-8 group relative z-10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center glow-primary"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}>
          <Zap size={17} className="text-white" />
        </div>
        <span className="font-display font-black text-xl tracking-tight gradient-text">CodeBlaze</span>
      </Link>

      {user?.domain && (
        <div className="mb-6 px-3 py-2.5 rounded-xl relative z-10"
          style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)' }}>
          <div className="text-[9px] uppercase font-bold mb-0.5" style={{ color: '#4B5563' }}>Active Path</div>
          <div className="text-xs font-bold" style={{ color: '#7DD3FC' }}>{user.domain}</div>
        </div>
      )}

      <nav className="flex-1 space-y-1 relative z-10">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));

          const specialColors: Record<string, { active: string; glow: string }> = {
            '/roadmap': { active: 'rgba(6,182,212,0.12)', glow: '#06B6D4' },
            '/skill-gap': { active: 'rgba(239,68,68,0.1)', glow: '#EF4444' },
            '/chat': { active: 'rgba(16,185,129,0.1)', glow: '#10B981' },
          };
          const special = specialColors[item.to];

          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                'flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all',
                isActive ? 'nav-active' : 'text-text-muted hover:text-text-main hover:bg-white/5'
              )}
              style={isActive && special ? {
                background: special.active,
                color: special.glow,
                borderLeft: `3px solid ${special.glow}`,
                paddingLeft: '10px',
                boxShadow: `0 0 12px ${special.glow}20`,
              } : {}}>
              <Icon size={16} />
              {item.label}
              {item.to === '/chat' && (
                <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399' }}>AI</span>
              )}
              {item.to === '/skill-gap' && (
                <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171' }}>NEW</span>
              )}
              {item.to === '/roadmap' && (
                <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(6,182,212,0.12)', color: '#67E8F9' }}>NEW</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 p-3 rounded-xl mb-4 relative z-10"
        style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <div className="flex items-center gap-2.5">
          <div className="relative w-2 h-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-emerald-400 relative z-10" />
            <div className="pulse-dot absolute inset-0 rounded-full bg-emerald-400" style={{ animation: 'pulse-ring 2s infinite' }} />
          </div>
          <div>
            <div className="text-[9px] uppercase font-bold" style={{ color: '#374151' }}>AI Engine</div>
            <div className="text-xs font-semibold gradient-text-green">Groq · Active</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 relative z-10"
        style={{ borderTop: '1px solid rgba(14,165,233,0.1)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', boxShadow: '0 0 12px rgba(14,165,233,0.4)' }}>
            {user?.displayName?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold truncate max-w-[90px] text-text-main">{user?.displayName || 'User'}</div>
            <div className="text-[10px] flex items-center gap-1" style={{ color: '#F59E0B' }}>
              {(user?.learningStreak || 0) > 0 && <span className="fire-icon">🔥</span>}
              {user?.learningStreak || 0} day streak
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="text-text-muted hover:text-red-400 transition-colors p-1" title="Logout">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
