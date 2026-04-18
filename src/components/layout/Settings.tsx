import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Bell, Shield, Save, CheckCircle2, BarChart2, Clock, Trophy, RefreshCw } from 'lucide-react';
import { updateProfile, getQuizHistory } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { cn, formatDate } from '../../lib/utils';

type Tab = 'profile' | 'history' | 'notifications';

export function Settings() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'history' && history.length === 0) {
      setHistoryLoading(true);
      getQuizHistory()
        .then(data => setHistory(data.attempts))
        .catch(err => setError(err.message))
        .finally(() => setHistoryLoading(false));
    }
  }, [activeTab]);

  const handleSave = async () => {
    if (!displayName.trim()) { setError('Name cannot be empty'); return; }
    setLoading(true);
    setError(null);
    try {
      await updateProfile({ displayName });
      if (user) setUser({ ...user, displayName });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'history', label: 'Quiz History', icon: BarChart2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-black text-text-main tracking-tight">Settings</h1>
        <p className="text-text-muted mt-1 text-sm">Manage your account and learning preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar tabs */}
        <div className="space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:bg-card hover:text-text-main'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="card-bento p-8">
                  <h2 className="text-lg font-bold mb-6">Personal Information</h2>

                  {error && (
                    <div className="mb-5 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{error}</div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2">Display Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2">Email Address</label>
                      <div className="flex items-center gap-3 bg-slate-100 border border-border rounded-xl px-4 py-3 text-text-muted text-sm font-medium">
                        <Mail size={15} />
                        {user?.email}
                      </div>
                      <p className="text-[10px] text-text-muted mt-1 italic">Email cannot be changed.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2">Current Domain</label>
                      <div className="flex items-center gap-3 bg-slate-100 border border-border rounded-xl px-4 py-3 text-text-muted text-sm font-medium">
                        <Shield size={15} />
                        {user?.domain || 'Not set'}
                      </div>
                    </div>

                    {/* Stats summary */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      {[
                        { label: 'Streak', value: `${user?.learningStreak || 0}d` },
                        { label: 'Domain', value: user?.domain || '—' },
                        { label: 'Status', value: user?.onboarded ? 'Active' : 'Setup' },
                      ].map(s => (
                        <div key={s.label} className="bg-bg rounded-xl p-3 text-center">
                          <div className="text-sm font-black text-text-main">{s.value}</div>
                          <div className="text-[10px] text-text-muted uppercase font-bold mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                    <AnimatePresence>
                      {saved && (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-emerald-600 text-sm font-bold">
                          <CheckCircle2 size={16} />
                          Saved successfully!
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="ml-auto bg-primary text-white font-bold py-2.5 px-7 rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-60 text-sm"
                    >
                      {loading ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="card-bento p-6">
                  <h2 className="text-lg font-bold mb-5">Quiz History</h2>
                  {historyLoading ? (
                    <div className="flex justify-center py-10">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-12">
                      <Trophy size={36} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-text-muted text-sm">No quizzes taken yet. Start practicing!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {history.map(attempt => (
                        <div key={attempt.id} className="flex items-center justify-between p-4 bg-bg rounded-xl border border-border">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm',
                              attempt.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                              attempt.score >= 60 ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            )}>
                              {attempt.score}%
                            </div>
                            <div>
                              <div className="text-sm font-bold text-text-main">
                                {attempt.is_diagnostic ? '🎯 Diagnostic' : attempt.topic_title || 'Quiz'}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[10px] text-text-muted flex items-center gap-1">
                                  <Clock size={10} /> {formatDate(attempt.created_at)}
                                </span>
                                <span className="text-[10px] text-text-muted">
                                  {attempt.total_questions}Q
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className={cn(
                            'text-xs font-bold px-3 py-1 rounded-full',
                            attempt.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            attempt.score >= 60 ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          )}>
                            {attempt.score >= 80 ? 'Excellent' : attempt.score >= 60 ? 'Good' : 'Review'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div key="notifs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="card-bento p-8">
                  <h2 className="text-lg font-bold mb-5">Notification Preferences</h2>
                  <div className="space-y-4">
                    {[
                      { label: 'Daily learning reminders', desc: 'Get reminded to practice every day', enabled: true },
                      { label: 'Mastery milestones', desc: 'Celebrate when you master a topic', enabled: true },
                      { label: 'At-risk alerts', desc: 'Warned when mastery drops below 60%', enabled: false },
                      { label: 'Weekly progress summary', desc: 'Recap of your learning velocity', enabled: true },
                    ].map((n, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-bg rounded-xl">
                        <div>
                          <div className="text-sm font-bold text-text-main">{n.label}</div>
                          <div className="text-xs text-text-muted mt-0.5">{n.desc}</div>
                        </div>
                        <div className={cn(
                          'w-10 h-6 rounded-full transition-colors relative cursor-pointer',
                          n.enabled ? 'bg-primary' : 'bg-slate-200'
                        )}>
                          <div className={cn(
                            'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform',
                            n.enabled ? 'translate-x-5' : 'translate-x-1'
                          )} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted mt-5 italic">
                    Email notifications require email verification (coming soon).
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
