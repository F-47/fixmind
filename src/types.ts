export type ToolName = string;
export type Understanding = "understood" | "partial" | "copied_blindly" | "unknown";
export type QuestionStatus = "unanswered" | "answered" | "skipped";

export interface ReviewQuestion {
  id: string;
  question: string;
  expectedAnswer: string;
  userAnswer?: string;
  status: QuestionStatus;
}

export interface Lesson {
  id: string;
  createdAt: string;
  updatedAt: string;
  tool: ToolName;
  projectPath: string;
  title: string;
  originalPrompt: string;
  problem: string;
  mistake: string;
  rootCause: string;
  fixSummary: string;
  takeaway?: string;
  mistakePattern?: string;
  concepts: string[];
  filesChanged: string[];
  codeExample?: string;
  badCodeExample?: string;
  goodCodeExample?: string;
  codeExplanation?: string;
  practiceTask?: string;
  reviewQuestions: ReviewQuestion[];
  understanding: Understanding;
  nextReviewAt: string;
  reviewCount: number;
  sourceDiff?: string;
  tags: string[];
}

export interface LessonInput {
  tool?: ToolName;
  projectPath?: string;
  title: string;
  originalPrompt?: string;
  problem: string;
  mistake: string;
  rootCause: string;
  fixSummary: string;
  takeaway?: string;
  mistakePattern?: string;
  concepts: string[];
  filesChanged?: string[];
  codeExample?: string;
  badCodeExample?: string;
  goodCodeExample?: string;
  codeExplanation?: string;
  practiceTask?: string;
  reviewQuestions: Array<{ question: string; expectedAnswer: string }>;
  understanding?: Understanding;
  nextReviewAt?: string;
  sourceDiff?: string;
  tags?: string[];
}

export interface ConceptStat {
  name: string;
  count: number;
}

export interface MistakeStat {
  mistake: string;
  count: number;
}
