import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAnalytics, getTopics } from '../../services/api';
import {
  BarChart3, Target, AlertTriangle, TrendingUp, TrendingDown,
  Zap, CheckCircle2, XCircle, ArrowRight, Sparkles, Brain,
  Trophy, Clock, BookOpen, ChevronRight, Info
} from 'lucide-react';
import { cn, getMasteryLabel } from '../../lib/utils';

interface SkillGap {
  id: string;
  title: string;
  currentMastery: number;
  targetMastery: number;
  gap: number;
  difficulty: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedHours: number;
  recommendation: string;
  phase: string;
}

interface SkillProfile {
  strengths: { title: string; mastery: number; id: string }[];
  weaknesses: { title: string; mastery: number; id: string }[];
  gaps: SkillGap[];
  overallHealth: number;
  readinessScore: number;
  topPriority: string;
}

const PRIORITY_CONFIG = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: '🔴 Critical', glow: 'rgba(239,68,68,0.3)' },
  high: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', label: '🟡 High', glow: 'rgba(245,158,11,0.3)' },
  medium: { color: '#0EA5E9', bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.25)', label: '🔵 Medium', glow: 'rgba(14,165,233,0.3)' },
  low: { color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', label: '🟢 Low', glow: 'rgba(16,185,129,0.3)' },
};

function RadarChart({ skills }: { skills: { label: string; value: number; color: string }[] }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const n = skills.length;

  const points = skills.map((s, i) => {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
    const val = s.value / 100;
    return {
      x: cx + r * val * Math.cos(angle),
      y: cy + r * val * Math.sin(angle),
      outerX: cx + r * Math.cos(angle),
      outerY: cy + r * Math.sin(angle),
      labelX: cx + (r + 22) * Math.cos(angle),
      labelY: cy + (r + 22) * Math.sin(angle),
      ...s
    };
  });

  const polygon = points.map(p => `${p.x},${p.y}`).join(' ');
  const outerPolygon = points.map(p => `${p.outerX},${p.outerY}`).join(' ');

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[220px]">
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.05" />
        </radialGradient>
      </defs>

      {/* Grid rings */}
      {rings.map((ring, i) => (
        <polygon key={i}
          points={points.map(p => {
            const angle = Math.atan2(p.outerY - cy, p.outerX - cx);
            return `${cx + r * ring * Math.cos(angle)},${cy + r * ring * Math.sin(angle)}`;
          }).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}

      {/* Spokes */}
      {points.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.outerX} y2={p.outerY}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}

      {/* Data polygon */}
      <motion.polygon
        points={polygon}
        fill="url(#radarFill)"
        stroke="#0EA5E9"
        strokeWidth="1.5"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ transformOrigin: `${cx}px ${cy}px`, filter: 'drop-shadow(0 0 6px rgba(14,165,233,0.5))' }}
      />

      {/* Data points */}
      {points.map((p, i) => (
        <motion.circle key={i} cx={p.x} cy={p.y} r={3}
          fill={p.color} stroke="rgba(0,0,0,0.5)" strokeWidth="1"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          style={{ filter: `drop-shadow(0 0 4px ${p.color})` }}
        />
      ))}

      {/* Labels */}
      {points.map((p, i) => (
        <text key={i} x={p.labelX} y={p.labelY}
          textAnchor="middle" dominantBaseline="middle"
          fill="#6B7A99" fontSize="8" fontWeight="700" fontFamily="Syne, sans-serif">
          {p.label.split(' ')[0]}
        </text>
      ))}
    </svg>
  );
}

function GapBar({ gap, index }: { gap: SkillGap; index: number }) {
  const cfg = PRIORITY_CONFIG[gap.priority];
  const filled = gap.currentMastery;
  const target = gap.targetMastery;
  const gapSize = target - filled;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="p-4 rounded-xl"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-text-main">{gap.title}</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
              {cfg.label}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">{gap.recommendation}</p>
        </div>
        <div className="text-right shrink-0 ml-2">
          <div className="text-lg font-black font-display" style={{ color: cfg.color }}>
            -{gap.gap}%
          </div>
          <div className="text-[10px] text-text-muted">gap</div>
        </div>
      </div>

      {/* Bar */}
      <div className="relative h-3 rounded-full overflow-visible mb-2"
        style={{ background: 'rgba(255,255,255,0.04)' }}>
        {/* Current */}
        <motion.div className="absolute left-0 top-0 h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${filled}%` }}
          transition={{ duration: 0.8, delay: 0.1 + index * 0.05 }}
          style={{ background: '#0EA5E9', boxShadow: '0 0 8px rgba(14,165,233,0.4)' }} />
        {/* Gap indicator */}
        <motion.div className="absolute top-0 h-full rounded-r-full"
          initial={{ width: 0, left: `${filled}%` }}
          animate={{ width: `${gapSize}%`, left: `${filled}%` }}
          transition={{ duration: 0.6, delay: 0.5 + index * 0.05 }}
          style={{ background: `${cfg.color}40`, border: `1px dashed ${cfg.color}60` }} />
        {/* Target marker */}
        <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
          style={{ left: `${target}%`, background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <span style={{ color: '#0EA5E9' }}>Current: <strong>{filled}%</strong></span>
        <span className="text-text-muted">~{gap.estimatedHours}h to close gap</span>
        <span style={{ color: cfg.color }}>Target: <strong>{target}%</strong></span>
      </div>
    </motion.div>
  );
}

const DOMAINS = ['DSA','ML','WebDev','SystemDesign','CloudComputing','DataScience','CyberSecurity','ProductManagement','BusinessAnalytics','DigitalMarketing','UXDesign','Finance','Psychology','Medicine'];

export function SkillGapAnalyzer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDomain, setSelectedDomain] = useState<string>(user?.domain || 'DSA');
  const [profile, setProfile] = useState<SkillProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'gap' | 'priority' | 'mastery'>('priority');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    setProfile(null);
    setAiInsight('');
    const load = async () => {
      setLoading(true);
      try {
        const [analyticsData, topicData] = await Promise.all([
          getAnalytics(),
          getTopics(selectedDomain)
        ]);

        const topics = topicData.topics;
        const sortedByMastery = [...topics].sort((a: any, b: any) => b.mastery - a.mastery);

        // Build skill gaps
        const gaps: SkillGap[] = topics.map((t: any, i: number): SkillGap => {
          const targetMastery = Math.min(t.mastery + 40, 90);
          const gap = Math.max(0, targetMastery - t.mastery);
          const priority: 'critical' | 'high' | 'medium' | 'low' =
            t.mastery === 0 ? 'critical' :
            t.mastery < 40 ? 'high' :
            t.mastery < 70 ? 'medium' : 'low';

          return {
            id: t.id,
            title: t.title,
            currentMastery: t.mastery,
            targetMastery,
            gap,
            difficulty: t.difficultyLevel,
            priority,
            estimatedHours: Math.round(gap / 10 * t.difficultyLevel * 0.5),
            recommendation: priority === 'critical'
              ? 'Not started — begin immediately for best results'
              : priority === 'high'
              ? 'Below threshold — needs focused study sessions'
              : priority === 'medium'
              ? 'Making progress — consistent practice will close the gap'
              : 'Almost there — a few more sessions to mastery',
            phase: i < topics.length / 5 ? 'Foundation' :
              i < topics.length * 2 / 5 ? 'Core Concepts' :
              i < topics.length * 3 / 5 ? 'Intermediate' :
              i < topics.length * 4 / 5 ? 'Advanced' : 'Expert'
          };
        }).filter((g: SkillGap) => g.gap > 5);

        // Radar skill categories (group topics into 6 areas)
        const chunkSize = Math.ceil(topics.length / 6);
        const radarSkills = ['Fundamentals', 'Problem Solving', 'Architecture', 'Optimization', 'Best Practices', 'Advanced'].map((label, i) => {
          const slice = topics.slice(i * chunkSize, (i + 1) * chunkSize);
          const avg = slice.length > 0
            ? Math.round(slice.reduce((s: number, t: any) => s + t.mastery, 0) / slice.length)
            : 0;
          const colors = ['#0EA5E9', '#06B6D4', '#F59E0B', '#EF4444', '#10B981', '#F59E0B'];
          return { label, value: avg, color: colors[i] };
        });

        const overallHealth = analyticsData.stats.avgScore || 0;
        const readinessScore = Math.round(
          (analyticsData.masteredCount / Math.max(analyticsData.totalTopics, 1)) * 100
        );

        setProfile({
          strengths: sortedByMastery.slice(0, 4).map((t: any) => ({ title: t.title, mastery: t.mastery, id: t.id })),
          weaknesses: sortedByMastery.slice(-4).reverse().filter((t: any) => t.mastery < 60).map((t: any) => ({ title: t.title, mastery: t.mastery, id: t.id })),
          gaps: gaps.sort((a, b) => {
            const order = { critical: 0, high: 1, medium: 2, low: 3 };
            return order[a.priority] - order[b.priority];
          }),
          overallHealth,
          readinessScore,
          topPriority: gaps[0]?.title || 'All looking good!',
          // @ts-ignore - store radar for rendering
          radarSkills,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedDomain]);

  const fetchAiInsight = async () => {
    if (!profile) return;
    setLoadingInsight(true);
    try {
      const resp = await fetch('/api/ai/insight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cb_token')}`,
        },
        body: JSON.stringify({ prompt: `You are a learning coach. Analyze this student's skill profile for ${selectedDomain}:
- Overall health: ${profile.overallHealth}%
- Readiness: ${profile.readinessScore}%
- Top gaps: ${profile.gaps.slice(0, 3).map(g => `${g.title} (${g.gap}% gap)`).join(', ')}
- Strengths: ${profile.strengths.slice(0, 3).map(s => s.title).join(', ')}

Give a 3-sentence personalized insight: what they're doing well, what to focus on next, and one motivational tip. Be direct and specific.` }),
      });
      const data = await resp.json();
      setAiInsight(data.text || 'Keep practicing consistently!');
    } catch {
      setAiInsight('Focus on your critical gaps first — they have the highest impact on your overall readiness. Build foundations before advancing to harder topics. Every session moves you forward!');
    } finally {
      setLoadingInsight(false);
    }
  };

  const filteredGaps = profile?.gaps.filter(g =>
    activeFilter === 'all' || g.priority === activeFilter
  ).sort((a, b) => {
    if (sortBy === 'gap') return b.gap - a.gap;
    if (sortBy === 'mastery') return a.currentMastery - b.currentMastery;
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
            style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'rgba(14,165,233,0.3)', borderTopColor: '#0EA5E9' }} />
          </div>
          <p className="text-text-muted text-sm font-semibold font-display">Analyzing your skills...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const criticalCount = profile.gaps.filter(g => g.priority === 'critical').length;
  const highCount = profile.gaps.filter(g => g.priority === 'high').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 font-display"
            style={{ background: 'rgba(14,165,233,0.10)', color: '#38BDF8', border: '1px solid rgba(14,165,233,0.20)' }}>
            <BarChart3 size={10} /> Skill Gap Analyzer
          </span>
          <h1 className="text-3xl font-display font-black tracking-tight text-text-main">
            Your <span style={{ background: 'linear-gradient(135deg,#0EA5E9,#F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Skill Profile</span>
          </h1>
          <p className="text-text-muted text-sm mt-1">Identify gaps, prioritize learning, close the distance to mastery</p>
        </div>
        {/* Domain selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Domain:</span>
          <select
            value={selectedDomain}
            onChange={e => setSelectedDomain(e.target.value)}
            className="input-dark text-sm px-3 py-2 pr-8 appearance-none cursor-pointer font-display font-bold"
            style={{ minWidth: 180 }}
          >
            {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </motion.div>

      {/* Top row: Health + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health scores */}
        <div className="space-y-3">
          {[
            { label: 'Overall Health', value: profile.overallHealth, color: '#0EA5E9', icon: Brain, desc: 'Average quiz score' },
            { label: 'Readiness Score', value: profile.readinessScore, color: '#10B981', icon: Trophy, desc: 'Topics mastered' },
            { label: 'Gaps Identified', value: profile.gaps.length, suffix: '', color: '#F59E0B', icon: Target, desc: 'Need improvement' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }} className="card-bento py-3 px-4 flex items-center gap-4">
                <div className="relative w-12 h-12 shrink-0">
                  <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
                    <circle cx="24" cy="24" r="19" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                    {!s.suffix && (
                      <motion.circle cx="24" cy="24" r="19" fill="none" stroke={s.color} strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 19}
                        initial={{ strokeDashoffset: 2 * Math.PI * 19 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 19 * (1 - s.value / 100) }}
                        transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                        style={{ filter: `drop-shadow(0 0 4px ${s.color})` }} />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon size={14} style={{ color: s.color }} />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase font-bold">{s.label}</div>
                  <div className="text-2xl font-black font-display" style={{ color: s.color }}>
                    {s.value}{s.suffix !== '' ? '' : '%'}
                  </div>
                  <div className="text-[10px] text-text-muted">{s.desc}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Radar chart */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }} className="card-bento flex flex-col items-center justify-center">
          <span className="card-label text-center w-full mb-2">Skill Radar</span>
          {/* @ts-ignore */}
          <RadarChart skills={(profile as any).radarSkills || []} />
        </motion.div>

        {/* Strengths & Weaknesses */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }} className="card-bento space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={12} className="text-emerald-400" />
              <span className="card-label !mb-0 text-emerald-400">Strengths</span>
            </div>
            <div className="space-y-1.5">
              {profile.strengths.map(s => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-xs text-text-main truncate max-w-[140px]">{s.title}</span>
                  <span className="text-xs font-bold text-emerald-400">{s.mastery}%</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={12} className="text-red-400" />
              <span className="card-label !mb-0 text-red-400">Needs Work</span>
            </div>
            <div className="space-y-1.5">
              {profile.weaknesses.map(s => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-xs text-text-main truncate max-w-[140px]">{s.title}</span>
                  <span className="text-xs font-bold text-red-400">{s.mastery}%</span>
                </div>
              ))}
              {profile.weaknesses.length === 0 && (
                <div className="text-xs text-text-muted">No major weaknesses — great work!</div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* AI Insight */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="card-bento"
        style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(167,139,250,0.05))', borderColor: 'rgba(14,165,233,0.2)' }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)' }}>
            <Sparkles size={16} className="text-sky-400" />
          </div>
          <div className="flex-1">
            <div className="font-display font-bold text-text-main mb-1 flex items-center gap-2">
              AI Coaching Insight
              {!aiInsight && (
                <button onClick={fetchAiInsight} disabled={loadingInsight}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all"
                  style={{ background: 'rgba(14,165,233,0.2)', color: '#7DD3FC', border: '1px solid rgba(14,165,233,0.3)' }}>
                  {loadingInsight ? '✨ Analyzing...' : '✨ Generate Insight'}
                </button>
              )}
            </div>
            {aiInsight ? (
              <p className="text-text-muted text-sm leading-relaxed">{aiInsight}</p>
            ) : (
              <p className="text-text-muted text-sm">
                {criticalCount > 0
                  ? `⚠️ ${criticalCount} critical gap${criticalCount > 1 ? 's' : ''} detected. Start with ${profile.topPriority} for maximum impact.`
                  : `You have ${profile.gaps.length} skill gaps to close. Click "Generate Insight" for personalized AI coaching.`}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Gap Breakdown */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="card-bento">
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="card-label">Skill Gaps ({profile.gaps.length})</span>
            <p className="text-xs text-text-muted">Gaps are ordered by priority — fix critical ones first</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="text-xs px-2 py-1.5 rounded-lg text-text-muted"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <option value="priority">Sort: Priority</option>
              <option value="gap">Sort: Gap Size</option>
              <option value="mastery">Sort: Mastery</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map(f => {
            const count = f === 'all' ? profile.gaps.length : profile.gaps.filter(g => g.priority === f).length;
            const cfg = f !== 'all' ? PRIORITY_CONFIG[f] : null;
            return (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={cn('px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all')}
                style={activeFilter === f ? {
                  background: cfg?.bg || 'rgba(14,165,233,0.15)',
                  color: cfg?.color || '#7DD3FC',
                  border: `1px solid ${cfg?.border || 'rgba(14,165,233,0.3)'}`,
                  boxShadow: `0 0 10px ${cfg?.glow || 'rgba(14,165,233,0.2)'}`
                } : {
                  background: 'rgba(255,255,255,0.03)',
                  color: '#6B7A99',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                {f === 'all' ? `All (${count})` : `${PRIORITY_CONFIG[f].label} (${count})`}
              </button>
            );
          })}
        </div>

        {/* Gaps list */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredGaps.map((gap, i) => (
              <div key={gap.id}>
                <GapBar gap={gap} index={i} />
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => navigate(`/quiz/${gap.id}`)}
                  className="mt-1 ml-auto flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
                  style={{ color: PRIORITY_CONFIG[gap.priority].color, background: PRIORITY_CONFIG[gap.priority].bg }}>
                  Practice now <ChevronRight size={10} />
                </motion.button>
              </div>
            ))}
          </AnimatePresence>
          {filteredGaps.length === 0 && (
            <div className="text-center py-8 text-text-muted">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400" />
              <p className="text-sm">No {activeFilter !== 'all' ? activeFilter : ''} gaps found!</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Action plan */}
      {profile.gaps.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="card-bento"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.04))', borderColor: 'rgba(16,185,129,0.2)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <Zap size={14} className="text-emerald-400" />
            </div>
            <div>
              <div className="font-display font-bold text-text-main">Quick Action Plan</div>
              <div className="text-xs text-text-muted">Start with these 3 topics this week</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {profile.gaps.slice(0, 3).map((gap, i) => (
              <button key={gap.id} onClick={() => navigate(`/quiz/${gap.id}`)}
                className="p-3 rounded-xl text-left transition-all group"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = PRIORITY_CONFIG[gap.priority].border;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}>
                <div className="text-[10px] font-black mb-1" style={{ color: '#6B7A99' }}>Week {i + 1}</div>
                <div className="text-sm font-bold text-text-main mb-1 line-clamp-1">{gap.title}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: PRIORITY_CONFIG[gap.priority].color }}>
                    {gap.estimatedHours}h estimated
                  </span>
                  <ArrowRight size={10} className="text-text-muted group-hover:text-text-main transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
