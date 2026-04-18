import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTopics, getAnalytics } from '../../services/api';
import {
  Map, ChevronRight, Lock, CheckCircle2, Circle, Zap, Target,
  Clock, Star, ArrowRight, BookOpen, Trophy, Flame, ChevronDown,
  Sparkles, AlertCircle
} from 'lucide-react';
import { cn, getMasteryLabel } from '../../lib/utils';

interface RoadmapTopic {
  id: string;
  title: string;
  description: string;
  mastery: number;
  difficultyLevel: number;
  orderIndex: number;
  prerequisites: string[];
  attempts: number;
  phase: number;
  phaseLabel: string;
}

const PHASE_CONFIG = [
  { label: 'Foundation', color: '#0EA5E9', glow: 'rgba(14,165,233,0.4)', bg: 'rgba(14,165,233,0.08)', icon: '🏗️' },
  { label: 'Core Concepts', color: '#06B6D4', glow: 'rgba(6,182,212,0.4)', bg: 'rgba(6,182,212,0.08)', icon: '🧠' },
  { label: 'Intermediate', color: '#F59E0B', glow: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)', icon: '⚡' },
  { label: 'Advanced', color: '#EF4444', glow: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)', icon: '🔥' },
  { label: 'Expert', color: '#10B981', glow: 'rgba(16,185,129,0.4)', bg: 'rgba(16,185,129,0.08)', icon: '🏆' },
];

function NodeStatus({ mastery }: { mastery: number }) {
  if (mastery >= 80) return <CheckCircle2 size={14} className="text-emerald-400" />;
  if (mastery > 0) return <Circle size={14} className="text-amber-400" />;
  return <Lock size={14} className="text-[#4B5563]" />;
}

function MasteryRing({ mastery, color }: { mastery: number; color: string }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (mastery / 100) * circ;
  return (
    <svg width={54} height={54} className="absolute inset-0">
      <circle cx={27} cy={27} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={3} />
      <motion.circle
        cx={27} cy={27} r={r} fill="none"
        stroke={color} strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        transform="rotate(-90 27 27)"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

export function Roadmap() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDomain, setSelectedDomain] = useState<string>(user?.domain || 'DSA');
  const [topics, setTopics] = useState<RoadmapTopic[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<RoadmapTopic | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]));
  const [viewMode, setViewMode] = useState<'path' | 'grid'>('path');

  const DOMAINS = ['DSA','ML','WebDev','SystemDesign','CloudComputing','DataScience','CyberSecurity','ProductManagement','BusinessAnalytics','DigitalMarketing','UXDesign','Finance','Psychology','Medicine'];

  useEffect(() => {
    setTopics([]);
    const load = async () => {
      setLoading(true);
      try {
        const [topicData, analyticsData] = await Promise.all([
          getTopics(selectedDomain),
          getAnalytics()
        ]);
        const enriched = topicData.topics.map((t: any, i: number) => ({
          ...t,
          phase: Math.min(Math.floor(i / Math.ceil(topicData.topics.length / 5)), 4),
          phaseLabel: PHASE_CONFIG[Math.min(Math.floor(i / Math.ceil(topicData.topics.length / 5)), 4)].label,
        }));
        setTopics(enriched);
        setAnalytics(analyticsData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedDomain]);

  const phases = PHASE_CONFIG.map((p, pi) => ({
    ...p,
    index: pi,
    topics: topics.filter(t => t.phase === pi),
  }));

  const totalMastery = topics.length > 0
    ? Math.round(topics.reduce((s, t) => s + t.mastery, 0) / topics.length)
    : 0;
  const mastered = topics.filter(t => t.mastery >= 80).length;
  const inProgress = topics.filter(t => t.mastery > 0 && t.mastery < 80).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
            style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'rgba(14,165,233,0.3)', borderTopColor: '#0EA5E9' }} />
          </div>
          <p className="text-text-muted text-sm font-semibold font-display">Building your roadmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 font-display"
            style={{ background: 'rgba(14,165,233,0.10)', color: '#38BDF8', border: '1px solid rgba(14,165,233,0.20)' }}>
            <Map size={10} /> Learning Roadmap
          </span>
          <h1 className="text-3xl font-display font-black tracking-tight text-text-main">
            Your <span style={{ background: 'linear-gradient(135deg,#38BDF8,#F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{selectedDomain}</span> Journey
          </h1>
          <p className="text-text-muted text-sm mt-1">Interactive learning path — click any node to start practicing</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Domain selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Domain:</span>
            <select
              value={selectedDomain}
              onChange={e => setSelectedDomain(e.target.value)}
              className="input-dark text-sm px-3 py-2 pr-8 appearance-none cursor-pointer font-display font-bold"
              style={{ minWidth: 160 }}
            >
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-2">
            {(['path', 'grid'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all',
                  viewMode === mode ? 'text-white' : 'text-text-muted hover:text-text-main')}
                style={viewMode === mode ? {
                  background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                  boxShadow: '0 0 12px rgba(14,165,233,0.4)'
                } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {mode === 'path' ? '⛓ Path' : '▦ Grid'}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Progress Overview */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card-bento">
        <div className="flex items-center gap-8">
          {/* Overall ring */}
          <div className="relative w-20 h-20 shrink-0">
            <svg width={80} height={80} className="absolute inset-0">
              <circle cx={40} cy={40} r={33} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5} />
              <motion.circle cx={40} cy={40} r={33} fill="none"
                stroke="url(#roadmapGrad)" strokeWidth={5} strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 33}
                initial={{ strokeDashoffset: 2 * Math.PI * 33 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 33 * (1 - totalMastery / 100) }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                transform="rotate(-90 40 40)" />
              <defs>
                <linearGradient id="roadmapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0EA5E9" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-lg font-black font-display text-text-main">{totalMastery}%</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-4 gap-4">
            {[
              { label: 'Total Topics', value: topics.length, color: '#38BDF8', icon: BookOpen },
              { label: 'Mastered', value: mastered, color: '#34D399', icon: Trophy },
              { label: 'In Progress', value: inProgress, color: '#FCD34D', icon: Flame },
              { label: 'Overall Progress', value: `${totalMastery}%`, color: '#C084FC', icon: Target },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="text-center">
                  <div className="w-8 h-8 rounded-xl mx-auto mb-1 flex items-center justify-center"
                    style={{ background: s.color + '18' }}>
                    <Icon size={14} style={{ color: s.color }} />
                  </div>
                  <div className="text-xl font-black font-display" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] text-text-muted font-semibold">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase progress bar */}
        <div className="mt-5 flex gap-1 h-2 rounded-full overflow-hidden">
          {phases.map((ph, i) => {
            const phMastery = ph.topics.length > 0
              ? Math.round(ph.topics.reduce((s, t) => s + t.mastery, 0) / ph.topics.length)
              : 0;
            return (
              <motion.div key={i}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex-1 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.05)' }}
                title={`${ph.label}: ${phMastery}%`}>
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${phMastery}%` }}
                  transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                  style={{ background: ph.color, boxShadow: `0 0 8px ${ph.glow}` }} />
              </motion.div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-2">
          {phases.map(ph => (
            <div key={ph.label} className="flex-1 text-center">
              <span className="text-[9px] font-bold uppercase" style={{ color: ph.color }}>{ph.icon}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Roadmap */}
      <div className="space-y-4">
        {phases.map((phase, phaseIdx) => (
          <motion.div key={phase.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + phaseIdx * 0.08 }}
            className="card-bento overflow-hidden"
            style={{ borderColor: expandedPhases.has(phaseIdx) ? phase.color + '30' : undefined }}>

            {/* Phase header */}
            <button
              onClick={() => setExpandedPhases(prev => {
                const n = new Set(prev);
                n.has(phaseIdx) ? n.delete(phaseIdx) : n.add(phaseIdx);
                return n;
              })}
              className="w-full flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: phase.bg, border: `1px solid ${phase.color}30`, boxShadow: `0 0 12px ${phase.glow}` }}>
                  {phase.icon}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-text-main">{phase.label}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: phase.bg, color: phase.color, border: `1px solid ${phase.color}30` }}>
                      Phase {phaseIdx + 1}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">{phase.topics.length} topics</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Phase completion */}
                <div className="text-right mr-2">
                  <span className="text-sm font-black font-display" style={{ color: phase.color }}>
                    {phase.topics.length > 0
                      ? Math.round(phase.topics.reduce((s, t) => s + t.mastery, 0) / phase.topics.length)
                      : 0}%
                  </span>
                  <div className="text-[10px] text-text-muted">complete</div>
                </div>
                <motion.div animate={{ rotate: expandedPhases.has(phaseIdx) ? 180 : 0 }}>
                  <ChevronDown size={16} className="text-text-muted" />
                </motion.div>
              </div>
            </button>

            <AnimatePresence>
              {expandedPhases.has(phaseIdx) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}>
                  <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${phase.color}15` }}>
                    {viewMode === 'path' ? (
                      <PathView topics={phase.topics} phase={phase} onSelect={setSelectedTopic} navigate={navigate} />
                    ) : (
                      <GridView topics={phase.topics} phase={phase} onSelect={setSelectedTopic} navigate={navigate} />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Topic Detail Modal */}
      <AnimatePresence>
        {selectedTopic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setSelectedTopic(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md card-bento"
              style={{
                border: `1px solid ${PHASE_CONFIG[selectedTopic.phase]?.color}40`,
                boxShadow: `0 0 40px ${PHASE_CONFIG[selectedTopic.phase]?.glow}`
              }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest font-display"
                    style={{ color: PHASE_CONFIG[selectedTopic.phase]?.color }}>
                    {PHASE_CONFIG[selectedTopic.phase]?.icon} {selectedTopic.phaseLabel}
                  </span>
                  <h3 className="text-xl font-display font-black text-text-main mt-1">{selectedTopic.title}</h3>
                </div>
                <button onClick={() => setSelectedTopic(null)}
                  className="text-text-muted hover:text-text-main w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>✕</button>
              </div>

              <p className="text-text-muted text-sm mb-5 leading-relaxed">{selectedTopic.description}</p>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Mastery', value: `${selectedTopic.mastery}%`, color: '#38BDF8' },
                  { label: 'Difficulty', value: `${selectedTopic.difficultyLevel}/10`, color: '#F59E0B' },
                  { label: 'Attempts', value: selectedTopic.attempts, color: '#34D399' },
                ].map(s => (
                  <div key={s.label} className="text-center p-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="font-black font-display text-lg" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px] text-text-muted">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Mastery bar */}
              <div className="mb-5">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-text-muted">Progress</span>
                  <span className="text-xs font-bold" style={{ color: PHASE_CONFIG[selectedTopic.phase]?.color }}>
                    {getMasteryLabel(selectedTopic.mastery)}
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${selectedTopic.mastery}%` }}
                    transition={{ duration: 0.8 }}
                    style={{
                      background: PHASE_CONFIG[selectedTopic.phase]?.color,
                      boxShadow: `0 0 8px ${PHASE_CONFIG[selectedTopic.phase]?.glow}`
                    }} />
                </div>
              </div>

              <button
                onClick={() => { navigate(`/quiz/${selectedTopic.id}`); setSelectedTopic(null); }}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                <Zap size={14} />
                {selectedTopic.mastery > 0 ? 'Continue Practice' : 'Start Learning'}
                <ArrowRight size={14} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PathView({ topics, phase, onSelect, navigate }: any) {
  return (
    <div className="relative">
      {/* Connecting line */}
      {topics.length > 1 && (
        <div className="absolute left-[26px] top-6 bottom-6 w-0.5"
          style={{ background: `linear-gradient(to bottom, ${phase.color}60, transparent)` }} />
      )}
      <div className="space-y-3 pl-2">
        {topics.map((t: RoadmapTopic, i: number) => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}>
            <button
              onClick={() => onSelect(t)}
              className="w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all group"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = phase.bg;
                (e.currentTarget as HTMLElement).style.borderColor = phase.color + '40';
                (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
              }}>
              {/* Node */}
              <div className="relative w-[54px] h-[54px] shrink-0">
                <div className="absolute inset-0 rounded-full flex items-center justify-center"
                  style={{
                    background: t.mastery >= 80 ? 'rgba(16,185,129,0.15)' : t.mastery > 0 ? phase.bg : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${t.mastery >= 80 ? '#10B981' : t.mastery > 0 ? phase.color : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: t.mastery > 0 ? `0 0 12px ${phase.glow}` : 'none'
                  }}>
                  <span className="text-sm font-black font-display"
                    style={{ color: t.mastery >= 80 ? '#34D399' : t.mastery > 0 ? phase.color : '#4B5563' }}>
                    {t.mastery > 0 ? `${t.mastery}%` : `${i + 1}`}
                  </span>
                </div>
                {t.mastery > 0 && <MasteryRing mastery={t.mastery} color={t.mastery >= 80 ? '#10B981' : phase.color} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-main text-sm truncate">{t.title}</span>
                  <NodeStatus mastery={t.mastery} />
                </div>
                <div className="text-[11px] text-text-muted line-clamp-1 mt-0.5">{t.description}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(255,255,255,0.04)', color: '#6B7A99' }}>
                    ★ {t.difficultyLevel}/10
                  </span>
                  {t.mastery >= 80 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(16,185,129,0.1)', color: '#34D399' }}>
                      ✓ Mastered
                    </span>
                  )}
                  {t.mastery > 0 && t.mastery < 80 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: phase.bg, color: phase.color }}>
                      {t.mastery}% done
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight size={14} className="text-text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function GridView({ topics, phase, onSelect, navigate }: any) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {topics.map((t: RoadmapTopic, i: number) => (
        <motion.button key={t.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(t)}
          className="p-3 rounded-xl text-left relative overflow-hidden transition-all"
          style={{
            background: t.mastery >= 80 ? 'rgba(16,185,129,0.06)' : t.mastery > 0 ? phase.bg : 'rgba(255,255,255,0.02)',
            border: `1px solid ${t.mastery >= 80 ? '#10B98130' : t.mastery > 0 ? phase.color + '30' : 'rgba(255,255,255,0.06)'}`,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${phase.glow}`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}>
          <div className="flex items-center justify-between mb-2">
            <NodeStatus mastery={t.mastery} />
            <span className="text-[10px] font-bold" style={{ color: '#6B7A99' }}>★ {t.difficultyLevel}</span>
          </div>
          <div className="text-xs font-bold text-text-main line-clamp-2 mb-2">{t.title}</div>
          <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${t.mastery}%`,
                background: t.mastery >= 80 ? '#10B981' : phase.color,
                boxShadow: t.mastery > 0 ? `0 0 6px ${phase.glow}` : 'none'
              }} />
          </div>
          <div className="text-[10px] mt-1" style={{ color: t.mastery >= 80 ? '#34D399' : phase.color }}>
            {t.mastery}%
          </div>
        </motion.button>
      ))}
    </div>
  );
}
