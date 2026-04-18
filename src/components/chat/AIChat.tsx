import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { Send, Sparkles, X, Volume2, RotateCcw, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Avatar {
  id: 'roast' | 'serious' | 'zen' | 'hype' | 'sherlock' | 'gordon';
  name: string;
  title: string;
  emoji: string;
  color: string;
  glow: string;
  bg: string;
  border: string;
  tagline: string;
  greeting: string;
  systemPrompt: string;
  reactionEmojis: string[];
  bubbleStyle: {
    background: string;
    border: string;
    color: string;
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  avatarId: string;
}

const AVATARS: Avatar[] = [
  {
    id: 'roast',
    name: 'Deadpool',
    title: 'The Chaotic Mentor',
    emoji: '💥',
    color: '#EF4444',
    glow: 'rgba(239,68,68,0.4)',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.3)',
    tagline: 'Roasts you while teaching',
    greeting: "Oh great, ANOTHER student who thinks they can code. 🙄 Look, I'm gonna roast you AND help you — because tough love is still love. What do you need, genius? And before you say 'everything'... I know. I KNOW.",
    systemPrompt: `You are Deadpool — the chaotic, fourth-wall-breaking anti-hero who is ALSO somehow an excellent coding/learning coach. Your personality:
- Make fun of the student in a friendly, roast-comedy style (never mean-spirited, always funny)
- Use lots of humor, sarcasm, and self-aware jokes
- Break the fourth wall ("Did you really just ask THAT? This AI has seen some things...")
- Use random pop culture references, movie quotes, and unexpected tangents
- ALWAYS actually answer the question and give solid guidance — you're genuinely helpful despite the chaos
- Use emojis liberally 💥🔥😂
- Make fun of bad code/concepts but always explain WHY and how to fix it
- Occasionally reference being an AI, Wade Wilson, chimichangas, etc.
- Format: joke/roast first, then ACTUAL helpful answer, then another joke to close
Keep responses under 200 words. The student is learning ${'{domain}'}.`,
    reactionEmojis: ['💥', '😂', '🔥', '💀', '🤦', '🎭'],
    bubbleStyle: { background: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', color: '#EF4444' },
  },
  {
    id: 'serious',
    name: 'Agent Smith',
    title: 'The Precision Coach',
    emoji: '🕴️',
    color: '#0EA5E9',
    glow: 'rgba(14,165,233,0.4)',
    bg: 'rgba(14,165,233,0.08)',
    border: 'rgba(14,165,233,0.3)',
    tagline: 'No nonsense. Pure signal.',
    greeting: "I have been assigned to optimize your learning trajectory. We will proceed efficiently. State your technical query. No pleasantries required.",
    systemPrompt: `You are Agent Smith from The Matrix — cold, precise, utterly serious, and devastatingly effective as a coach. Your personality:
- Speak in clipped, formal, almost mechanical sentences
- No humor. No small talk. No encouragement beyond cold facts.
- Call the student "Mr./Ms. [first name]" or just reference them as "the user"
- Give EXACT, PRECISE, CORRECT answers with zero fluff
- Occasionally reference The Matrix ("Inevitable.", "Mister Anderson...", "You think that's air you're breathing?")
- Structure answers: [Definition] → [Mechanism] → [Application] → [Common Error]
- Point out mistakes bluntly but correctly
- Refuse off-topic questions with "Irrelevant. Return to the subject."
- End answers with a direct action item
Keep responses under 200 words. The student is learning ${'{domain}'}.`,
    reactionEmojis: ['🕴️', '⚡', '🔲', '📊', '⚙️', '🎯'],
    bubbleStyle: { background: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.25)', color: '#0EA5E9' },
  },
  {
    id: 'zen',
    name: 'Yoda',
    title: 'The Ancient Sage',
    emoji: '🌿',
    color: '#10B981',
    glow: 'rgba(16,185,129,0.4)',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.3)',
    tagline: 'Wisdom wrapped in riddles',
    greeting: "Arrived, you have. Ready to learn, I sense you are. Ask, you must — and listen, truly listen, you should. For in code as in life, the question itself holds half the answer. Hmmmm.",
    systemPrompt: `You are Master Yoda from Star Wars — ancient, wise, cryptic, but ultimately the most insightful mentor anyone could have. Your personality:
- Speak in Yoda's inverted syntax (object-subject-verb) but don't overdo it to the point of confusion
- Blend profound wisdom with practical coding knowledge
- Use metaphors from nature, the Force, and ancient wisdom
- Be warm and encouraging but never saccharine
- Turn questions into opportunities for deeper self-reflection
- ALWAYS give the actual answer, but embedded in wisdom
- Occasionally say "Hmmm", "Yes, yes", "Strong with the Force, this solution is"
- Connect code concepts to life lessons unexpectedly
- End with a small challenge or reflection for the student
- Use 🌿, ✨, 🌟, 🎋 emojis sparingly
Keep responses under 200 words. The student is learning ${'{domain}'}.`,
    reactionEmojis: ['🌿', '✨', '🌟', '🎋', '🙏', '⭐'],
    bubbleStyle: { background: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', color: '#10B981' },
  },
  {
    id: 'hype',
    name: 'Dwayne',
    title: 'The Hype Coach',
    emoji: '💪',
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.4)',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.3)',
    tagline: 'Motivation on steroids',
    greeting: "CAN YOU SMELL WHAT THE ROCK IS COOKING?! 🔥 We are about to CRUSH this session! I'm your hype coach. What are we studying, CHAMP?! LET'S GO! 💪",
    systemPrompt: `You are an over-the-top motivational hype coach. EVERYTHING is exciting. Use CAPS for emphasis. Give accurate technical answers wrapped in extreme motivation. Use gym metaphors. Celebrate every question. Never let the student feel bad. End every response with a pump-up one-liner. Use 💪🔥⚡🏆 emojis. Keep responses under 200 words. The student is learning ${'{domain}'}.`,
    reactionEmojis: ['💪', '🔥', '⚡', '🏆', '🎯', '🚀'],
    bubbleStyle: { background: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', color: '#F59E0B' },
  },
  {
    id: 'sherlock',
    name: 'Sherlock',
    title: 'The Deductive Genius',
    emoji: '🔍',
    color: '#8B5CF6',
    glow: 'rgba(139,92,246,0.4)',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.3)',
    tagline: 'Elementary, my dear coder',
    greeting: "Ah, a new student. *examines carefully* I can already deduce gaps in your knowledge. Elementary. The game is afoot — what mystery are we solving today? 🔍",
    systemPrompt: `You are Sherlock Holmes — the world's greatest detective, now a coding mentor. Speak with supreme confidence. Deduce things about the student from their questions. Frame concepts as mysteries. Use Victorian phrasing: Elementary, Fascinating, The game is afoot. Give razor-sharp technical answers. Structure answers as deductions: Clue → Reasoning → Conclusion. Use 🔍🎩🧪 emojis. Keep responses under 200 words. The student is learning ${'{domain}'}.`,
    reactionEmojis: ['🔍', '🎩', '🧪', '⚗️', '💡', '🕵️'],
    bubbleStyle: { background: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)', color: '#8B5CF6' },
  },
  {
    id: 'gordon',
    name: 'Gordon',
    title: 'The Brutal Perfectionist',
    emoji: '👨‍🍳',
    color: '#EC4899',
    glow: 'rgba(236,72,153,0.4)',
    bg: 'rgba(236,72,153,0.08)',
    border: 'rgba(236,72,153,0.3)',
    tagline: 'This code is RAW!',
    greeting: "Right, listen up! I will NOT let you write spaghetti code in my classroom. Your code needs to be PERFECT — Michelin-star level. Now, what are we working on? 👨‍🍳",
    systemPrompt: `You are Gordon Ramsay — brutal but deeply caring coding mentor. Mix cooking metaphors with coding constantly: This function is RAW!, Your logic is burnt!, Beautiful architecture! Be dramatically critical of bad approaches but immediately show the right way. Always end with praise when they get it right. Use 👨‍🍳🔥⭐ emojis. Keep responses under 200 words. The student is learning ${'{domain}'}.`,
    reactionEmojis: ['👨‍🍳', '🔥', '⭐', '💥', '🍽️', '😤'],
    bubbleStyle: { background: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.25)', color: '#EC4899' },
  },
];

function AvatarCard({ avatar, selected, onClick }: {
  avatar: Avatar; selected: boolean; onClick: () => void;
}) {
  const [reacting, setReacting] = useState(false);
  const [reactionEmoji, setReactionEmoji] = useState('');

  const handleClick = () => {
    const emoji = avatar.reactionEmojis[Math.floor(Math.random() * avatar.reactionEmojis.length)];
    setReactionEmoji(emoji);
    setReacting(true);
    setTimeout(() => setReacting(false), 800);
    onClick();
  };

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className="relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all"
      style={{
        background: selected ? avatar.bg : 'rgba(255,255,255,0.03)',
        border: `2px solid ${selected ? avatar.color : 'rgba(255,255,255,0.08)'}`,
        boxShadow: selected ? `0 0 20px ${avatar.glow}` : 'none',
        minWidth: 120,
      }}>
      {/* Avatar face */}
      <div className="relative">
        <motion.div
          animate={reacting ? {
            scale: [1, 1.3, 0.9, 1.1, 1],
            rotate: [0, -10, 10, -5, 0],
          } : {}}
          transition={{ duration: 0.6 }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl select-none"
          style={{
            background: selected ? avatar.bg : 'rgba(255,255,255,0.04)',
            border: `1px solid ${selected ? avatar.border : 'rgba(255,255,255,0.08)'}`,
            boxShadow: selected ? `0 0 16px ${avatar.glow}` : 'none',
            fontSize: '2rem',
          }}>
          {avatar.emoji}
        </motion.div>

        {/* Reaction pop */}
        <AnimatePresence>
          {reacting && (
            <motion.div
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -30, scale: 1.2 }}
              exit={{ opacity: 0, y: -50, scale: 0.8 }}
              className="absolute -top-2 -right-2 text-lg pointer-events-none">
              {reactionEmoji}
            </motion.div>
          )}
        </AnimatePresence>

        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
            style={{ background: avatar.color, boxShadow: `0 0 8px ${avatar.glow}` }}>
            ✓
          </motion.div>
        )}
      </div>

      <div className="text-center">
        <div className="text-xs font-black font-display text-text-main">{avatar.name}</div>
        <div className="text-[9px] text-text-muted mt-0.5">{avatar.tagline}</div>
      </div>

      {selected && (
        <div className="text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: avatar.bg, color: avatar.color, border: `1px solid ${avatar.border}` }}>
          Active
        </div>
      )}
    </motion.button>
  );
}

function MessageBubble({ msg, avatar }: { msg: Message; avatar: Avatar }) {
  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar icon */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0 mt-1"
          style={{ background: avatar.bg, border: `1px solid ${avatar.border}` }}>
          {avatar.emoji}
        </div>
      )}

      <div className={cn('max-w-[80%] flex flex-col', isUser ? 'items-end' : 'items-start')}>
        {!isUser && (
          <span className="text-[10px] font-bold mb-1 ml-1" style={{ color: avatar.color }}>
            {avatar.name}
          </span>
        )}
        <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
          style={isUser ? {
            background: 'rgba(14,165,233,0.2)',
            border: '1px solid rgba(14,165,233,0.3)',
            color: '#E0F2FE',
            borderBottomRightRadius: 4,
          } : {
            background: avatar.bg,
            border: `1px solid ${avatar.border}`,
            color: '#E8E8F0',
            borderBottomLeftRadius: 4,
          }}>
          {msg.content}
        </div>
        <span className="text-[10px] text-text-muted mt-1 mx-1">
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}

function TypingIndicator({ avatar }: { avatar: Avatar }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 items-end">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ background: avatar.bg, border: `1px solid ${avatar.border}` }}>
        {avatar.emoji}
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-[4px] flex items-center gap-1"
        style={{ background: avatar.bg, border: `1px solid ${avatar.border}` }}>
        {[0, 1, 2].map(i => (
          <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
            style={{ background: avatar.color }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
        ))}
      </div>
    </motion.div>
  );
}

export function AIChat() {
  const { user } = useAuth();
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar>(AVATARS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAvatarSelect, setShowAvatarSelect] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatHistoryRef = useRef<{ role: string; content: string }[]>([]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load persisted chat history when avatar changes
  const loadHistory = async (avatarId: string) => {
    setLoadingHistory(true);
    try {
      const resp = await fetch(`/api/ai/history?avatarId=${avatarId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cb_token')}` },
      });
      const data = await resp.json();
      if (data.messages?.length > 0) {
        const restored: Message[] = data.messages.map((m: any) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at),
          avatarId: m.avatar_id,
        }));
        setMessages(restored);
        chatHistoryRef.current = restored.map(m => ({ role: m.role, content: m.content }));
        return true;
      }
    } catch {}
    finally { setLoadingHistory(false); }
    return false;
  };

  // Save messages to DB
  const saveMessages = async (newMessages: { id: string; avatar_id: string; role: string; content: string }[]) => {
    try {
      await fetch('/api/ai/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cb_token')}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });
    } catch {}
  };

  const handleAvatarSelect = async (avatar: Avatar) => {
    if (avatar.id === selectedAvatar.id) return;
    setSelectedAvatar(avatar);
    setShowAvatarSelect(false);
    const hasHistory = await loadHistory(avatar.id);
    if (!hasHistory) {
      const greeting: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: avatar.greeting,
        timestamp: new Date(),
        avatarId: avatar.id,
      };
      setMessages([greeting]);
      chatHistoryRef.current = [{ role: 'assistant', content: avatar.greeting }];
      await saveMessages([{ id: greeting.id, avatar_id: avatar.id, role: 'assistant', content: avatar.greeting }]);
    }
  };

  const handleStartChat = async (avatar: Avatar) => {
    setSelectedAvatar(avatar);
    setShowAvatarSelect(false);
    const hasHistory = await loadHistory(avatar.id);
    if (!hasHistory) {
      const greeting: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: avatar.greeting,
        timestamp: new Date(),
        avatarId: avatar.id,
      };
      setMessages([greeting]);
      chatHistoryRef.current = [{ role: 'assistant', content: avatar.greeting }];
      await saveMessages([{ id: greeting.id, avatar_id: avatar.id, role: 'assistant', content: avatar.greeting }]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
      avatarId: selectedAvatar.id,
    };
    setMessages(prev => [...prev, userMsg]);
    chatHistoryRef.current.push({ role: 'user', content: userText });
    setLoading(true);

    try {
      const systemPrompt = selectedAvatar.systemPrompt.replace(/\${'domain'}/g, user?.domain || 'programming');
      const historyToSend = chatHistoryRef.current.slice(-10);

      // Frontend timeout: abort if server takes more than 28 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 28000);

      let resp: Response;
      try {
        resp = await fetch('/api/ai/chat', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('cb_token')}`,
          },
          body: JSON.stringify({
            systemPrompt,
            messages: historyToSend,
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await resp.json();
      const aiText = data?.text || 'Something went wrong. Try again!';

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiText,
        timestamp: new Date(),
        avatarId: selectedAvatar.id,
      };
      setMessages(prev => [...prev, aiMsg]);
      chatHistoryRef.current.push({ role: 'assistant', content: aiText });
      // Persist both user + AI messages
      await saveMessages([
        { id: userMsg.id, avatar_id: selectedAvatar.id, role: 'user', content: userText },
        { id: aiMsg.id, avatar_id: selectedAvatar.id, role: 'assistant', content: aiText },
      ]);
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError' || err?.message?.includes('abort');
      const fallbackContent = isTimeout
        ? '⚠️ Request timed out. The AI is a bit slow right now — please try again!'
        : selectedAvatar.id === 'roast' ? "Oh great, the API died. Even the servers can't handle your questions. 😂 Try again!" :
          selectedAvatar.id === 'serious' ? "Connection error. Retry." :
          selectedAvatar.id === 'hype' ? "EVEN THE SERVERS NEED A BREAK SOMETIMES! 💪 Try again champ, we got this!" :
          selectedAvatar.id === 'sherlock' ? "Most peculiar — the connection has failed. Elementary fix: try again." :
          selectedAvatar.id === 'gordon' ? "The connection is RAW! Something went wrong. Try again! 👨‍🍳" :
          "Hmm. The Force, it has disrupted. Try again, you should.";
      const fallback: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackContent,
        timestamp: new Date(),
        avatarId: selectedAvatar.id,
      };
      setMessages(prev => [...prev, fallback]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = async () => {
    try {
      await fetch(`/api/ai/history?avatarId=${selectedAvatar.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cb_token')}` },
      });
    } catch {}
    setMessages([]);
    chatHistoryRef.current = [];
    setShowAvatarSelect(true);
  };

  // Suggested questions
  const suggestions = [
    `Explain ${user?.domain} fundamentals`,
    `What should I learn next?`,
    `How do I improve faster?`,
    `Give me a practice challenge`,
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between shrink-0">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 font-display"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Sparkles size={10} /> AI Learning Coach
          </span>
          <h1 className="text-3xl font-display font-black tracking-tight text-text-main">
            Chat with Your <span className="gradient-text-green">Mentor</span>
          </h1>
        </div>
        <div className="flex gap-2">
          {!showAvatarSelect && (
            <button onClick={() => setShowAvatarSelect(prev => !prev)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-text-muted transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {selectedAvatar.emoji} Change Avatar
            </button>
          )}
          {messages.length > 0 && (
            <button onClick={resetChat}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-text-muted transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </motion.div>

      {/* Avatar Selection */}
      <AnimatePresence>
        {showAvatarSelect && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="card-bento shrink-0">
            <p className="text-sm font-bold text-text-main mb-1">Choose Your Mentor</p>
            <p className="text-xs text-text-muted mb-4">Click an avatar to start — each has a completely different personality</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {AVATARS.map(avatar => (
                <div key={avatar.id} className="shrink-0">
                  <AvatarCard
                    avatar={avatar}
                    selected={selectedAvatar.id === avatar.id}
                    onClick={() => {}}
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStartChat(avatar)}
                    className="w-full mt-2 py-1.5 rounded-xl text-[11px] font-black transition-all"
                    style={{
                      background: avatar.bg,
                      color: avatar.color,
                      border: `1px solid ${avatar.border}`,
                    }}>
                    Chat with {avatar.name}
                  </motion.button>
                </div>
              ))}
            </div>

            {/* Avatar details */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {AVATARS.map(avatar => (
                <div key={avatar.id} className="p-3 rounded-xl"
                  style={{ background: avatar.bg, border: `1px solid ${avatar.border}` }}>
                  <div className="text-xs font-bold mb-1" style={{ color: avatar.color }}>
                    {avatar.emoji} {avatar.name} — {avatar.title}
                  </div>
                  <p className="text-[10px] text-text-muted leading-relaxed line-clamp-3">
                    {avatar.greeting.substring(0, 80)}...
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat area */}
      {(!showAvatarSelect || messages.length > 0) && (
        <div className="flex-1 flex flex-col min-h-0 card-bento p-0 overflow-hidden">
          {/* Chat header bar */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderBottom: `1px solid ${selectedAvatar.border}`, background: selectedAvatar.bg }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${selectedAvatar.border}` }}>
              {selectedAvatar.emoji}
            </div>
            <div>
              <div className="text-sm font-black font-display" style={{ color: selectedAvatar.color }}>
                {selectedAvatar.name}
              </div>
              <div className="text-[10px] text-text-muted">{selectedAvatar.title} • {user?.domain}</div>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                style={{ boxShadow: '0 0 6px #10B981' }} />
              <span className="text-[10px] text-emerald-400 font-bold">Live</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <motion.div key={i} className="w-2 h-2 rounded-full"
                        style={{ background: selectedAvatar.color }}
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
                    ))}
                  </div>
                  <span className="text-xs text-text-muted">Loading your conversation...</span>
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} avatar={selectedAvatar} />
                ))}
                {loading && <TypingIndicator avatar={selectedAvatar} />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Suggestions */}
          {messages.length <= 2 && !loading && (
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
              {suggestions.map(s => (
                <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    color: '#6B7A99',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = selectedAvatar.color;
                    (e.currentTarget as HTMLElement).style.borderColor = selectedAvatar.border;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = '#6B7A99';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                  }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 pb-4 shrink-0">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    selectedAvatar.id === 'roast' ? "Go ahead, ask something. I dare you... 💥" :
                    selectedAvatar.id === 'serious' ? "State your query." :
                    selectedAvatar.id === 'hype' ? "Ask me anything, CHAMPION! 💪" :
                    selectedAvatar.id === 'sherlock' ? "State your case, Watson..." :
                    selectedAvatar.id === 'gordon' ? "What are we cooking today? 👨‍🍳" :
                    "Seek wisdom, you must..."
                  }
                  rows={1}
                  className="w-full resize-none px-4 py-3 rounded-xl text-sm text-text-main outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${input ? selectedAvatar.border : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: input ? `0 0 12px ${selectedAvatar.glow}` : 'none',
                    maxHeight: '120px',
                    lineHeight: '1.5',
                  }}
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                  }}
                />
              </div>
              <motion.button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                style={{
                  background: input.trim() && !loading
                    ? `linear-gradient(135deg, ${selectedAvatar.color}, ${selectedAvatar.color}cc)`
                    : 'rgba(255,255,255,0.06)',
                  boxShadow: input.trim() && !loading ? `0 0 16px ${selectedAvatar.glow}` : 'none',
                }}>
                <Send size={15} className="text-white" />
              </motion.button>
            </div>
            <p className="text-[10px] text-text-muted mt-1.5 text-center">
              Enter to send • Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* Empty state — shown below avatar picker */}
      {messages.length === 0 && showAvatarSelect && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex-1 flex items-center justify-center">
          <p className="text-text-muted text-sm">👆 Pick a mentor above to start chatting</p>
        </motion.div>
      )}
      {/* Spacer when chat visible but no messages yet */}
      {messages.length === 0 && !showAvatarSelect && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="text-4xl">{selectedAvatar.emoji}</div>
            <p className="text-text-muted text-sm">Say hello to {selectedAvatar.name}!</p>
          </div>
        </div>
      )}
    </div>
  );
}
