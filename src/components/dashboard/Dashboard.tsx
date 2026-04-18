import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import * as d3 from 'd3';
import { Zap, AlertTriangle, BrainCircuit, ArrowRight, Target, Award, BookOpen, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getKnowledgeGraph, getLearningPath, getAnalytics, getProfile } from '../../services/api';
import { KnowledgeGraphData, AnalyticsData } from '../../types';
import { cn, getMasteryColor, getMasteryBg, getMasteryLabel } from '../../lib/utils';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card-bento space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Stat card as its own component so hooks stay at component level
function StatCard({ label, value, suffix, sub, Icon, color, bg, border, delay }: {
  label: string; value: number; suffix: string; sub: string;
  Icon: any; color: string; bg: string; border: string; delay: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let start: number | null = null;
    const duration = 1200;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(ease * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }} className="card-bento">
      <div className="flex items-start justify-between">
        <div>
          <span className="card-label">{label}</span>
          <div className="big-stat count-in">{display}{suffix}</div>
          <div className="text-xs mt-1 font-medium" style={{ color }}>{sub}</div>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: bg, border: `1px solid ${border}` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

export function Dashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);

  // All hooks at top level — no conditionals
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      try {
        // Load non-AI data first, then AI learning path separately to avoid rate limit spikes
        const [graph, stats, profile] = await Promise.all([
          getKnowledgeGraph(), getAnalytics(), getProfile(),
        ]);
        if (!cancelled) {
          setGraphData(graph);
          setAnalytics(stats);
          setUser(profile);
          setLoading(false);
        }
        // Load AI-powered learning path after a short delay to spread out API calls
        await new Promise(r => setTimeout(r, 1500));
        if (!cancelled) {
          try {
            const path = await getLearningPath();
            if (!cancelled) setRecommendations(path.recommendations);
          } catch {
            // Learning path failed silently — non-critical
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!graphData || !svgRef.current || graphData.nodes.length === 0) return;
    const width = 580, height = 340;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    [{ id: 'glow-green', color: '#10B981' }, { id: 'glow-sky', color: '#0EA5E9' },
     { id: 'glow-amber', color: '#F59E0B' }, { id: 'glow-gray', color: '#6B7280' }]
      .forEach(({ id, color }) => {
        const f = defs.append('filter').attr('id', id)
          .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
        f.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
        f.append('feFlood').attr('flood-color', color).attr('flood-opacity', '0.7').attr('result', 'color');
        f.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'shadow');
        const merge = f.append('feMerge');
        merge.append('feMergeNode').attr('in', 'shadow');
        merge.append('feMergeNode').attr('in', 'SourceGraphic');
      });

    const g = svg.append('g');
    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force('link', d3.forceLink(graphData.links).id((d: any) => d.id).distance(95))
      .force('charge', d3.forceManyBody().strength(-320))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(40));

    g.append('g').selectAll('line').data(graphData.links).join('line')
      .attr('stroke', 'rgba(14,165,233,0.2)').attr('stroke-width', 1.5).attr('stroke-dasharray', '5,4');

    const nodeGroup = g.append('g').selectAll('g').data(graphData.nodes).join('g')
      .style('cursor', 'pointer')
      .on('click', (_e, d: any) => navigate(`/quiz/${d.id}`))
      .call(
        d3.drag<any, any>()
          .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }) as any
      );

    nodeGroup.append('circle').attr('r', 30)
      .attr('fill', (d: any) =>
        d.mastery >= 80 ? 'rgba(16,185,129,0.15)' : d.mastery >= 60 ? 'rgba(14,165,233,0.15)' :
        d.mastery >= 40 ? 'rgba(245,158,11,0.15)' : 'rgba(30,40,60,0.8)')
      .attr('stroke', (d: any) =>
        d.mastery >= 80 ? '#10B981' : d.mastery >= 60 ? '#0EA5E9' : d.mastery >= 40 ? '#F59E0B' : '#374151')
      .attr('stroke-width', 1.5)
      .attr('filter', (d: any) =>
        d.mastery >= 80 ? 'url(#glow-green)' : d.mastery >= 60 ? 'url(#glow-sky)' :
        d.mastery >= 40 ? 'url(#glow-amber)' : 'url(#glow-gray)');

    nodeGroup.append('text')
      .text((d: any) => d.label.split(' ')[0])
      .attr('fill', (d: any) =>
        d.mastery >= 80 ? '#34D399' : d.mastery >= 60 ? '#7DD3FC' : d.mastery >= 40 ? '#FCD34D' : '#6B7280')
      .attr('font-size', '9px').attr('font-weight', '700').attr('text-anchor', 'middle').attr('dy', 3)
      .style('font-family', 'Syne, sans-serif');

    nodeGroup.append('title').text((d: any) => `${d.label}: ${d.mastery}% mastery`);

    simulation.on('tick', () => {
      svg.selectAll('line')
        .attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
    return () => { simulation.stop(); };
  }, [graphData]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={28} className="text-red-400" />
        </div>
        <p className="font-display font-bold text-lg text-text-main">Failed to load dashboard</p>
        <p className="text-text-muted text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary px-6 py-2.5 text-sm">Retry</button>
      </div>
    );
  }

  const avgMastery = analytics?.stats.avgScore || 0;
  const streak = analytics?.stats.learningStreak || user?.learningStreak || 0;
  const topRec = recommendations[0];

  const statCards = [
    { label: 'Avg Mastery', value: avgMastery, suffix: '%', sub: 'across all topics', Icon: Target, color: '#38BDF8', bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.2)', delay: 0 },
    { label: 'Learning Streak', value: streak, suffix: 'd', sub: streak > 0 ? '🔥 Keep it up!' : 'Start today!', Icon: Zap, color: '#FCD34D', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', delay: 0.07 },
    { label: 'Topics Mastered', value: analytics?.masteredCount || 0, suffix: '', sub: `of ${analytics?.totalTopics || 0} total`, Icon: Award, color: '#34D399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', delay: 0.14 },
    { label: 'Total Quizzes', value: analytics?.stats.totalQuizzes || 0, suffix: '', sub: 'completed', Icon: BookOpen, color: '#C084FC', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)', delay: 0.21 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 font-display"
            style={{ background: 'rgba(14,165,233,0.12)', color: '#38BDF8', border: '1px solid rgba(14,165,233,0.2)' }}>
            {user?.domain || 'Learning Path'}
          </span>
          <h1 className="text-3xl font-display font-black tracking-tight text-text-main">
            Welcome back, <span className="gradient-text">{user?.displayName?.split(' ')[0]}</span>
          </h1>
          <p className="text-text-muted text-sm mt-1">Your adaptive learning intelligence dashboard.</p>
        </div>
        <button onClick={() => navigate('/diagnostic')} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
          <Zap size={15} /> Take Quiz
        </button>
      </motion.header>

      {/* Stat cards — each is its own component so useEffect is at component level */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Knowledge Graph */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="card-bento lg:col-span-2 flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="card-label">Knowledge Graph</span>
              <p className="text-xs text-text-muted">Click any node to practice that topic</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase" style={{ color: '#4B5563' }}>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" style={{ boxShadow: '0 0 6px #10B981' }} /> Mastered</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#0EA5E9', boxShadow: '0 0 6px #0EA5E9' }} /> Learning</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" style={{ boxShadow: '0 0 6px #F59E0B' }} /> At Risk</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center rounded-xl overflow-hidden"
            style={{ background: 'rgba(6,10,18,0.6)', border: '1px solid rgba(14,165,233,0.1)' }}>
            {graphData && graphData.nodes.length > 0 ? (
              <svg ref={svgRef} viewBox="0 0 580 340" className="w-full h-full" />
            ) : (
              <div className="text-center text-text-muted">
                <BrainCircuit size={36} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No graph data yet</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* AI Recommendations */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
          className="card-bento flex flex-col">
          <span className="card-label">AI Recommendations</span>
          <div className="space-y-2 flex-1">
            {recommendations.length > 0 ? recommendations.map((rec, i) => (
              <button key={rec.topicId} onClick={() => navigate(`/quiz/${rec.topicId}`)}
                className="w-full text-left p-3 rounded-xl transition-all"
                style={{ background: 'rgba(6,10,18,0.5)', border: '1px solid rgba(14,165,233,0.1)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,165,233,0.35)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,165,233,0.1)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                      style={{ background: i === 0 ? 'linear-gradient(135deg,#0EA5E9,#0284C7)' : 'rgba(14,165,233,0.2)', boxShadow: i === 0 ? '0 0 10px rgba(14,165,233,0.5)' : 'none' }}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text-main">{rec.topicTitle}</div>
                      <div className="text-[10px] line-clamp-1 mt-0.5" style={{ color: '#4B5563' }}>{rec.reason}</div>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-text-muted shrink-0" />
                </div>
              </button>
            )) : (
              <div className="text-center text-text-muted py-8">
                <p className="text-sm">Complete the diagnostic quiz to get recommendations!</p>
              </div>
            )}
          </div>
          {topRec && (
            <button onClick={() => navigate(`/quiz/${topRec.topicId}`)}
              className="btn-primary mt-4 w-full py-3 text-sm flex items-center justify-center gap-2">
              Start Next Topic <ArrowRight size={14} />
            </button>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Topic Mastery */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-bento">
          <div className="flex items-center justify-between mb-5">
            <span className="card-label">Topic Mastery</span>
            <span className="text-[10px] font-bold uppercase" style={{ color: '#4B5563' }}>{user?.domain}</span>
          </div>
          <div className="space-y-3.5">
            {(analytics?.topicMastery || []).slice(0, 6).map((t, i) => {
              const barColor = t.mastery >= 80 ? '#10B981' : t.mastery >= 60 ? '#0EA5E9' : t.mastery >= 40 ? '#F59E0B' : '#EF4444';
              const glowColor = t.mastery >= 80 ? 'rgba(16,185,129,0.4)' : t.mastery >= 60 ? 'rgba(14,165,233,0.4)' : t.mastery >= 40 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)';
              return (
                <div key={t.title} className="flex items-center gap-3">
                  <div className="text-xs text-text-main font-medium w-32 truncate shrink-0">{t.title}</div>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${t.mastery}%` }}
                      transition={{ duration: 0.8, delay: 0.1 + i * 0.07, ease: 'easeOut' }}
                      className="h-full rounded-full progress-bar-inner"
                      style={{ background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`, boxShadow: `0 0 8px ${glowColor}` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold w-8 text-right" style={{ color: barColor }}>{t.mastery}%</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Focus Areas */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card-bento">
          <div className="flex items-center justify-between mb-5">
            <span className="card-label">Focus Areas</span>
            <span className="text-[10px] font-bold uppercase flex items-center gap-1" style={{ color: '#F59E0B' }}>
              <AlertTriangle size={11} /> Needs attention
            </span>
          </div>
          {analytics?.weakAreas && analytics.weakAreas.length > 0 ? (
            <div className="space-y-2">
              {analytics.weakAreas.map(area => (
                <button key={area.id} onClick={() => navigate(`/quiz/${area.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-xl transition-all"
                  style={{ background: 'rgba(6,10,18,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,165,233,0.25)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                  }}>
                  <div className="flex items-center gap-3">
                    <div className={cn('w-2 h-2 rounded-full', getMasteryBg(area.mastery))} />
                    <span className="text-sm font-medium text-text-main">{area.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-bold', getMasteryColor(area.mastery))}>{getMasteryLabel(area.mastery)}</span>
                    <ChevronRight size={13} className="text-text-muted" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Award size={24} className="text-emerald-400" />
              </div>
              <p className="text-sm text-text-muted">No weak areas detected! Keep it up.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
