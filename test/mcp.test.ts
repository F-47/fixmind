import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createLessonStore } from "../src/storage.js";

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
    assert.deepEqual(tools.tools.map((tool) => tool.name), ["save_learning_lesson"]);

    const result = await client.callTool({
      name: "save_learning_lesson",
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
    } finally {
      store.close();
    }
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
      name: "save_learning_lesson",
      arguments: {
        projectPath: dataDirectory,
        title: "Detect tool from clientInfo",
        problem: "The tool field always defaulted to unknown-ai-tool",
        mistake: "The schema applied a static default instead of reading the MCP client identity",
        rootCause: "A zod default ran before the connected client's name was considered",
        fixSummary: "Fall back to the MCP client's clientInfo.name when tool is omitted",
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

test("MCP appends quality warning when code examples are missing", async () => {
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
      name: "save_learning_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Extract option helpers",
        problem: "The CLI file was too large",
        mistake: "Moved optionString and parseList into a separate file",
        rootCause: "The helpers were defined inline",
        fixSummary: "Extracted helpers into cli-options.ts",
        concepts: ["single-responsibility"],
        reviewQuestions: [{ question: "When should you extract helpers?", expectedAnswer: "When they are reused or obscure intent." }],
      },
    });
    assert.equal(result.isError, undefined);
    const text = (result.content as Array<{ text: string }>)[0].text;
    assert.ok(text.includes("Quality notice"), `Expected quality warning in: ${text}`);
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
    assert.deepEqual(tools.tools.map((tool) => tool.name), ["save_learning_lesson"]);

    const first = await client.callTool({
      name: "save_learning_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Wrong fix for hydration",
        problem: "Initial markup differed",
        mistake: "Read browser state during server rendering",
        rootCause: "The server and browser had different inputs",
        fixSummary: "Wrapped the read in a try/catch",
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
      name: "save_learning_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Correct fix for hydration",
        problem: "Initial markup differed",
        mistake: "Read browser state during server rendering",
        rootCause: "The server and browser had different inputs",
        fixSummary: "Read browser state after hydration in useEffect",
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
      name: "save_learning_lesson",
      arguments: {
        tool: "claude",
        projectPath: dataDirectory,
        title: "Correct fix for hydration",
        problem: "Initial markup differed",
        mistake: "Read browser state during server rendering",
        rootCause: "The server and browser had different inputs",
        fixSummary: "Read browser state after hydration in useEffect",
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
      name: "save_learning_lesson",
      arguments: { title: "Incomplete" },
    });
    assert.equal(result.isError, true);
  } finally {
    await client.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});
