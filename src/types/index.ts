export type Domain = 'DSA' | 'ML' | 'WebDev' | 'SystemDesign' | 'CloudComputing' | 'DataScience' | 'CyberSecurity' | 'ProductManagement' | 'BusinessAnalytics' | 'DigitalMarketing' | 'UXDesign' | 'Finance' | 'Psychology' | 'Medicine';

export interface User {
  id: string;
  email: string;
  displayName: string;
  domain: Domain | null;
  onboarded: boolean;
  learningStreak: number;
  mastery: Record<string, number>;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  domain: Domain;
  prerequisites: string[];
  difficultyLevel: number;
  orderIndex: number;
  mastery: number;
  attempts: number;
  lastUpdated?: string;
}

export interface Question {
  id: string;
  topicId: string;
  type: 'MCQ' | 'ShortAnswer';
  difficulty: number;
  text: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizAnswer {
  questionId: string;
  topicId: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface KnowledgeGraphData {
  nodes: { id: string; label: string; mastery: number; difficulty: number }[];
  links: { source: string; target: string }[];
  domain: Domain;
}

export interface AnalyticsData {
  quizHistory: { date: string; avg_score: number; quiz_count: number }[];
  topicMastery: { title: string; difficulty_level: number; mastery: number }[];
  stats: {
    totalQuizzes: number;
    avgScore: number;
    bestScore: number;
    totalTimeMinutes: number;
    learningStreak: number;
  };
  weakAreas: { title: string; id: string; mastery: number }[];
  predictedCompletion: string;
  masteredCount: number;
  totalTopics: number;
}
