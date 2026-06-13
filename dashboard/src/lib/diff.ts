export interface DiffLine {
  text: string;
  /** Character ranges within `text` that differ from the other side. */
  changedRanges: [number, number][];
}

type DiffOp = { type: "equal" | "remove" | "add"; value: string };

function diffOps(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "equal", value: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ type: "remove", value: a[i] });
      i++;
    } else {
      ops.push({ type: "add", value: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ type: "remove", value: a[i++] });
  while (j < m) ops.push({ type: "add", value: b[j++] });
  return ops;
}

const TOKEN_PATTERN = /\w+|\s+|[^\w\s]/g;

function tokenize(text: string): string[] {
  return text.match(TOKEN_PATTERN) ?? [];
}

function mergeRanges(ranges: [number, number][]): [number, number][] {
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] === last[1]) last[1] = range[1];
    else merged.push([range[0], range[1]]);
  }
  return merged;
}

/** Character ranges within `a` and `b` that differ, aligned at word boundaries. */
function tokenDiffRanges(a: string, b: string): { aRanges: [number, number][]; bRanges: [number, number][] } {
  const ops = diffOps(tokenize(a), tokenize(b));
  const aRanges: [number, number][] = [];
  const bRanges: [number, number][] = [];
  let aPos = 0;
  let bPos = 0;
  for (const op of ops) {
    const len = op.value.length;
    if (op.type === "equal") {
      aPos += len;
      bPos += len;
    } else if (op.type === "remove") {
      aRanges.push([aPos, aPos + len]);
      aPos += len;
    } else {
      bRanges.push([bPos, bPos + len]);
      bPos += len;
    }
  }
  return { aRanges: mergeRanges(aRanges), bRanges: mergeRanges(bRanges) };
}

/**
 * Lines for one side of a two-way diff. `kind: "bad"` keeps lines that are
 * either shared or only on the "before" side; `kind: "good"` keeps lines
 * that are either shared or only on the "after" side. Lines that differ are
 * paired with their counterpart on the other side (when the hunk sizes
 * match) and word-diffed, so only the changed words carry `changedRanges`
 * instead of the whole line.
 */
export function diffLines(before: string, after: string, kind: "bad" | "good"): DiffLine[] {
  const ops = diffOps(before.split("\n"), after.split("\n"));
  const result: DiffLine[] = [];

  let i = 0;
  while (i < ops.length) {
    if (ops[i].type === "equal") {
      result.push({ text: ops[i].value, changedRanges: [] });
      i++;
      continue;
    }

    const removed: string[] = [];
    const added: string[] = [];
    while (i < ops.length && ops[i].type !== "equal") {
      if (ops[i].type === "remove") removed.push(ops[i].value);
      else added.push(ops[i].value);
      i++;
    }

    const pairCount = Math.min(removed.length, added.length);
    if (kind === "bad") {
      removed.forEach((text, index) => {
        const changedRanges: [number, number][] =
          index < pairCount ? tokenDiffRanges(text, added[index]).aRanges : [[0, text.length]];
        result.push({ text, changedRanges });
      });
    } else {
      added.forEach((text, index) => {
        const changedRanges: [number, number][] =
          index < pairCount ? tokenDiffRanges(removed[index], text).bRanges : [[0, text.length]];
        result.push({ text, changedRanges });
      });
    }
  }

  return result;
}
