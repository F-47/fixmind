import type { DashboardData, DashboardLesson, PracticeMode, ReviewQuestion } from "./types";

const MIN_DISTRACTOR_SCORE = 35;

export interface PracticeCard {
  lesson: DashboardLesson;
  question: ReviewQuestion;
  options: string[];
  mode: Exclude<PracticeMode, "mixed">;
  prompt: string;
  mcqDebug?: {
    generatedAt: string;
    acceptedCandidates: McqCandidateDebug[];
    rejectedCandidates: McqCandidateDebug[];
    fallbackReasons: McqFallbackReason[];
    distractors: McqDistractorDebug[];
  };
}

interface McqDistractorDebug {
  answer: string;
  score: number;
  reasons: string[];
}

interface McqCandidateDebug extends McqDistractorDebug {}

type McqFallbackReason =
  | "no_correct_answer"
  | "not_enough_candidates"
  | "below_adaptive_floor"
  | "below_relative_cutoff";

export function getPracticeLessons(data: DashboardData): DashboardLesson[] {
  return [...data.due].sort(byDueDate);
}

export function buildPracticeCard(
  lesson: DashboardLesson,
  lessons: DashboardLesson[],
  mode: PracticeMode,
): PracticeCard {
  const question = lesson.reviewQuestions[0] ?? {
    id: `${lesson.id}:practice`,
    question: lesson.title,
    expectedAnswer: lesson.takeaway ?? lesson.fixSummary,
    status: "unanswered" as const,
  };
  const resolvedMode = mode === "mixed" ? (lesson.reviewCount % 2 === 0 ? "free" : "mcq") : mode;
  const mcq =
    resolvedMode === "mcq"
      ? buildMultipleChoiceOptions(question.expectedAnswer, lesson, lessons)
      : null;
  const options = mcq?.options ?? [];
  const finalMode = resolvedMode === "mcq" && options.length >= 3 ? "mcq" : "free";

  return {
    lesson,
    question,
    options: finalMode === "mcq" ? options : [],
    mode: finalMode,
    prompt: buildPracticePrompt(lesson, finalMode),
    mcqDebug: mcq ?? undefined,
  };
}

export function buildMultipleChoiceOptions(
  correctAnswer: string,
  lesson: DashboardLesson,
  lessons: DashboardLesson[],
  maxOptions = 4,
): {
  options: string[];
  distractors: McqDistractorDebug[];
  generatedAt: string;
  acceptedCandidates: McqCandidateDebug[];
  rejectedCandidates: McqCandidateDebug[];
  fallbackReasons: McqFallbackReason[];
} {
  const correct = normalizeOption(correctAnswer);
  const generatedAt = new Date().toISOString();
  if (!correct) {
    return {
      options: [],
      distractors: [],
      generatedAt,
      acceptedCandidates: [],
      rejectedCandidates: [],
      fallbackReasons: ["no_correct_answer"],
    };
  }

  const scoredCandidates = scoreDistractorCandidates(correctAnswer, lesson, lessons);
  const adaptiveFloor = getAdaptiveDistractorFloor(lessons.length);
  const bestScore = scoredCandidates[0]?.score ?? 0;
  const acceptedCandidates = scoredCandidates.filter((candidate) => {
    const passesFloor = candidate.score >= adaptiveFloor;
    const passesRelative = bestScore === 0 || candidate.score >= bestScore * 0.7;
    return passesFloor && passesRelative;
  });
  const rejectedCandidates = scoredCandidates.filter(
    (candidate) => !acceptedCandidates.includes(candidate),
  );
  const distractors = acceptedCandidates.slice(0, Math.max(0, maxOptions - 1));
  const fallbackReasons =
    distractors.length < 2
      ? buildFallbackReasons(scoredCandidates, acceptedCandidates, adaptiveFloor, bestScore)
      : [];

  if (distractors.length < 2) {
    return {
      options: [],
      distractors: [],
      generatedAt,
      acceptedCandidates: acceptedCandidates.map(({ answer, score, reasons }) => ({
        answer,
        score,
        reasons,
      })),
      rejectedCandidates: rejectedCandidates.map(({ answer, score, reasons }) => ({
        answer,
        score,
        reasons,
      })),
      fallbackReasons,
    };
  }

  const options = stableShuffle(
    [correctAnswer.trim(), ...distractors.map((candidate) => candidate.answer)],
    `${lesson.id}:${correctAnswer}`,
  );
  return {
    options,
    distractors: distractors.map(({ answer, score, reasons }) => ({ answer, score, reasons })),
    generatedAt,
    acceptedCandidates: acceptedCandidates.map(({ answer, score, reasons }) => ({
      answer,
      score,
      reasons,
    })),
    rejectedCandidates: rejectedCandidates.map(({ answer, score, reasons }) => ({
      answer,
      score,
      reasons,
    })),
    fallbackReasons,
  };
}

export function scorePracticeResult(
  selectedAnswer: string,
  correctAnswer: string,
): "understood" | "partial" | "copied_blindly" {
  const normalizedSelected = normalizeOption(selectedAnswer);
  const normalizedCorrect = normalizeOption(correctAnswer);
  if (!normalizedSelected) return "copied_blindly";
  if (normalizedSelected === normalizedCorrect) return "understood";
  if (overlapCount(significantWords(normalizedSelected), significantWords(normalizedCorrect)) >= 2)
    return "partial";
  return "copied_blindly";
}

function byDueDate(a: DashboardLesson, b: DashboardLesson): number {
  return (
    Date.parse(a.nextReviewAt) - Date.parse(b.nextReviewAt) ||
    b.reviewCount - a.reviewCount ||
    a.title.localeCompare(b.title)
  );
}

interface ScoredDistractor {
  candidate: DashboardLesson;
  answer: string;
  score: number;
  reasons: string[];
}

function scoreDistractorCandidates(
  correctAnswer: string,
  lesson: DashboardLesson,
  lessons: DashboardLesson[],
): ScoredDistractor[] {
  const correct = normalizeOption(correctAnswer);
  const correctWords = significantWords(correctAnswer);

  const scored = lessons
    .filter((candidate) => candidate.id !== lesson.id && candidate.status === "active")
    .flatMap((candidate) =>
      candidate.reviewQuestions.map((question) => ({
        candidate,
        answer: candidateAnswer(candidate, question.expectedAnswer),
      })),
    )
    .filter(({ answer }) => Boolean(answer))
    .map(({ candidate, answer }) => {
      const normalized = normalizeOption(answer);
      if (!normalized || normalized === correct) return null;

      const scoring = scoreLessonAffinity(lesson, candidate);
      const answerScore = scoreAnswerAffinity(correctAnswer, answer);
      const overlapWithCorrect = overlapCount(correctWords, significantWords(answer));
      const score = scoring + answerScore + overlapWithCorrect * 6;
      return {
        candidate,
        answer: answer.trim(),
        score,
        reasons: buildDistractorReasons(lesson, candidate, correctAnswer, answer),
      };
    })
    .filter((item): item is ScoredDistractor => item !== null)
    .filter((item, index, items) => {
      const normalized = normalizeOption(item.answer);
      return (
        items.findIndex((candidate) => normalizeOption(candidate.answer) === normalized) === index
      );
    });

  return scored.sort((a, b) => b.score - a.score || a.answer.localeCompare(b.answer));
}

function buildPracticePrompt(
  lesson: DashboardLesson,
  mode: Exclude<PracticeMode, "mixed">,
): string {
  const focus = lesson.mistakePattern?.trim() || lesson.displayPattern || "this lesson";
  if (mode === "mcq") return "Which answer best matches the fix?";
  return `What caused the bug in ${focus}?`;
}

function normalizeOption(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function candidateAnswer(lesson: DashboardLesson, fallback: string): string {
  return (
    lesson.reviewQuestions[0]?.expectedAnswer?.trim() ||
    lesson.takeaway?.trim() ||
    lesson.fixSummary.trim() ||
    fallback.trim()
  );
}

function scoreLessonAffinity(current: DashboardLesson, candidate: DashboardLesson): number {
  let score = 0;
  if (
    normalizeOption(candidate.mistakePattern ?? "") ===
    normalizeOption(current.mistakePattern ?? "")
  )
    score += 60;
  score += sharedConcepts(current.concepts, candidate.concepts) * 20;
  if (candidate.tool === current.tool) score += 5;
  score += sharedFileFamilies(current.filesChanged, candidate.filesChanged) * 12;
  score += sharedWords(current.title, candidate.title) * 4;
  return score;
}

function scoreAnswerAffinity(correctAnswer: string, candidateAnswerText: string): number {
  const correctWords = significantWords(correctAnswer);
  const candidateWords = significantWords(candidateAnswerText);
  const wordOverlap = overlapCount(correctWords, candidateWords);
  const lengthGap = Math.abs(correctWords.size - candidateWords.size);
  let score = wordOverlap * 8;
  if (lengthGap <= 2) score += 8;
  else if (lengthGap <= 4) score += 4;
  return score;
}

function lessonFamilyFromText(value: string): Set<string> {
  const normalized = value.toLowerCase().replace(/\\/g, "/").trim();
  if (!normalized) return new Set();
  const parts = normalized.split("/").filter(Boolean);
  const family = new Set<string>([normalized]);
  if (parts.length > 1) {
    family.add(parts.slice(0, -1).join("/"));
    family.add(parts[0]);
  }
  const extension = parts.at(-1)?.split(".").at(-1);
  if (extension) family.add(`.${extension}`);
  return family;
}

function buildDistractorReasons(
  current: DashboardLesson,
  candidate: DashboardLesson,
  correctAnswer: string,
  candidateAnswerText: string,
): string[] {
  const reasons: string[] = [];
  if (
    normalizeOption(candidate.mistakePattern ?? "") ===
    normalizeOption(current.mistakePattern ?? "")
  ) {
    reasons.push("same mistakePattern");
  }

  for (const concept of sharedValues(current.concepts, candidate.concepts)) {
    reasons.push(`shared concept: ${concept}`);
  }

  for (const family of sharedFileFamiliesList(current.filesChanged, candidate.filesChanged)) {
    reasons.push(`shared file family: ${family}`);
  }

  if (candidate.tool === current.tool) {
    reasons.push(`same tool: ${candidate.tool}`);
  }

  const answerOverlap = sharedValues(
    [...significantWords(correctAnswer)],
    [...significantWords(candidateAnswerText)],
  );
  for (const word of answerOverlap.slice(0, 2)) {
    reasons.push(`shared answer word: ${word}`);
  }

  return reasons.length > 0 ? reasons : ["nearby lesson answer"];
}

function buildFallbackReasons(
  scoredCandidates: ScoredDistractor[],
  acceptedCandidates: ScoredDistractor[],
  adaptiveFloor: number,
  bestScore: number,
): McqFallbackReason[] {
  if (scoredCandidates.length === 0) return ["not_enough_candidates"];

  const reasons: McqFallbackReason[] = [];
  const relativeCutoff = bestScore > 0 ? bestScore * 0.7 : 0;

  if (scoredCandidates.some((candidate) => candidate.score < adaptiveFloor)) {
    reasons.push("below_adaptive_floor");
  }

  if (bestScore > 0 && scoredCandidates.some((candidate) => candidate.score < relativeCutoff)) {
    reasons.push("below_relative_cutoff");
  }

  if (acceptedCandidates.length < 2) reasons.push("not_enough_candidates");

  return [...new Set(reasons)];
}

function sharedConcepts(left: string[], right: string[]): number {
  return sharedValues(left, right).length;
}

function sharedFileFamilies(left: string[], right: string[]): number {
  return sharedFileFamiliesList(left, right).length;
}

function sharedWords(left: string, right: string): number {
  return overlapCount(significantWords(left), significantWords(right));
}

function sharedValues(left: string[], right: string[]): string[] {
  const normalizedLeft = new Set(left.map((item) => item.trim().toLowerCase()).filter(Boolean));
  const seen = new Set<string>();
  const shared: string[] = [];
  for (const item of right.map((value) => value.trim()).filter(Boolean)) {
    const normalized = item.toLowerCase();
    if (!normalizedLeft.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    shared.push(item);
  }
  return shared;
}

function sharedFileFamiliesList(left: string[], right: string[]): string[] {
  const leftFamilies = new Set(left.flatMap((file) => Array.from(lessonFamilyFromText(file))));
  const seen = new Set<string>();
  const shared: string[] = [];
  for (const family of right.flatMap((file) => Array.from(lessonFamilyFromText(file)))) {
    if (!leftFamilies.has(family) || seen.has(family)) continue;
    seen.add(family);
    shared.push(family);
  }
  return shared;
}

function overlapCount(left: Set<string>, right: Set<string>): number {
  let count = 0;
  for (const value of right) {
    if (left.has(value)) count += 1;
  }
  return count;
}

function significantWords(value: string): Set<string> {
  return new Set(
    normalizeOption(value)
      .split(" ")
      .filter((term) => term.length > 3),
  );
}

function getAdaptiveDistractorFloor(lessonCount: number): number {
  if (lessonCount < 20) return 25;
  if (lessonCount < 50) return 30;
  return MIN_DISTRACTOR_SCORE;
}

function stableShuffle<T>(items: T[], seed: string): T[] {
  const entries = items.map((item, index) => ({
    item,
    score: hashString(`${seed}:${index}:${String(item)}`),
  }));
  return entries.sort((a, b) => a.score - b.score).map((entry) => entry.item);
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return hash >>> 0;
}
