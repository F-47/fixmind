import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createLessonStore } from "../src/storage.js";

function memoryLesson(title: string, takeaway: string) {
  return {
    tool: "claude",
    projectPath: "/tmp/fixmind-memory",
    title,
    originalPrompt: `Fix ${title}`,
    problem: `${title} broke the task`,
    mistake: `Used the wrong approach for ${title}`,
    rootCause: `The code assumed the wrong behavior for ${title}`,
    fixSummary: `Changed the logic for ${title}`,
    takeaway,
    whenNotApplicable: `Does not apply when ${title.toLowerCase()} is already correct`,
    concepts: [title.toLowerCase()],
    reviewQuestions: [{
      question: `How does ${title} transfer?`,
      expectedAnswer: takeaway,
    }],
  };
}

test("MCP exposes one save tool and persists a lesson", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map((tool) => tool.name), ["memory", "save_lesson"]);

    const result = await client.callTool({
      name: "save_lesson",
      arguments: {
        tool: "windsurf",
        projectPath: dataDirectory,
        title: "Understand hydration",
        originalPrompt: "Fix the mismatch",
        problem: "Initial markup differed",
        mistake: "Read browser state during server rendering",
        rootCause: "The server and browser had different inputs",
        fixSummary: "Use stable initial state and load browser state after hydration",
        takeaway: "Keep the first server and browser render identical.",
        mistakePattern: "Hydration timing",
        whenNotApplicable: "Does not apply to values that are identical on server and client, like static labels.",
        concepts: ["hydration"],
        filesChanged: ["app/page.tsx"],
        codeExample: "useEffect(() => loadTheme(), [])",
        badCodeExample: "const theme = localStorage.getItem('theme')",
        goodCodeExample: "useEffect(() => loadTheme(), [])",
        codeExplanation: "The corrected version waits until the component is running in the browser.",
        practiceTask: "Build a component with stable server markup.",
        reviewQuestions: [{
          question: "Why must initial renders match?",
          expectedAnswer: "Hydration attaches to the server-rendered markup.",
        }],
        understanding: "unknown",
        tags: [{ name: "nextjs", url: "https://nextjs.org/docs/messages/react-hydration-error" }],
      },
    });
    assert.equal(result.isError, undefined);

    const store = createLessonStore(path.join(dataDirectory, "learning.db"));
    try {
      const saved = store.list();
      assert.equal(saved.length, 1);
      assert.equal(saved[0].tool, "windsurf");
      assert.equal(saved[0].title, "Understand hydration");
      assert.match(saved[0].badCodeExample ?? "", /localStorage/);
      assert.match(saved[0].practiceTask ?? "", /stable server markup/);
      assert.equal(saved[0].mistakePattern, "Hydration timing");
      assert.match(saved[0].codeExplanation ?? "", /waits until/);
      assert.match(saved[0].whenNotApplicable ?? "", /static labels/);
    } finally {
      store.close();
    }
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("MCP memory returns reviewed active lessons and skips superseded ones", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-memory-"));
  const dbPath = path.join(dataDirectory, "learning.db");
  const store = createLessonStore(dbPath);
  const oldLesson = store.save(memoryLesson("Hydration mismatch", "Keep the first server and browser render identical."));
  store.updateReview(oldLesson.id, oldLesson.reviewQuestions, "understood");
  const newLesson = store.save(memoryLesson("Hydration fix", "Read browser-only state after mount."));
  store.updateReview(newLesson.id, newLesson.reviewQuestions, "understood");
  store.supersede(oldLesson.id, newLesson.id, "The first lesson described the wrong fix.");
  const unrelated = store.save(memoryLesson("Stale closure", "Use the latest value in the effect."));
  store.updateReview(unrelated.id, unrelated.reviewQuestions, "understood");
  store.close();

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });

  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "memory",
      arguments: {
        query: "hydration",
        limit: 5,
      },
    });
    assert.equal(result.isError, undefined);
    const text = (result.content as Array<{ text: string }>)[0].text;
    assert.match(text, /Hydration fix/);
    assert.doesNotMatch(text, /Hydration mismatch/);
    assert.doesNotMatch(text, /Stale closure/);
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("MCP infers tool name from MCP client info when omitted", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-clientinfo-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });

  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "save_lesson",
      arguments: {
        projectPath: dataDirectory,
        title: "Detect tool from clientInfo",
        problem: "The tool field always defaulted to unknown-ai-tool",
        mistake: "The schema applied a static default instead of reading the MCP client identity",
        rootCause: "A zod default ran before the connected client's name was considered",
        fixSummary: "Fall back to the MCP client's clientInfo.name when tool is omitted",
        takeaway: "A static zod default always wins over runtime data unless the field is left unset.",
        whenNotApplicable: "Does not apply when the tool name is supplied explicitly by the caller.",
        concepts: ["MCP clientInfo"],
        badCodeExample: "tool: z.string().trim().min(1).default(\"unknown-ai-tool\")",
        goodCodeExample: "candidate.tool ||= server.server.getClientVersion()?.name ?? \"unknown-ai-tool\"",
        reviewQuestions: [{
          question: "Where does fixmind get the tool name when it is omitted?",
          expectedAnswer: "From the MCP client's clientInfo.name sent during the initialize handshake.",
        }],
      },
    });
    assert.equal(result.isError, undefined);

    const store = createLessonStore(path.join(dataDirectory, "learning.db"));
    try {
      const saved = store.list();
      assert.equal(saved.length, 1);
      assert.equal(saved[0].tool, "fixmind-test");
    } finally {
      store.close();
    }
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("MCP rejects a mechanical move/extract refactor with no code comparison", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-mechanical-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "save_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Extract option helpers",
        problem: "The CLI file was too large",
        mistake: "Moved optionString and parseList into a separate file",
        rootCause: "The helpers were defined inline in cli.ts",
        fixSummary: "Extracted helpers into cli-options.ts",
        takeaway: "Group reusable option-parsing helpers in their own module.",
        whenNotApplicable: "Does not apply to helpers used by only one file - inlining is fine there.",
        concepts: ["single-responsibility"],
        reviewQuestions: [{ question: "When should you extract helpers?", expectedAnswer: "When they are reused or obscure intent." }],
      },
    });
    assert.equal(result.isError, true);
    const text = (result.content as Array<{ text: string }>)[0].text;
    assert.match(text, /mechanical/i);

    const store = createLessonStore(path.join(dataDirectory, "learning.db"));
    try {
      assert.equal(store.list().length, 0);
    } finally {
      store.close();
    }
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("MCP appends quality warning when a real fix has no code examples", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-quality-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "save_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Validate email before saving a profile",
        problem: "Users could save profiles with an empty email address",
        mistake: "Persisted the profile without checking that an email was present",
        rootCause: "The save handler trusted the form payload instead of validating required fields on the server",
        fixSummary: "Added a server-side check that rejects profiles missing an email before saving",
        takeaway: "Validate required fields on the server, not just in the UI.",
        whenNotApplicable: "Does not apply to fields that are genuinely optional.",
        concepts: ["input validation"],
        filesChanged: ["server/profile.ts"],
        reviewQuestions: [{ question: "Where else should a required-field check like this live?", expectedAnswer: "On the server, for any field the UI marks required, since the UI check can be bypassed." }],
      },
    });
    assert.equal(result.isError, undefined);
    const text = (result.content as Array<{ text: string }>)[0].text;
    assert.ok(text.includes("Quality notice"), `Expected quality warning in: ${text}`);
    assert.ok(text.includes("Suggestions"), `Expected structured suggestions in: ${text}`);
    assert.ok(
      text.includes("badCodeExample") || text.includes("goodCodeExample"),
      `Expected code example guidance in: ${text}`,
    );
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("MCP supersedes a previous lesson via supersedesLessonId", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-supersede-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map((tool) => tool.name), ["memory", "save_lesson"]);

    const first = await client.callTool({
      name: "save_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Wrong fix for hydration",
        problem: "Initial markup differed",
        mistake: "Read browser state during server rendering",
        rootCause: "The server and browser had different inputs",
        fixSummary: "Wrapped the read in a try/catch",
        takeaway: "A try/catch silences an error without fixing the underlying mismatch.",
        whenNotApplicable: "Does not apply once the actual SSR/browser mismatch is fixed.",
        concepts: ["hydration"],
        badCodeExample: "const theme = localStorage.getItem('theme')",
        goodCodeExample: "try { localStorage.getItem('theme') } catch {}",
        reviewQuestions: [{
          question: "Why did hydration fail?",
          expectedAnswer: "The initial renders differed",
        }],
      },
    });
    assert.equal(first.isError, undefined);
    const firstText = (first.content as Array<{ text: string }>)[0].text;
    const oldId = /Saved learning lesson (\S+)\./.exec(firstText)?.[1];
    assert.ok(oldId, `Expected lesson id in: ${firstText}`);

    const second = await client.callTool({
      name: "save_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Correct fix for hydration",
        problem: "Initial markup differed",
        mistake: "Read browser state during server rendering",
        rootCause: "The server and browser had different inputs",
        fixSummary: "Read browser state after hydration in useEffect",
        takeaway: "Read browser-only state inside useEffect, after the component has mounted.",
        whenNotApplicable: "Does not apply to values that are identical on server and client.",
        concepts: ["hydration"],
        badCodeExample: "const theme = localStorage.getItem('theme')",
        goodCodeExample: "useEffect(() => setTheme(localStorage.getItem('theme')), [])",
        reviewQuestions: [{
          question: "When is it safe to read localStorage?",
          expectedAnswer: "After the component has mounted in the browser",
        }],
        supersedesLessonId: oldId,
        supersedeReason: "The try/catch silenced the error without fixing the SSR mismatch.",
      },
    });
    assert.equal(second.isError, undefined);
    const secondText = (second.content as Array<{ text: string }>)[0].text;
    assert.ok(
      secondText.includes(`Superseded lesson ${oldId}`),
      `Expected supersede confirmation in: ${secondText}`,
    );

    const store = createLessonStore(path.join(dataDirectory, "learning.db"));
    try {
      const oldLesson = store.get(oldId!);
      assert.equal(oldLesson?.status, "superseded");
      assert.ok(oldLesson?.supersededBy);

      const newLesson = store.list().find((lesson) => lesson.id === oldLesson?.supersededBy);
      assert.equal(newLesson?.supersedes, oldId);
      assert.equal(
        newLesson?.supersedeReason,
        "The try/catch silenced the error without fixing the SSR mismatch.",
      );
    } finally {
      store.close();
    }
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("MCP warns when supersedesLessonId does not match an existing lesson", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-supersede-missing-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });

  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "save_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Correct fix for hydration",
        problem: "Initial markup differed",
        mistake: "Read browser state during server rendering",
        rootCause: "The server and browser had different inputs",
        fixSummary: "Read browser state after hydration in useEffect",
        takeaway: "Read browser-only state inside useEffect, after the component has mounted.",
        whenNotApplicable: "Does not apply to values that are identical on server and client.",
        concepts: ["hydration"],
        badCodeExample: "const theme = localStorage.getItem('theme')",
        goodCodeExample: "useEffect(() => setTheme(localStorage.getItem('theme')), [])",
        reviewQuestions: [{
          question: "When is it safe to read localStorage?",
          expectedAnswer: "After the component has mounted in the browser",
        }],
        supersedesLessonId: "00000000-0000-0000-0000-000000000000",
      },
    });
    assert.equal(result.isError, undefined);
    const text = (result.content as Array<{ text: string }>)[0].text;
    assert.ok(text.includes("was not found"), `Expected not-found warning in: ${text}`);
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("MCP rejects incomplete lesson input", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-invalid-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "save_lesson",
      arguments: { title: "Incomplete" },
    });
    assert.equal(result.isError, true);
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("MCP rejects a lesson missing whenNotApplicable", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-scope-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "save_lesson",
      arguments: {
        title: "Missing scope",
        problem: "Initial markup differed",
        mistake: "Read browser state during server rendering",
        rootCause: "The server and browser had different inputs",
        fixSummary: "Use stable initial state and load browser state after hydration",
        takeaway: "Keep the first server and browser render identical.",
        concepts: ["hydration"],
        reviewQuestions: [{
          question: "Why must initial renders match?",
          expectedAnswer: "Hydration attaches to the server-rendered markup.",
        }],
      },
    });
    assert.equal(result.isError, true);
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("MCP rejects a lesson where rootCause just repeats mistake", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-rootcause-dup-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "save_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Hydration mismatch",
        problem: "Initial markup differed",
        mistake: "Read localStorage during server-side rendering",
        rootCause: "Read localStorage during server-side rendering",
        fixSummary: "Moved the localStorage read into a useEffect that runs after mount",
        takeaway: "Read browser-only state inside useEffect, after mount.",
        whenNotApplicable: "Does not apply to values that are identical on server and client.",
        concepts: ["hydration"],
        reviewQuestions: [{
          question: "When is it safe to read localStorage?",
          expectedAnswer: "After the component has mounted in the browser.",
        }],
      },
    });
    assert.equal(result.isError, true);
    const text = (result.content as Array<{ text: string }>)[0].text;
    assert.match(text, /rootCause/);

    const store = createLessonStore(path.join(dataDirectory, "learning.db"));
    try {
      assert.equal(store.list().length, 0);
    } finally {
      store.close();
    }
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("MCP rejects a styling-only change with no described behavior bug", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-ui-only-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "save_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Match save button color to design system",
        problem: "The save button's color didn't match the design system on the settings page",
        mistake: "Used a custom hex color for the save button's background instead of the design system's primary color token",
        rootCause: "The button's className hardcoded bg-[#2563eb] instead of the bg-primary utility class",
        fixSummary: "Changed the button's className from bg-[#2563eb] to bg-primary",
        takeaway: "Use design-system color tokens instead of hardcoded hex values.",
        whenNotApplicable: "Does not apply once a project has no shared design-system tokens at all.",
        concepts: ["styling"],
        reviewQuestions: [{ question: "What did you change?", expectedAnswer: "Swapped a hardcoded hex color for a token." }],
      },
    });
    assert.equal(result.isError, true);
    const text = (result.content as Array<{ text: string }>)[0].text;
    assert.match(text, /UI-only|styling/i);

    const store = createLessonStore(path.join(dataDirectory, "learning.db"));
    try {
      assert.equal(store.list().length, 0);
    } finally {
      store.close();
    }
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("MCP rejects a lesson whose only review question is recall-only", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-recall-only-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "save_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Off-by-one when paginating results",
        problem: "The last item on each page was missing from the results list",
        mistake: "Used array.slice(start, start + pageSize - 1) to get a page of results",
        rootCause: "slice's end index is exclusive, so subtracting 1 drops the last element of every page instead of including it",
        fixSummary: "Changed the slice call to array.slice(start, start + pageSize), since slice already excludes the end index",
        takeaway: "Remember that Array.prototype.slice's end argument is exclusive - don't subtract 1 from it.",
        whenNotApplicable: "Does not apply to APIs whose end index is inclusive.",
        concepts: ["pagination"],
        badCodeExample: "items.slice(start, start + pageSize - 1)",
        goodCodeExample: "items.slice(start, start + pageSize)",
        reviewQuestions: [{ question: "What did you change to fix the pagination bug?", expectedAnswer: "Removed the '- 1' from the slice end index." }],
      },
    });
    assert.equal(result.isError, true);
    const text = (result.content as Array<{ text: string }>)[0].text;
    assert.match(text, /transfer/i);

    const store = createLessonStore(path.join(dataDirectory, "learning.db"));
    try {
      assert.equal(store.list().length, 0);
    } finally {
      store.close();
    }
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("MCP rejects a lesson whose only review question asks how the bug was fixed", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-how-fix-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "save_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Crash when rendering a user with no avatar",
        problem: "The profile page crashed with 'Cannot read properties of null (reading url)' for users who never uploaded an avatar",
        mistake: "Rendered <img src={user.avatar.url}> assuming user.avatar was always an object",
        rootCause: "Accounts created before avatar uploads existed have user.avatar set to null instead of a placeholder object, so .url is read from null",
        fixSummary: "Render a placeholder image when user.avatar is null, since accessing .url on null throws before the fallback can run",
        takeaway: "Treat optional nested objects as possibly null and guard before accessing their properties.",
        whenNotApplicable: "Does not apply once the backend guarantees avatar is always populated with at least a default object.",
        concepts: ["null safety"],
        badCodeExample: "<img src={user.avatar.url} />",
        goodCodeExample: "<img src={user.avatar?.url ?? '/default-avatar.png'} />",
        reviewQuestions: [{ question: "How did you fix this bug?", expectedAnswer: "Added a fallback to a placeholder image when user.avatar is null." }],
      },
    });
    assert.equal(result.isError, true);
    const text = (result.content as Array<{ text: string }>)[0].text;
    assert.match(text, /transfer/i);

    const store = createLessonStore(path.join(dataDirectory, "learning.db"));
    try {
      assert.equal(store.list().length, 0);
    } finally {
      store.close();
    }
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("MCP saves a real interaction bug described with styling vocabulary (overlay made a button unclickable)", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-unclickable-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "save_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Fix unclickable save button caused by an overlapping overlay",
        problem: "The 'Save' button on the settings page became unclickable - clicking anywhere on it had no effect",
        mistake: "Gave a decorative overlay div a higher z-index in its className than the button beneath it, assuming styling order in the stylesheet (not z-index) controlled which element received clicks",
        rootCause: "An element with a higher z-index sits above elements behind it in the stacking order and intercepts pointer events meant for them, regardless of the order styles are declared in the CSS",
        fixSummary: "Lowered the overlay's z-index below the button's in its className, so click events reach the button instead of being captured by the overlay",
        takeaway: "A higher z-index element intercepts clicks meant for elements behind it - check stacking order, not just CSS declaration order, when something becomes unclickable.",
        whenNotApplicable: "Does not apply when the overlay is meant to block interaction with the content behind it, like a modal backdrop.",
        concepts: ["z-index", "stacking context", "pointer events"],
        badCodeExample: "<div className=\"overlay z-50\" />\n<button className=\"save-button z-10\">Save</button>",
        goodCodeExample: "<div className=\"overlay z-0\" />\n<button className=\"save-button z-10\">Save</button>",
        reviewQuestions: [{
          question: "A teammate adds a full-page loading spinner with a high z-index, and afterward a modal's close button stops responding to clicks even though the spinner is hidden. What's the likely cause, and what would you check?",
          expectedAnswer: "The hidden spinner (or its container) may still be in the DOM with a z-index above the modal, intercepting clicks even while visually hidden. Check whether the element is actually removed/display:none, and compare z-index/stacking order against the modal.",
        }],
      },
    });
    assert.equal(result.isError, undefined, result.isError ? (result.content as Array<{ text: string }>)[0].text : undefined);

    const store = createLessonStore(path.join(dataDirectory, "learning.db"));
    try {
      assert.equal(store.list().length, 1);
    } finally {
      store.close();
    }
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("MCP rejects a lesson where fixSummary just repeats mistake", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-mcp-fixsummary-dup-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/cli.js"), "mcp"],
    env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "fixmind-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "save_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Hydration mismatch",
        problem: "Initial markup differed",
        mistake: "Read localStorage during server-side rendering",
        rootCause: "Browser-only APIs are unavailable while the server renders the page",
        fixSummary: "Read localStorage during server-side rendering",
        takeaway: "Read browser-only state inside useEffect, after mount.",
        whenNotApplicable: "Does not apply to values that are identical on server and client.",
        concepts: ["hydration"],
        reviewQuestions: [{
          question: "When is it safe to read localStorage?",
          expectedAnswer: "After the component has mounted in the browser.",
        }],
      },
    });
    assert.equal(result.isError, true);
    const text = (result.content as Array<{ text: string }>)[0].text;
    assert.match(text, /fixSummary/);

    const store = createLessonStore(path.join(dataDirectory, "learning.db"));
    try {
      assert.equal(store.list().length, 0);
    } finally {
      store.close();
    }
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});
