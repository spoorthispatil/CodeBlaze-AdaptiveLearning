import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, AlertTriangle, Eye, EyeOff, Zap, Sparkles } from 'lucide-react';
import { login, register, setToken } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export function Login() {
  const { setUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!email || !password) { setError('Email and password are required'); return; }
    if (mode === 'register' && !displayName) { setError('Display name is required'); return; }
    setLoading(true);
    try {
      const result = mode === 'login'
        ? await login(email, password)
        : await register(email, password, displayName);
      setToken(result.token);
      setUser(result.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #0EA5E9, transparent)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #10B981, transparent)', filter: 'blur(60px)' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 glow-primary"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}>
            <Zap className="text-white w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl font-display font-black tracking-tight gradient-text">CodeBlaze</h1>
          <p className="mt-2 text-sm" style={{ color: '#4B5563' }}>AI-powered adaptive learning</p>
        </div>

        {/* Card */}
        <div className="card-bento p-8">
          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-7" style={{ background: 'rgba(6,10,18,0.6)' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); }}
                className="flex-1 py-2 text-sm font-bold rounded-lg transition-all font-display"
                style={mode === m ? {
                  background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(14,165,233,0.3)'
                } : { color: '#4B5563' }}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: '#4B5563' }}>Display Name</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name" className="input-dark w-full px-4 py-3 text-sm" />
              </motion.div>
            )}

            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: '#4B5563' }}>Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#4B5563' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="you@example.com" className="input-dark w-full pl-10 pr-4 py-3 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: '#4B5563' }}>Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#4B5563' }} />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="••••••••" className="input-dark w-full pl-10 pr-11 py-3 text-sm" />
                <button onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: showPw ? '#38BDF8' : '#4B5563' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 p-3 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
                <AlertTriangle size={14} className="shrink-0" />
                {error}
              </motion.div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              className="btn-primary w-full py-3.5 text-sm mt-2 flex items-center justify-center gap-2">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <><Sparkles size={14} /> {mode === 'login' ? 'Sign In' : 'Create Account'}</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
