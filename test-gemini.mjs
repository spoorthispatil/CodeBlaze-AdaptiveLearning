import { GoogleGenerativeAI } from '@google/generative-ai';

// Simulate exactly what the backend does
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) { console.log("No key"); process.exit(1); }

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// This is exactly what gets sent from the frontend on FIRST message:
// chatHistoryRef starts as: [{role:'assistant', greeting}]
// Then user pushes: [{role:'assistant', greeting}, {role:'user', 'What should I learn next?'}]
// historyToSend = that whole array
// Backend rawHistory = all but last = [{role:'model', greeting}]
// after stripping leading model = []
// lastMsg = {role:'user', 'What should I learn next?'}

const systemPrompt = `You are Agent Smith. The student is learning ${'domain'}.`;

console.log("systemPrompt:", systemPrompt);

// Test 1: empty history (what our fix produces)
try {
  const chat = model.startChat({ systemInstruction: systemPrompt, history: [] });
  const result = await chat.sendMessage("What should I learn next?");
  console.log("✅ Empty history works:", result.response.text().substring(0, 100));
} catch(e) {
  console.log("❌ Empty history error:", e.message);
}
