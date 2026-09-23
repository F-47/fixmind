import assert from "node:assert/strict";
import test from "node:test";
import { buildGitAutofill } from "../src/git-autofill.js";

test("buildGitAutofill infers files, pattern, concepts, and a compact code example", () => {
  const autofill = buildGitAutofill({
    isRepo: true,
    filesChanged: ["app/theme.tsx"],
    sourceDiff: [
      "diff --git a/app/theme.tsx b/app/theme.tsx",
      "index 1111111..2222222 100644",
      "--- a/app/theme.tsx",
      "+++ b/app/theme.tsx",
      "@@ -1,5 +1,7 @@",
      " export function ThemeToggle() {",
      '-  const theme = localStorage.getItem("theme");',
      "-  return <div>{theme}</div>;",
      "+  useEffect(() => {",
      '+    setTheme(localStorage.getItem("theme"));',
      "+  }, []);",
      "+  return <div>{theme}</div>;",
      " }",
    ].join("\n"),
  });

  assert.deepEqual(autofill.filesChanged, ["app/theme.tsx"]);
  assert.equal(autofill.mistakePattern, "Hydration timing");
  assert.deepEqual(autofill.concepts, ["Hydration", "SSR"]);
  assert.match(autofill.codeExample ?? "", /useEffect/);
  assert.match(autofill.codeExample ?? "", /setTheme/);
});
