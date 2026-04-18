import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Code2, Play, Terminal, BrainCircuit, Lightbulb,
  ChevronDown, RefreshCw, CheckCircle2, Eye, EyeOff,
  BookOpen, PenLine, Brain, ListChecks,
} from 'lucide-react';
import { getTopics, getPracticeExercise } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Topic } from '../../types';
import { cn } from '../../lib/utils';

// Domains that get a code editor lab
const CODING_DOMAINS = ['DSA', 'ML', 'WebDev', 'SystemDesign', 'CloudComputing', 'DataScience', 'CyberSecurity'];

export function PracticeLab() {
  const { user } = useAuth();
  const isCodingDomain = user?.domain ? CODING_DOMAINS.includes(user.domain) : false;

  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [exercise, setExercise] = useState<{ problem: string; hints: string[]; solution: string; language: string } | null>(null);
  const [code, setCode] = useState('// Write your solution here\n\n');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [loadingExercise, setLoadingExercise] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Theory lab state
  const [userAnswer, setUserAnswer] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);

  useEffect(() => {
    getTopics()
      .then(data => setTopics(data.topics))
      .catch(err => setError(err.message));
  }, []);

  const loadExercise = async (topic: Topic) => {
    setSelectedTopic(topic);
    setLoadingExercise(true);
    setExercise(null);
    setOutput('');
    setShowSolution(false);
    setShowHint(false);
    setHintIndex(0);
    setShowTopicDropdown(false);
    setError(null);
    setUserAnswer('');
    setAnswerSubmitted(false);
    try {
      const data = await getPracticeExercise(topic.id);
      setExercise(data.exercise);
      setCode(`// ${topic.title} - Practice Exercise\n// Write your solution below\n\n`);
    } catch (err: any) {
      setError(err.message || 'Failed to load exercise');
    } finally {
      setLoadingExercise(false);
    }
  };

  const handleRun = () => {
    if (!code.trim() || code.trim() === '// Write your solution here\n\n') {
      setOutput('⚠️  Please write some code first!');
      return;
    }
    setIsRunning(true);
    setOutput('Running your code...\n');
    try {
      const logs: string[] = [];
      const fakeConsole = {
        log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
        error: (...args: any[]) => logs.push('ERROR: ' + args.join(' ')),
        warn: (...args: any[]) => logs.push('WARN: ' + args.join(' ')),
      };
      const fn = new Function('console', code);
      fn(fakeConsole);
      setTimeout(() => {
        setOutput(
          logs.length > 0
            ? `✅ Executed successfully!\n\nOutput:\n${logs.join('\n')}`
            : '✅ Code ran with no output.\n\nTip: Use console.log() to see output.'
        );
        setIsRunning(false);
      }, 600);
    } catch (err: any) {
      setTimeout(() => {
        setOutput(`❌ Runtime Error:\n${err.message}\n\nCheck your syntax and try again.`);
        setIsRunning(false);
      }, 400);
    }
  };

  const showNextHint = () => {
    setShowHint(true);
    setHintIndex(i => Math.min(i + 1, (exercise?.hints.length || 1) - 1));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">Practice Lab</h1>
          <p className="text-text-muted mt-1 text-sm">
            {isCodingDomain
              ? 'AI-generated coding exercises calibrated to your mastery level.'
              : 'AI-generated case studies and theory questions for your domain.'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-bold">
          {isCodingDomain ? <BrainCircuit size={17} /> : <Brain size={17} />}
          AI Assistant Active
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">{error}</div>
      )}

      {/* Topic selector */}
      <div className="card-bento p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Select Topic</span>
          {selectedTopic && (
            <button
              onClick={() => loadExercise(selectedTopic)}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80"
            >
              <RefreshCw size={13} />
              New Exercise
            </button>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowTopicDropdown(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-bg border border-border rounded-xl text-sm font-medium hover:border-primary/40 transition-colors"
          >
            <span className={selectedTopic ? 'text-text-main' : 'text-text-muted'}>
              {selectedTopic ? selectedTopic.title : 'Choose a topic to practice...'}
            </span>
            <ChevronDown size={16} className={cn('text-text-muted transition-transform', showTopicDropdown && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {showTopicDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto"
              >
                {topics.map(t => (
                  <button
                    key={t.id}
                    onClick={() => loadExercise(t)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg transition-colors text-left border-b border-border last:border-0"
                  >
                    <div>
                      <div className="text-sm font-medium text-text-main">{t.title}</div>
                      <div className="text-[10px] text-text-muted">Mastery: {t.mastery}%</div>
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full',
                      t.mastery >= 80 ? 'bg-emerald-100 text-emerald-700' :
                      t.mastery >= 60 ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    )}>
                      {t.mastery >= 80 ? 'Mastered' : t.mastery >= 60 ? 'Proficient' : 'Practice'}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {loadingExercise && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Generating AI exercise for your level...</p>
        </div>
      )}

      {/* ── CODING LAB (for technical domains) ── */}
      {exercise && selectedTopic && !loadingExercise && isCodingDomain && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: Problem */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card-bento">
              <h2 className="text-base font-bold mb-1">{selectedTopic.title}</h2>
              <span className="inline-block text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full mb-4 uppercase">
                Mastery {selectedTopic.mastery}%
              </span>
              <div className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{exercise.problem}</div>
            </div>

            {/* Hints */}
            <div className="card-bento bg-amber-50 border-amber-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb size={16} className="text-amber-500" />
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">AI Hints</span>
                </div>
                <button
                  onClick={showNextHint}
                  disabled={showHint && hintIndex >= (exercise.hints.length - 1)}
                  className="text-xs font-bold text-amber-600 hover:text-amber-800 disabled:opacity-40"
                >
                  {showHint ? (hintIndex < exercise.hints.length - 1 ? 'Next Hint' : 'No More') : 'Show Hint'}
                </button>
              </div>
              {showHint ? (
                <div className="space-y-2">
                  {exercise.hints.slice(0, hintIndex + 1).map((hint, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-amber-800">
                      <span className="font-bold shrink-0">{i + 1}.</span>
                      <span>{hint}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-600">Hints are hidden. Try solving first!</p>
              )}
            </div>

            {/* Solution reveal */}
            <div className="card-bento bg-slate-900 text-slate-300">
              <button
                onClick={() => setShowSolution(v => !v)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {showSolution ? <EyeOff size={15} /> : <Eye size={15} />}
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {showSolution ? 'Hide Solution' : 'Reveal Solution'}
                  </span>
                </div>
                <CheckCircle2 size={15} className="text-emerald-400" />
              </button>
              {showSolution && (
                <pre className="mt-4 text-xs text-slate-300 overflow-x-auto leading-relaxed">
                  {exercise.solution}
                </pre>
              )}
            </div>
          </div>

          {/* Right: Editor + Output */}
          <div className="lg:col-span-3 space-y-4">
            <div className="card-bento p-0 overflow-hidden border-2 border-slate-700 focus-within:border-primary transition-colors">
              <div className="bg-slate-800 px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <Code2 size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-400">solution.js</span>
                  </div>
                </div>
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="flex items-center gap-2 bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  <Play size={13} fill="currentColor" />
                  {isRunning ? 'Running...' : 'Run Code'}
                </button>
              </div>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full h-[360px] p-5 font-mono text-sm bg-slate-900 focus:outline-none resize-none text-emerald-300 leading-relaxed caret-white"
                spellCheck={false}
                placeholder="// Write your solution here"
                style={{ colorScheme: "dark" }}
              />
            </div>

            <div className="card-bento p-5 bg-slate-950 min-h-[120px]">
              <div className="flex items-center gap-2 mb-3">
                <Terminal size={14} className="text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Output Console</span>
              </div>
              <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {output || 'Click "Run Code" to execute...'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── THEORY LAB (for non-coding domains like Medicine, Finance, etc.) ── */}
      {exercise && selectedTopic && !loadingExercise && !isCodingDomain && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: Question + Hints */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card-bento">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={16} className="text-primary" />
                <h2 className="text-base font-bold">{selectedTopic.title}</h2>
              </div>
              <span className="inline-block text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full mb-4 uppercase">
                Mastery {selectedTopic.mastery}%
              </span>
              <div className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{exercise.problem}</div>
            </div>

            {/* Hints */}
            <div className="card-bento bg-amber-50 border-amber-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb size={16} className="text-amber-500" />
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Key Points</span>
                </div>
                <button
                  onClick={showNextHint}
                  disabled={showHint && hintIndex >= (exercise.hints.length - 1)}
                  className="text-xs font-bold text-amber-600 hover:text-amber-800 disabled:opacity-40"
                >
                  {showHint ? (hintIndex < exercise.hints.length - 1 ? 'Next Hint' : 'No More') : 'Show Hint'}
                </button>
              </div>
              {showHint ? (
                <div className="space-y-2">
                  {exercise.hints.slice(0, hintIndex + 1).map((hint, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-amber-800">
                      <span className="font-bold shrink-0">{i + 1}.</span>
                      <span>{hint}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-600">Try answering first, then reveal hints.</p>
              )}
            </div>
          </div>

          {/* Right: Written answer + Model answer */}
          <div className="lg:col-span-3 space-y-4">
            {/* Answer area */}
            <div className="card-bento p-0 overflow-hidden border-2 border-slate-700 focus-within:border-primary transition-colors">
              <div className="bg-slate-800 px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PenLine size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-400">Your Answer</span>
                </div>
                <button
                  onClick={() => setAnswerSubmitted(true)}
                  disabled={!userAnswer.trim() || answerSubmitted}
                  className="flex items-center gap-2 bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  <ListChecks size={13} />
                  {answerSubmitted ? 'Submitted ✓' : 'Submit Answer'}
                </button>
              </div>
              <textarea
                value={userAnswer}
                onChange={e => { setUserAnswer(e.target.value); setAnswerSubmitted(false); }}
                className="w-full h-[280px] p-5 text-sm bg-slate-900 focus:outline-none resize-none text-slate-100 leading-relaxed"
                placeholder="Write your answer here. Be thorough — explain your reasoning..."
              />
            </div>

            {/* Model answer (solution reveal) */}
            <div className="card-bento bg-slate-900 text-slate-300">
              <button
                onClick={() => setShowSolution(v => !v)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {showSolution ? <EyeOff size={15} /> : <Eye size={15} />}
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {showSolution ? 'Hide Model Answer' : 'Reveal Model Answer'}
                  </span>
                </div>
                <CheckCircle2 size={15} className="text-emerald-400" />
              </button>
              {showSolution && (
                <div className="mt-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {exercise.solution}
                </div>
              )}
            </div>

            {/* Self-assessment prompt (shown after submit) */}
            {answerSubmitted && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-bento border-emerald-200 bg-emerald-50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Self-Assessment</span>
                </div>
                <p className="text-sm text-emerald-800">
                  Great! Now reveal the model answer above and compare it with yours. Ask yourself:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-emerald-700 list-disc list-inside">
                  <li>Did you cover the key concepts?</li>
                  <li>Was your reasoning accurate?</li>
                  <li>What would you add or change?</li>
                </ul>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {!selectedTopic && !loadingExercise && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            {isCodingDomain ? <Code2 size={30} className="text-primary" /> : <BookOpen size={30} className="text-primary" />}
          </div>
          <h2 className="text-xl font-bold text-text-main mb-2">Choose a topic to begin</h2>
          <p className="text-text-muted text-sm max-w-md">
            {isCodingDomain
              ? 'Select a topic above. The AI will generate a personalized coding exercise based on your current mastery level.'
              : 'Select a topic above. The AI will generate a personalized case study or theory question based on your mastery level.'}
          </p>
        </div>
      )}
    </div>
  );
}
