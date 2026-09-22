import { CodeBlock } from "@/components/shared/CodeBlock";
import type { DashboardLesson } from "@/lib/types";

export function LessonCodeSection({ lesson }: { lesson: DashboardLesson }) {
  const broken = lesson.badCodeExample ?? "A broken example was not captured for this lesson.";
  const corrected =
    lesson.goodCodeExample ??
    lesson.codeExample ??
    "A corrected example was not captured for this lesson.";
  const hasCode = Boolean(lesson.badCodeExample || lesson.goodCodeExample || lesson.codeExample);
  const hasBothExamples = Boolean(
    lesson.badCodeExample && (lesson.goodCodeExample || lesson.codeExample),
  );

  return (
    <>
      <h2 className="mt-10 mb-4 border-t border-line pt-8 text-2xl font-semibold tracking-tight">
        Broken and corrected code
      </h2>
      {hasCode ? (
        <>
          <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            <CodeBlock
              label="Broken approach"
              value={broken}
              compareWith={hasBothExamples ? corrected : undefined}
              kind="bad"
              filesChanged={lesson.filesChanged}
            />
            <CodeBlock
              label="Correct approach"
              value={corrected}
              compareWith={hasBothExamples ? broken : undefined}
              kind="good"
              filesChanged={lesson.filesChanged}
            />
          </div>
          {lesson.codeExplanation && (
            <div className="mt-6">
              <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                Key difference
              </div>
              <p className="mt-2 text-sm leading-relaxed">{lesson.codeExplanation}</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm leading-relaxed text-muted">
          No useful code comparison was captured for this lesson.
        </p>
      )}
    </>
  );
}
