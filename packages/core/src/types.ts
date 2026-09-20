export type ToolName = string;
export type Understanding = "understood" | "partial" | "copied_blindly" | "unknown";
export type QuestionStatus = "unanswered" | "answered" | "skipped";
export type LessonStatus = "active" | "superseded";

export interface Tag {
  name: string;
  url?: string;
}

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
  whenNotApplicable?: string;
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
  ease: number;
  lastIntervalDays: number | null;
  sourceDiff?: string;
  tags: Tag[];
  status: LessonStatus;
  supersededBy?: string;
  supersedes?: string;
  supersedeReason?: string;
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
  takeaway: string;
  mistakePattern?: string;
  whenNotApplicable: string;
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
  tags?: Tag[];
  supersedesLessonId?: string;
  supersedeReason?: string;
}

export interface ConceptStat {
  name: string;
  count: number;
}

export interface MistakeStat {
  mistake: string;
  count: number;
}
