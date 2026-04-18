import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Code2, Cpu, Globe, Database, Cloud, ArrowRight, CheckCircle2, Sparkles,
  BarChart2, Shield, Layers, TrendingUp, Megaphone, Palette, DollarSign, Brain, Stethoscope
} from 'lucide-react';
import { updateProfile } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Domain } from '../../types';

type DomainDef = {
  id: Domain;
  label: string;
  icon: any;
  description: string;
  color: string;
  glow: string;
  badge?: string;
};

type Category = {
  label: string;
  emoji: string;
  domains: DomainDef[];
};

const categories: Category[] = [
  {
    label: 'Technology',
    emoji: '💻',
    domains: [
      { id: 'DSA', label: 'Data Structures & Algorithms', icon: Code2, description: 'Master CS foundations, problem solving, and competitive programming.', color: '#38BDF8', glow: 'rgba(14,165,233,0.3)' },
      { id: 'ML', label: 'Machine Learning & AI', icon: Cpu, description: 'Neural networks, data science, and building intelligent AI models.', color: '#60A5FA', glow: 'rgba(96,165,250,0.3)' },
      { id: 'WebDev', label: 'Full-Stack Web Dev', icon: Globe, description: 'Build modern, scalable web applications from front to back.', color: '#34D399', glow: 'rgba(52,211,153,0.3)' },
      { id: 'SystemDesign', label: 'System Design', icon: Database, description: 'Architect large-scale distributed systems used at top tech companies.', color: '#FB923C', glow: 'rgba(251,146,60,0.3)' },
      { id: 'CloudComputing', label: 'Cloud Computing', icon: Cloud, description: 'Master AWS, Azure, containerization, and cloud-native architectures.', color: '#38BDF8', glow: 'rgba(56,189,248,0.3)' },
      { id: 'CyberSecurity', label: 'Cyber Security', icon: Shield, description: 'Ethical hacking, network defense, cryptography, incident response.', color: '#F87171', glow: 'rgba(248,113,113,0.3)', badge: 'Hot' },
      { id: 'DataScience', label: 'Data Science', icon: BarChart2, description: 'Python, statistics, visualization, SQL and big data pipelines.', color: '#F59E0B', glow: 'rgba(167,139,250,0.3)' },
    ],
  },
  {
    label: 'Business & Strategy',
    emoji: '📈',
    domains: [
      { id: 'ProductManagement', label: 'Product Management', icon: Layers, description: 'Roadmaps, user research, agile execution, and product strategy.', color: '#FBBF24', glow: 'rgba(251,191,36,0.3)', badge: 'Popular' },
      { id: 'BusinessAnalytics', label: 'Business Analytics', icon: TrendingUp, description: 'Excel, SQL, Power BI, KPIs, and data-driven decision making.', color: '#34D399', glow: 'rgba(52,211,153,0.3)' },
      { id: 'Finance', label: 'Finance & Investing', icon: DollarSign, description: 'Financial statements, investing, valuation, and risk management.', color: '#4ADE80', glow: 'rgba(74,222,128,0.3)' },
      { id: 'DigitalMarketing', label: 'Digital Marketing', icon: Megaphone, description: 'SEO, paid ads, social media, and marketing analytics.', color: '#F472B6', glow: 'rgba(244,114,182,0.3)' },
    ],
  },
  {
    label: 'Design & Humanities',
    emoji: '🎨',
    domains: [
      { id: 'UXDesign', label: 'UX / UI Design', icon: Palette, description: 'User research, wireframing, Figma, visual design, and usability.', color: '#FB923C', glow: 'rgba(251,146,60,0.3)' },
      { id: 'Psychology', label: 'Psychology', icon: Brain, description: 'Cognitive, social, developmental, and clinical psychology.', color: '#C084FC', glow: 'rgba(192,132,252,0.3)' },
      { id: 'Medicine', label: 'Medicine & Health', icon: Stethoscope, description: 'Anatomy, physiology, pharmacology, pathology, and clinical skills.', color: '#F87171', glow: 'rgba(248,113,113,0.3)', badge: 'New' },
    ],
  },
];

export function Onboarding() {
  const { user, setUser } = useAuth();
  const [selected, setSelected] = useState<Domain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleComplete = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      await updateProfile({ domain: selected, displayName: user?.displayName });
      if (user) setUser({ ...user, domain: selected, onboarded: true });
      navigate('/roadmap');
    } catch (err: any) {
      setError(err.message || 'Failed to save selection');
    } finally {
      setLoading(false);
    }
  };

  const selectedDomain = categories.flatMap(c => c.domains).find(d => d.id === selected);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <span className="inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 font-display"
          style={{ background: 'rgba(14,165,233,0.12)', color: '#38BDF8', border: '1px solid rgba(14,165,233,0.2)' }}>
          Step 1 — Choose Your Path
        </span>
        <h1 className="text-4xl font-display font-black tracking-tight text-text-main mb-2">
          Choose your <span className="gradient-text">learning path</span>
        </h1>
        <p className="text-text-muted text-sm">14 courses across tech, business, design & more. AI builds your custom curriculum.</p>
      </motion.header>

      {/* Categories */}
      <div className="space-y-8 mb-8">
        {categories.map((cat, ci) => (
          <motion.div key={cat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.1 }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{cat.emoji}</span>
              <span className="text-xs font-black uppercase tracking-widest font-display" style={{ color: '#4B5563' }}>{cat.label}</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {cat.domains.map((d, i) => {
                const Icon = d.icon;
                const isSelected = selected === d.id;
                return (
                  <motion.button key={d.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: ci * 0.1 + i * 0.04 }}
                    onClick={() => setSelected(d.id)}
                    className="text-left p-3.5 rounded-xl transition-all relative overflow-hidden"
                    style={{
                      background: isSelected ? `${d.color}12` : 'rgba(13,18,32,0.7)',
                      border: `1px solid ${isSelected ? d.color + '45' : 'rgba(255,255,255,0.06)'}`,
                      boxShadow: isSelected ? `0 0 20px ${d.glow}` : 'none',
                    }}>
                    {isSelected && (
                      <div className="absolute inset-0 pointer-events-none"
                        style={{ background: `linear-gradient(135deg, ${d.color}0A 0%, transparent 70%)` }} />
                    )}
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: isSelected ? `${d.color}20` : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${isSelected ? d.color + '40' : 'rgba(255,255,255,0.08)'}`,
                          boxShadow: isSelected ? `0 0 10px ${d.glow}` : 'none',
                        }}>
                        <Icon size={17} style={{ color: isSelected ? d.color : '#6B7A99' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm truncate"
                            style={{ color: isSelected ? d.color : '#E2E8F0' }}>{d.label}</span>
                          {d.badge && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0"
                              style={{ background: `${d.color}25`, color: d.color, border: `1px solid ${d.color}40` }}>
                              {d.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] mt-0.5 line-clamp-1" style={{ color: '#4B5563' }}>{d.description}</div>
                      </div>
                      {isSelected && <CheckCircle2 size={16} style={{ color: d.color }} className="shrink-0" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {error && <div className="text-red-400 text-sm text-center mb-4">{error}</div>}

      {/* Sticky CTA */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="sticky bottom-6 z-20">
            <button onClick={handleComplete} disabled={loading}
              className="btn-primary w-full py-4 text-sm flex items-center justify-center gap-2 shadow-2xl"
              style={{ boxShadow: `0 8px 32px ${selectedDomain?.glow || 'rgba(14,165,233,0.4)'}` }}>
              {loading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><Sparkles size={14} /> Start learning {selectedDomain?.label} <ArrowRight size={14} /></>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
