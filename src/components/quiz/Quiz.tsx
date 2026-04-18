import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, XCircle, ArrowRight, BrainCircuit,
  Timer, Trophy, BarChart2, Home
} from 'lucide-react';
import { getDiagnosticQuestions, getTopicQuestions, submitQuiz } from '../../services/api';
import { Question, QuizAnswer } from '../../types';

interface QuizProps { diagnostic?: boolean; }

type Screen = 'loading' | 'error' | 'empty' | 'quiz' | 'results';

export function Quiz({ diagnostic }: QuizProps) {
  const { topicId } = useParams();
  const navigate = useNavigate();

  // ── ALL hooks declared unconditionally at the top ──
  const mountedRef = useRef(true);
  const [screen, setScreen] = useState<Screen>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topicTitle, setTopicTitle] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; correctCount: number; totalQuestions: number; newMastery?: number } | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Timer — always runs
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (mountedRef.current && screen === 'quiz') {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, screen]);

  // Load questions — always runs
  useEffect(() => {
    let cancelled = false;
    setScreen('loading');
    setErrorMsg('');

    const load = async () => {
      try {
        if (diagnostic) {
          const data = await getDiagnosticQuestions();
          if (!cancelled) {
            setQuestions(data.questions);
            setTopicTitle(`${data.domain} Diagnostic`);
            setScreen(data.questions.length > 0 ? 'quiz' : 'empty');
          }
        } else if (topicId) {
          const data = await getTopicQuestions(topicId);
          if (!cancelled) {
            setQuestions(data.questions);
            setTopicTitle(data.topic.title);
            setScreen(data.questions.length > 0 ? 'quiz' : 'empty');
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err.message || 'Failed to load questions');
          setScreen('error');
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [diagnostic, topicId]);

  // handleAnswer — always declared
  const handleAnswer = useCallback((answer: string) => {
    setQuestions(qs => {
      const q = qs[currentIndex];
      if (!q) return qs;
      const isCorrect = answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      setSelectedAnswer(answer);
      setShowFeedback(true);
      setAnswers(prev => ({
        ...prev,
        [q.id]: { questionId: q.id, topicId: q.topicId, selectedAnswer: answer, correctAnswer: q.correctAnswer, isCorrect }
      }));
      return qs;
    });
  }, [currentIndex]);

  const nextQuestion = useCallback(() => {
    setCurrentIndex(i => {
      if (i < questions.length - 1) {
        setSelectedAnswer(null);
        setShowFeedback(false);
        return i + 1;
      }
      return i;
    });
  }, [questions.length]);

  const handleFinish = useCallback(async () => {
    setSubmitting(true);
    try {
      const finalAnswers: Record<string, any> = { ...answers };
      const lastQ = questions[currentIndex];
      if (lastQ && selectedAnswer && !finalAnswers[lastQ.id]) {
        finalAnswers[lastQ.id] = {
          topicId: lastQ.topicId, selectedAnswer,
          correctAnswer: lastQ.correctAnswer,
          isCorrect: selectedAnswer.trim().toLowerCase() === lastQ.correctAnswer.trim().toLowerCase()
        };
      }
      const res = await submitQuiz({
        topicId: diagnostic ? undefined : topicId,
        answers: finalAnswers, isDiagnostic: diagnostic,
        timeTaken: elapsedSeconds
      });
      if (mountedRef.current) {
        setResult(res);
        setScreen('results');
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setErrorMsg(err.message || 'Submission failed');
        setScreen('error');
      }
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }, [answers, questions, currentIndex, selectedAnswer, diagnostic, topicId, elapsedSeconds]);

  const handleNextOrFinish = useCallback(() => {
    if (currentIndex === questions.length - 1) {
      handleFinish();
    } else {
      nextQuestion();
    }
  }, [currentIndex, questions.length, handleFinish, nextQuestion]);

  const handleGoHome = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Single render return — no conditional hooks above this line ──

  if (screen === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'rgba(14,165,233,0.3)', borderTopColor: '#0EA5E9' }} />
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-text-main">Generating 20 adaptive questions...</p>
          <p className="text-text-muted text-sm mt-1">AI is calibrating difficulty to your mastery level</p>
        </div>
      </div>
    );
  }

  if (screen === 'error') {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <BrainCircuit size={32} className="text-red-400" />
        </div>
        <h2 className="text-xl font-display font-bold mb-2">Something went wrong</h2>
        <p className="text-text-muted mb-6 text-sm">{errorMsg}</p>
        <button onClick={handleGoHome} className="btn-primary px-8 py-3 text-sm">Back to Dashboard</button>
      </div>
    );
  }

  if (screen === 'empty') {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <BrainCircuit size={32} style={{ color: '#F59E0B' }} />
        </div>
        <h2 className="text-xl font-display font-bold mb-2">No questions generated</h2>
        <p className="text-text-muted mb-6 text-sm">Make sure GEMINI_API_KEY is set in your .env file.</p>
        <button onClick={handleGoHome} className="btn-primary px-8 py-3 text-sm">Back to Dashboard</button>
      </div>
    );
  }

  if (screen === 'results') {
    const score = result?.score || 0;
    const correct = result?.correctCount || 0;
    const total = result?.totalQuestions || 0;
    const scoreColor = score >= 80 ? '#34D399' : score >= 60 ? '#38BDF8' : '#FCD34D';
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto py-10">
        <div className="card-bento p-10 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{
              background: score >= 70 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${score >= 70 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
              boxShadow: `0 0 28px ${score >= 70 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`
            }}>
            <Trophy size={36} style={{ color: scoreColor }} />
          </div>

          <h1 className="text-3xl font-display font-black mb-2" style={{ color: scoreColor }}>
            {score >= 80 ? 'Excellent!' : score >= 60 ? 'Good Work!' : 'Keep Practicing!'}
          </h1>
          <p className="text-text-muted mb-8 text-sm">
            Mastery updated to{' '}
            <span className="font-bold" style={{ color: scoreColor }}>{result?.newMastery ?? score}%</span>
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Score', value: `${score}%` },
              { label: 'Correct', value: `${correct}/${total}` },
              { label: 'Time', value: formatTime(elapsedSeconds) },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl p-4"
                style={{ background: 'rgba(5,11,15,0.7)', border: '1px solid rgba(14,165,233,0.12)' }}>
                <div className="text-2xl font-display font-black gradient-text">{stat.value}</div>
                <div className="text-[10px] text-text-muted uppercase font-bold mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="text-left mb-8">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Question Review</div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {questions.map((q, i) => {
                const a = answers[q.id];
                const isCorrect = a?.isCorrect ?? false;
                return (
                  <div key={q.id} className="flex items-start gap-2 p-3 rounded-xl text-xs"
                    style={{
                      background: isCorrect ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                      border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}`
                    }}>
                    {isCorrect
                      ? <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                      : <XCircle size={13} className="text-red-400 mt-0.5 shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium text-text-main line-clamp-1">Q{i + 1}: {q.text}</div>
                      {!isCorrect && (
                        <div className="mt-0.5 text-text-muted truncate">✓ {q.correctAnswer}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleGoHome}
              className="flex-1 py-3 rounded-xl font-display font-bold text-sm transition-all flex items-center justify-center gap-2"
              style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)', color: '#7DD3FC' }}>
              <Home size={15} /> Dashboard
            </button>
            <button onClick={() => window.location.reload()}
              className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2">
              <BarChart2 size={15} /> Retry Quiz
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Active quiz screen ──
  const q = questions[currentIndex];
  if (!q) return null;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider font-display">
            Question {currentIndex + 1} of {questions.length}
          </div>
          <div className="text-sm font-display font-bold text-text-main mt-0.5">{topicTitle}</div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)' }}>
          <Timer size={14} style={{ color: '#38BDF8' }} />
          <span className="font-mono font-bold text-sm" style={{ color: '#7DD3FC' }}>{formatTime(elapsedSeconds)}</span>
        </div>
      </div>

      <div className="w-full h-1.5 rounded-full mb-7 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
          className="h-full rounded-full progress-bar-inner"
          style={{ background: 'linear-gradient(90deg, #0EA5E9, #38BDF8)', boxShadow: '0 0 8px rgba(14,165,233,0.6)' }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="card-bento p-8">

          <div className="flex items-center gap-2 mb-5">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg font-display"
              style={{ background: 'rgba(14,165,233,0.10)', color: '#38BDF8', border: '1px solid rgba(14,165,233,0.18)' }}>
              Level {q.difficulty}/10
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg font-display"
              style={{ background: 'rgba(245,158,11,0.08)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.15)' }}>
              {Math.round(progress)}% done
            </span>
          </div>

          <h2 className="text-xl font-display font-bold text-text-main mb-7 leading-snug">{q.text}</h2>

          {q.options && (
            <div className="space-y-3">
              {q.options.map((opt, idx) => {
                const isSelected = selectedAnswer === opt;
                const isCorrect = opt === q.correctAnswer;
                const showCorrect = showFeedback && isCorrect;
                const showWrong = showFeedback && isSelected && !isCorrect;
                return (
                  <button key={idx} disabled={showFeedback} onClick={() => handleAnswer(opt)}
                    style={
                      showCorrect ? { border: '1.5px solid #34D399', background: 'rgba(16,185,129,0.08)', boxShadow: '0 0 12px rgba(16,185,129,0.15)' } :
                      showWrong   ? { border: '1.5px solid #EF4444', background: 'rgba(239,68,68,0.08)' } :
                      isSelected  ? { border: '1.5px solid #0EA5E9', background: 'rgba(14,165,233,0.08)' } :
                                    { border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,11,15,0.5)' }
                    }
                    className="w-full p-4 rounded-xl text-left transition-all flex items-center justify-between hover:border-sky-400/40">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 font-display"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#5A7080' }}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-medium text-sm">{opt}</span>
                    </div>
                    {showCorrect && <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />}
                    {showWrong   && <XCircle size={18} className="text-red-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {showFeedback && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-5 rounded-xl"
              style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.14)' }}>
              <div className="flex items-center gap-2 mb-2">
                <BrainCircuit size={15} style={{ color: '#38BDF8' }} />
                <span className="text-[10px] font-black uppercase tracking-wider font-display" style={{ color: '#38BDF8' }}>
                  AI Explanation
                </span>
              </div>
              <p className="text-sm text-text-main leading-relaxed">{q.explanation}</p>
              <button onClick={handleNextOrFinish} disabled={submitting}
                className="btn-primary mt-5 w-full py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {submitting
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <>{currentIndex === questions.length - 1 ? 'Finish & Get Results' : 'Next Question'}<ArrowRight size={16} /></>
                }
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
