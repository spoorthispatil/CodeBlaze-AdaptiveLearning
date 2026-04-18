import { User, Topic, Question, KnowledgeGraphData, AnalyticsData } from '../types';

const API_BASE = '/api';

// Token management
export function getToken(): string | null {
  return localStorage.getItem('cb_token');
}

export function setToken(token: string): void {
  localStorage.setItem('cb_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('cb_token');
  localStorage.removeItem('cb_user');
}

function getHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...getHeaders(), ...options?.headers },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `API error ${res.status}`);
  }
  return data as T;
}

// Auth
export async function register(email: string, password: string, displayName: string): Promise<{ token: string; user: User }> {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getProfile(): Promise<User> {
  return apiFetch('/auth/me');
}

export async function updateProfile(data: { displayName?: string; domain?: string }): Promise<void> {
  return apiFetch('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Learning
export async function getTopics(domain?: string): Promise<{ topics: Topic[]; domain: string }> {
  const q = domain ? `?domain=${domain}` : '';
  return apiFetch(`/learning/topics${q}`);
}

export async function getDomains(): Promise<{ domains: { id: string; label: string; description: string; icon: string }[] }> {
  return apiFetch('/learning/domains');
}

export async function getKnowledgeGraph(): Promise<KnowledgeGraphData> {
  return apiFetch('/learning/knowledge-graph');
}

export async function getLearningPath(): Promise<{
  recommendations: { topicId: string; topicTitle: string; reason: string; priority: number }[];
  stats: { avgMastery: number; atRiskCount: number; masteredCount: number; totalTopics: number };
}> {
  return apiFetch('/learning/learning-path');
}

export async function getPracticeExercise(topicId: string): Promise<{
  exercise: { problem: string; hints: string[]; solution: string; language: string };
  topic: { id: string; title: string };
}> {
  return apiFetch(`/learning/practice/${topicId}`);
}

export async function getAnalytics(): Promise<AnalyticsData> {
  return apiFetch('/learning/analytics');
}

// Quiz
export async function getDiagnosticQuestions(): Promise<{ questions: Question[]; domain: string }> {
  return apiFetch('/quiz/diagnostic');
}

export async function getTopicQuestions(topicId: string): Promise<{
  questions: Question[];
  topic: { id: string; title: string; domain: string };
  currentMastery: number;
}> {
  return apiFetch(`/quiz/topic/${topicId}`);
}

export async function submitQuiz(data: {
  topicId?: string;
  answers: Record<string, { topicId?: string; selectedAnswer: string; correctAnswer: string; isCorrect: boolean }>;
  isDiagnostic?: boolean;
  timeTaken: number;
}): Promise<{ success: boolean; score: number; correctCount: number; totalQuestions: number; newMastery?: number }> {
  return apiFetch('/quiz/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getQuizHistory(): Promise<{
  attempts: {
    id: string; topic_title: string; score: number; total_questions: number;
    is_diagnostic: number; created_at: string; time_taken: number;
  }[];
}> {
  return apiFetch('/quiz/history');
}
