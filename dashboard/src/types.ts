export type Understanding = "understood" | "partial" | "copied_blindly" | "unknown";

export interface Tag {
  name: string;
  url?: string;
}

export interface ReviewQuestion {
  id: string;
  question: string;
  expectedAnswer: string;
  userAnswer?: string;
  status: "unanswered" | "answered" | "skipped";
}

export interface DashboardLesson {
  id: string;
  createdAt: string;
  tool: string;
  title: string;
  originalPrompt: string;
  problem: string;
  mistake: string;
  rootCause: string;
  fixSummary: string;
  takeaway?: string;
  mistakePattern?: string;
  whenNotApplicable?: string;
  concepts: string[];
  filesChanged: string[];
  tags: Tag[];
  codeExample?: string;
  badCodeExample?: string;
  goodCodeExample?: string;
  codeExplanation?: string;
  reviewQuestions: ReviewQuestion[];
  understanding: Understanding;
  displayTakeaway: string;
  displayPattern: string;
}

export interface RankedItem { name: string; count: number }

export interface WeeklyCount { weekStart: string; count: number }
export interface UnderstandingBreakdown {
  weekStart: string;
  understood: number;
  partial: number;
  copied_blindly: number;
  unknown: number;
}
export interface ProgressData {
  lessonsPerWeek: WeeklyCount[];
  understandingByWeek: UnderstandingBreakdown[];
}

export interface DashboardData {
  lessons: DashboardLesson[];
  models: RankedItem[];
  topics: RankedItem[];
  patterns: RankedItem[];
  progress: ProgressData;
  summary: { total: number };
}
