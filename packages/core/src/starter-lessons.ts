import type { LessonStore } from "./storage.js";
import type { Lesson, LessonInput } from "./types.js";
import { validateLessonInput } from "./validation.js";

export const STARTER_TAG = "fixmind-starter";

interface StarterLessonSpec {
  title: string;
  problem: string;
  mistake: string;
  rootCause: string;
  fixSummary: string;
  takeaway: string;
  mistakePattern: string;
  whenNotApplicable: string;
  concepts: string[];
  badCodeExample: string;
  goodCodeExample: string;
  codeExplanation: string;
  reviewQuestions: Array<{ question: string; expectedAnswer: string }>;
}

const STARTER_LESSONS: StarterLessonSpec[] = [
  {
    title: "Await the body, not just the response",
    problem: "Code read undefined fields from an API response after switching to fetch.",
    mistake: "Treated the resolved fetch promise as the parsed body.",
    rootCause:
      "fetch() resolves when response headers arrive; the body is a separate stream that must be read before it holds any data.",
    fixSummary:
      "Await res.json() (or the relevant body reader) before touching response data, so the code consumes the parsed value rather than the header-only response object.",
    takeaway: "fetch() resolves on headers, not on a parsed body.",
    mistakePattern: "Missing await",
    whenNotApplicable:
      "Does not apply to libraries that already parse the body, like axios, or to body streams consumed incrementally.",
    concepts: ["async timing", "HTTP"],
    badCodeExample: "const data = await fetch(url);\nconsole.log(data.field);",
    goodCodeExample:
      "const res = await fetch(url);\nconst data = await res.json();\nconsole.log(data.field);",
    codeExplanation:
      "The broken version logs a field off the Response object. The fixed version waits for body decoding before reading fields.",
    reviewQuestions: [
      {
        question:
          "A wrapper returns `await fetch(...)` directly and callers read `.userId` off it. What is wrong and how do you fix the wrapper?",
        expectedAnswer:
          "fetch resolves when headers arrive, so callers get a Response, not parsed data. The wrapper should return `await res.json()` (or expose both) so callers receive decoded data.",
      },
    ],
  },
  {
    title: "Off-by-one on the last element",
    problem: "The final item of a paginated list was silently dropped.",
    mistake: "Used a strict less-than against the wrong bound when slicing the page.",
    rootCause:
      "The slice end was computed as length - 1, which excludes the last index, while slice and loop bounds disagree about whether the end is inclusive.",
    fixSummary:
      "Use the collection length directly as the exclusive end bound so the last index is included, and prefer half-open ranges consistently across the codebase.",
    takeaway: "Slice ends are exclusive; length - 1 drops the last element.",
    mistakePattern: "Off-by-one",
    whenNotApplicable:
      "Does not apply to inclusive-range APIs that document the last index, or to intentionally trimmed views.",
    concepts: ["bounds", "collections"],
    badCodeExample: "const page = items.slice(0, items.length - 1);",
    goodCodeExample: "const page = items.slice(0, items.length);",
    codeExplanation:
      "slice already treats the end as exclusive, so subtracting one removes a real element instead of adjusting a bound.",
    reviewQuestions: [
      {
        question:
          "A loop `for (let i = 0; i <= list.length; i++)` reads list[i] once too often. What two standard shapes avoid this class of bug?",
        expectedAnswer:
          "Use `< list.length` for index loops, or iterate the values directly (`for (const item of list)`), so no inclusive/exclusive decision exists to get wrong.",
      },
    ],
  },
  {
    title: "Stale closure over changing state",
    problem: "A setInterval callback kept submitting the first value a user typed.",
    mistake: "Captured a state variable inside an interval callback created once.",
    rootCause:
      "The closure captured the value at creation time; the interval never re-created, so every tick read the frozen first render's binding.",
    fixSummary:
      "Read current state through a ref (or re-create the interval when the dependency changes) so the callback observes the latest value instead of its creation-time snapshot.",
    takeaway:
      "A long-lived callback closes over the value from when it was created, not the current one.",
    mistakePattern: "Stale closure",
    whenNotApplicable:
      "Does not apply when the captured value is deliberately constant for the callback's lifetime, like a static config.",
    concepts: ["closures", "React effects"],
    badCodeExample:
      "useEffect(() => {\n  const id = setInterval(() => save(query), 1000);\n  return () => clearInterval(id);\n}, []);",
    goodCodeExample:
      "const queryRef = useRef(query);\nqueryRef.current = query;\nuseEffect(() => {\n  const id = setInterval(() => save(queryRef.current), 1000);\n  return () => clearInterval(id);\n}, []);",
    codeExplanation:
      "The broken version freezes the first query value. The fixed version routes the value through a ref so each tick reads the latest one.",
    reviewQuestions: [
      {
        question:
          "An event handler registered once in useEffect always filters by the initial filter state. Name two independent fixes.",
        expectedAnswer:
          "Keep the mutable value in a ref that the handler reads at call time, or add the value to the effect's dependencies so the handler is re-registered when it changes.",
      },
    ],
  },
  {
    title: "Reading browser-only state during render",
    problem: "A server-rendered page threw 'localStorage is not defined' on the server.",
    mistake: "Called a browser API directly during component render.",
    rootCause:
      "Server rendering executes the component without a browser environment, so any window/document access during render crashes or produces markup that disagrees with the client.",
    fixSummary:
      "Move browser-API reads into an effect (or a client-only guard) so they run after hydration, keeping server and client markup identical.",
    takeaway: "Browser APIs run after hydration, never during render.",
    mistakePattern: "Environment boundary",
    whenNotApplicable:
      "Does not apply to code that only ever runs in the browser, like event handlers or client-only bundles.",
    concepts: ["SSR", "hydration"],
    badCodeExample:
      "function Theme() {\n  const theme = localStorage.getItem('theme');\n  return <div data-theme={theme} />;\n}",
    goodCodeExample:
      "function Theme() {\n  const [theme, setTheme] = useState<string | null>(null);\n  useEffect(() => setTheme(localStorage.getItem('theme')), []);\n  return <div data-theme={theme ?? 'light'} />;\n}",
    codeExplanation:
      "The broken version reads storage during render. The fixed version reads it after mount so the server never executes the browser call.",
    reviewQuestions: [
      {
        question:
          "A component reads window.innerWidth during render and the page flashes a different layout after hydration. Why does the flash happen?",
        expectedAnswer:
          "The server renders without a real window, so the first paint differs from the client's post-hydration measurement; the value must be read in an effect so markup matches until the measurement lands.",
      },
    ],
  },
  {
    title: "Missing cleanup leaks subscriptions",
    problem: "An SPA page kept receiving events after navigating away, growing memory over time.",
    mistake: "Added a listener in an effect without returning a cleanup.",
    rootCause:
      "Effects persist for the component's life and re-run on remount; without cleanup each mount stacks another listener on a shared emitter that is never removed.",
    fixSummary:
      "Return the unsubscribe function from the effect so every subscribe is paired with a teardown and remounts do not accumulate handlers.",
    takeaway: "Every subscribe in an effect needs a matching unsubscribe in its cleanup.",
    mistakePattern: "Missing cleanup",
    whenNotApplicable:
      "Does not apply to global listeners installed once for the whole app lifetime, or to APIs that clean up automatically.",
    concepts: ["resource cleanup", "React effects"],
    badCodeExample: "useEffect(() => {\n  socket.on('update', setRows);\n}, []);",
    goodCodeExample:
      "useEffect(() => {\n  socket.on('update', setRows);\n  return () => socket.off('update', setRows);\n}, []);",
    codeExplanation:
      "The broken version stacks a new handler on every mount. The fixed version removes the exact handler when the component unmounts.",
    reviewQuestions: [
      {
        question:
          "A polling effect sets a timer with setInterval and the component remounts often. Besides cleanup, what interval-specific mistake doubles the leak rate?",
        expectedAnswer:
          "Calling setInterval inside a dependency-less effect that also lacks cleanup stacks timers; with deps it re-creates on each change, so cleanup must clear the previous interval or ticks multiply.",
      },
    ],
  },
  {
    title: "Race between two async writes",
    problem: "Detail pages intermittently showed the previously selected record's data.",
    mistake: "Started a request per selection and let whichever finished last win the render.",
    rootCause:
      "Both requests were in flight at once with no cancellation, so an older, slower response could resolve after the newer one and overwrite its result.",
    fixSummary:
      "Track the latest request (an in-flight flag or AbortController) and ignore or abort stale responses so only the newest request's result lands.",
    takeaway: "Concurrent requests need cancellation or a staleness check before applying results.",
    mistakePattern: "Async race",
    whenNotApplicable:
      "Does not apply to request queues that serialize by design, or to idempotent reads where last-write-wins is acceptable.",
    concepts: ["async race", "cancellation"],
    badCodeExample: "useEffect(() => {\n  fetchItem(id).then(setItem);\n}, [id]);",
    goodCodeExample:
      "useEffect(() => {\n  let stale = false;\n  fetchItem(id).then((item) => {\n    if (!stale) setItem(item);\n  });\n  return () => { stale = true; };\n}, [id]);",
    codeExplanation:
      "The broken version applies any response that resolves. The fixed version marks the effect stale on cleanup and drops responses that arrive after the selection changed.",
    reviewQuestions: [
      {
        question:
          "Why does an in-flight boolean flag sometimes fail to prevent races where AbortController succeeds?",
        expectedAnswer:
          "A flag only ignores the stale response's callback; it cannot stop the request, so the server still does the work and the connection stays open. AbortController cancels the request itself.",
      },
    ],
  },
  {
    title: "Secrets built into the client bundle",
    problem: "A published API key was scraped from the static JS bundle within hours.",
    mistake:
      "Put a server credential in a VITE_/NEXT_PUBLIC_ variable and imported it client-side.",
    rootCause:
      "Anything statically imported into client code is bundled verbatim; env-prefix conventions only control exposure at build time, and public variables are embedded in the shipped output.",
    fixSummary:
      "Keep the secret server-side and expose only an authenticated endpoint, so the client calls your backend instead of embedding the credential it should never hold.",
    takeaway: "Client-bundled environment variables are public the moment you deploy.",
    mistakePattern: "Secret in bundle",
    whenNotApplicable:
      "Does not apply to values that are intentionally public, like analytics site IDs or feature flags with no privilege.",
    concepts: ["security", "build boundaries"],
    badCodeExample:
      "const key = import.meta.env.VITE_API_SECRET;\nawait fetch(api, { headers: { Authorization: key } });",
    goodCodeExample:
      "// server route /api/proxy holds the secret\nawait fetch('/api/proxy', { method: 'POST', body: formData });",
    codeExplanation:
      "The broken version ships the key in the bundle. The fixed version keeps the key in the server process and lets the client call a proxied endpoint.",
    reviewQuestions: [
      {
        question:
          "A teammate says a key in NEXT_PUBLIC_ is safe because the repo is private. What is the flawed assumption?",
        expectedAnswer:
          "Bundle exposure is about the deployed artifact, not the repo: every visitor downloads the JS, so any embedded value is public regardless of source visibility.",
      },
    ],
  },
  {
    title: "Raw values interpolated into SQL",
    problem:
      "A search box input produced a syntax error and, per a security review, an injectable query.",
    mistake: "Built SQL by concatenating user input into the statement text.",
    rootCause:
      "String-concatenated SQL treats input as code, so quotes and keywords in user input change the statement's structure rather than acting as data values.",
    fixSummary:
      "Pass user values as bound parameters to a prepared statement so the driver sends the statement and the data separately and input can never alter the query shape.",
    takeaway: "Bind parameters; never concatenate user input into SQL text.",
    mistakePattern: "SQL injection",
    whenNotApplicable:
      "Does not apply to trusted, developer-controlled fragments like column allowlists mapped to fixed strings.",
    concepts: ["security", "SQL"],
    badCodeExample:
      'const sql = "SELECT * FROM users WHERE name = \'" + name + "\'";\ndb.query(sql);',
    goodCodeExample: "const sql = 'SELECT * FROM users WHERE name = ?';\ndb.query(sql, [name]);",
    codeExplanation:
      "The broken version lets quotes in input close the string literal early. The fixed version sends the value as a parameter, so it stays data.",
    reviewQuestions: [
      {
        question:
          "Why is an allowlisted ORDER BY column name safe to interpolate while a user-typed value is not?",
        expectedAnswer:
          "The allowlist maps user choice to one of a few fixed developer-written strings, so no user characters reach the SQL text at all; a raw value passes user characters straight into the statement.",
      },
    ],
  },
  {
    title: "Null check before the await, not after",
    problem: "Code still crashed reading a property of a null API result despite a null check.",
    mistake: "Checked for null before the value actually existed.",
    rootCause:
      "The check ran against the placeholder value; the assignment happened later when the promise resolved, so the guard tested the wrong moment in time.",
    fixSummary:
      "Perform null checks on the resolved value, inside the continuation that owns the data, so the guard runs after the async assignment rather than before it.",
    takeaway: "Guard async results where they arrive, not where the variable is declared.",
    mistakePattern: "Wrong guard timing",
    whenNotApplicable:
      "Does not apply to synchronous values that are fully assigned before the check runs.",
    concepts: ["async timing", "null guards"],
    badCodeExample: "let user = null;\nif (!user) return;\nloadUser().then((u) => { user = u; });",
    goodCodeExample: "const user = await loadUser();\nif (!user) return;",
    codeExplanation:
      "The broken version checks the placeholder before the request completes. The fixed version awaits first so the check sees the real value.",
    reviewQuestions: [
      {
        question:
          "A guard `if (!data) return;` sits above `data = await fetchData();`. Under what interleaving does the page still render with data undefined?",
        expectedAnswer:
          "The guard always runs before the await completes, so it passes on the placeholder and execution continues to render before the assignment happens.",
      },
    ],
  },
  {
    title: "Cache key that ignores its inputs",
    problem: "Users saw each other's formatted profiles after a profile edit.",
    mistake:
      "Cached a computed value under a key that did not include the inputs that produced it.",
    rootCause:
      "The key was static per page, so different inputs collided onto one cache entry and the first writer's output served every later request.",
    fixSummary:
      "Include every input that changes the output in the cache key, so distinct inputs address distinct entries and updates invalidate naturally.",
    takeaway: "A cache key must name everything the cached value depends on.",
    mistakePattern: "Cache key collision",
    whenNotApplicable:
      "Does not apply to truly input-independent values, like constants or the same-for-everyone page data.",
    concepts: ["caching", "cache invalidation"],
    badCodeExample:
      "const cached = cache.get('profile');\nif (cached) return cached;\nconst html = render(userId);\ncache.set('profile', html);",
    goodCodeExample:
      // biome-ignore lint/suspicious/noTemplateCurlyInString: the lesson intentionally shows template-literal syntax as text
      "const key = `profile:${userId}:${updatedAt}`;\nconst cached = cache.get(key);\nif (cached) return cached;\nconst html = render(userId);\ncache.set(key, html);",
    codeExplanation:
      "The broken key serves one entry to all users. The fixed key namespaces by user and version, so edits and users cannot collide.",
    reviewQuestions: [
      {
        question:
          "A cache serves stale rows after a database write. What key design makes manual invalidation unnecessary?",
        expectedAnswer:
          "Derive the key from the data's own version or updated-at field, so a write changes the key itself and the next read addresses a fresh entry.",
      },
    ],
  },
  {
    title: "Mutable default shared across calls",
    problem: "Function arguments from previous calls appeared in fresh invocations.",
    mistake: "Reused a mutable module-level or default object across calls.",
    rootCause:
      "Defaults and module-level objects are created once and shared; mutations from one call persist into the next call that receives the same instance.",
    fixSummary:
      "Create a fresh object per call and treat shared structures as read-only, so no caller's mutation can leak into another call.",
    takeaway: "Shared default objects keep their mutations between calls.",
    mistakePattern: "Shared mutable state",
    whenNotApplicable:
      "Does not apply to frozen/immutable defaults or to single-instance caches that are mutated deliberately.",
    concepts: ["state management", "defaults"],
    badCodeExample:
      "function addFilter(filters = {}, name) {\n  filters[name] = true;\n  return filters;\n}",
    goodCodeExample:
      "function addFilter(filters = {}, name) {\n  return { ...filters, [name]: true };\n}",
    codeExplanation:
      "The broken version mutates the shared default. The fixed version builds a new object, leaving every caller's input untouched.",
    reviewQuestions: [
      {
        question:
          "Why does `options = options || {}` still leave a mutation bug while `options ?? {}` with a spread does not?",
        expectedAnswer:
          "Either default form shares one instance across calls; the fix is not the default syntax but never mutating the received value — copying into a new object makes sharing harmless.",
      },
    ],
  },
  {
    title: "Catching an error only to rethrow blindly",
    problem: "A production stack trace pointed at a logging wrapper instead of the failing line.",
    mistake: "Wrapped a call in try/catch that logged and rethrew, discarding the original stack.",
    rootCause:
      "The catch block created a new throw site; re-raising from inside catch replaces the stack's origin with the wrapper unless the original error is preserved.",
    fixSummary:
      "Either let the error propagate untouched or attach context to the original error before rethrowing it, so the failing call stays at the top of the trace.",
    takeaway: "Rethrow the original error; wrappers that re-throw from scratch destroy the stack.",
    mistakePattern: "Error handling",
    whenNotApplicable:
      "Does not apply to intentional translation layers that wrap errors deliberately and preserve the cause.",
    concepts: ["error handling", "debugging"],
    badCodeExample:
      "try {\n  await sync();\n} catch (e) {\n  console.error('sync failed');\n  throw new Error('sync failed');\n}",
    goodCodeExample:
      "try {\n  await sync();\n} catch (e) {\n  throw new Error('sync failed', { cause: e });\n}",
    codeExplanation:
      "The broken version throws a fresh error with no link to the original. The fixed version chains the cause so the real stack survives.",
    reviewQuestions: [
      {
        question:
          "A wrapper must convert a network error into a domain error. What must it do so on-call engineers do not lose the original failure?",
        expectedAnswer:
          "Attach the original error as the cause (or equivalent) so the domain error carries the underlying stack and message for diagnosis.",
      },
    ],
  },
  {
    title: "Timezone-less date math",
    problem: "A daily digest sent twice for some users and never for others.",
    mistake: "Compared calendar dates that were serialized in mixed UTC and local time.",
    rootCause:
      "String dates in different timezones describe different calendar days; comparing them directly decides 'same day' differently per user location.",
    fixSummary:
      "Normalize all timestamps to UTC before any calendar comparison, and derive per-user days from a single instant, so 'today' means one stable value everywhere.",
    takeaway: "Compare dates as normalized instants, never as ambiguous strings.",
    mistakePattern: "Timezone handling",
    whenNotApplicable:
      "Does not apply to display formatting, which should use the user's locale by design.",
    concepts: ["dates", "UTC"],
    badCodeExample: "const today = new Date().toDateString();\nif (lastSent === today) return;",
    goodCodeExample:
      "const today = new Date().toISOString().slice(0, 10);\nif (lastSent === today) return;",
    codeExplanation:
      "The broken version mixes local day strings. The fixed version compares UTC day strings, one stable value for all users.",
    reviewQuestions: [
      {
        question:
          "Why can `toISOString().slice(0, 10)` still disagree with a user's wall calendar near midnight?",
        expectedAnswer:
          "UTC day boundaries do not match local midnight; it is a stable server-side choice, and any user-facing 'today' must additionally account for their timezone offset.",
      },
    ],
  },
  {
    title: "Types that describe the happy path only",
    problem:
      "A refactor compiled cleanly but crashed on the optional field it had typed as required.",
    mistake:
      "Declared an API field non-optional because it was present in the successful responses inspected.",
    rootCause:
      "The type encoded an assumption about the data rather than the provider's contract; optional and failure-case fields were absent from the sampled successes.",
    fixSummary:
      "Type remote data from its documented contract, marking nullable or absent fields as optional, so the compiler forces the code to handle the missing case.",
    takeaway: "Types must encode the provider's contract, not one observed response.",
    mistakePattern: "Wrong assumption",
    whenNotApplicable:
      "Does not apply to fields the provider documents as guaranteed, or to locally-owned types you fully control.",
    concepts: ["TypeScript", "API contracts"],
    badCodeExample: "interface User {\n  email: string;\n}",
    goodCodeExample:
      "interface User {\n  email?: string;\n}\nconst display = user.email ?? 'no email';",
    codeExplanation:
      "The broken type asserts a guarantee the API never made. The optional type makes the compiler demand a fallback.",
    reviewQuestions: [
      {
        question:
          "A typed consumer of your API keeps crashing on a field you send only sometimes. What does the fix tell you about your own API contract?",
        expectedAnswer:
          "The field's optionality is part of the contract and must be documented and typed; if it is required, the provider must guarantee it, and if not, consumers must handle absence.",
      },
    ],
  },
  {
    title: "Silent failure with an empty catch",
    problem: "A background job stopped processing for days with no error anywhere.",
    mistake: "Swallowed exceptions in a fire-and-forget path with an empty catch.",
    rootCause:
      "The catch made failure invisible: no log, no metric, no retry, so the job exited its loop silently and monitoring saw a healthy process.",
    fixSummary:
      "Log every caught error with enough context to act on, and surface persistent failures to monitoring, so a dead job is distinguishable from a healthy one.",
    takeaway: "Every catch must at least log; silence turns failures into outages.",
    mistakePattern: "Error handling",
    whenNotApplicable:
      "Does not apply to catches that deliberately ignore expected, harmless conditions and are commented as such.",
    concepts: ["error handling", "observability"],
    badCodeExample: "queue.on('job', async (job) => {\n  try { await run(job); } catch {}\n});",
    goodCodeExample:
      "queue.on('job', async (job) => {\n  try {\n    await run(job);\n  } catch (error) {\n    logger.error('job failed', { jobId: job.id, error });\n  }\n});",
    codeExplanation:
      "The broken version hides the failure entirely. The fixed version records it with context, so a stuck queue is visible the same day.",
    reviewQuestions: [
      {
        question:
          "An empty catch makes a bug invisible. What is the minimal responsible catch, and what does it guarantee about your system?",
        expectedAnswer:
          "Log the error with identifying context; it guarantees failures are observable, which is the difference between debugging today and discovering an outage next week.",
      },
    ],
  },
];

export function starterLessonInputs(now = new Date()): LessonInput[] {
  return STARTER_LESSONS.map((spec, index) =>
    validateLessonInput({
      tool: "fixmind",
      projectPath: "fixmind://starter",
      originalPrompt: "",
      sourceDiff: undefined,
      tags: [{ name: STARTER_TAG }],
      understanding: "unknown",
      nextReviewAt: new Date(now.getTime() + (index + 1) * 60 * 60 * 1000).toISOString(),
      ...spec,
    }),
  );
}

export function isStarterLesson(lesson: Lesson): boolean {
  return lesson.tags.some((tag) => tag.name === STARTER_TAG);
}

export function installStarterLessons(store: LessonStore): {
  installed: number;
  skipped: boolean;
} {
  if (store.list(Number.MAX_SAFE_INTEGER).some(isStarterLesson)) {
    return { installed: 0, skipped: true };
  }
  for (const input of starterLessonInputs()) {
    store.save(input);
  }
  return { installed: STARTER_LESSONS.length, skipped: false };
}

export function starterLessonCount(): number {
  return STARTER_LESSONS.length;
}
