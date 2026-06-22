import { useEffect, useMemo, useRef, useState } from "react";
import { deleteLesson, loadDashboard, resetAllLessons, saveReview, syncPull, syncStatus } from "./api";
import { formatToolName, weekStartOf } from "./format";
import type { DashboardData, DashboardLesson, Understanding } from "./types";

type Filter = "all" | "learning" | "understood";
type ModelFilter = "all" | `tool:${string}`;
type Route = { kind: "dashboard" } | { kind: "lesson"; lessonId: string; review: boolean };

const PAGE_SIZE = 8;

function readRoute(): Route {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const match = pathname.match(/^\/lessons\/([^/]+)$/);
  if (!match) return { kind: "dashboard" };
  return {
    kind: "lesson",
    lessonId: decodeURIComponent(match[1]),
    review: new URLSearchParams(window.location.search).get("review") === "1",
  };
}

function lessonUrl(lessonId: string, review = false): string {
  return `/lessons/${encodeURIComponent(lessonId)}${review ? "?review=1" : ""}`;
}

export function useDashboardController() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [modelFilter, setModelFilter] = useState<ModelFilter>("all");
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [error, setError] = useState("");
  const [syncNote, setSyncNote] = useState("");
  const [syncMeta, setSyncMeta] = useState<{ loggedIn: boolean; email?: string; lastPushedAt?: string; lastPulledAt?: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [page, setPage] = useState(1);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const resetDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (confirmingReset) {
      if (!resetDialogRef.current?.open) resetDialogRef.current?.showModal();
    } else {
      resetDialogRef.current?.close();
    }
  }, [confirmingReset]);

  useEffect(() => {
    const handlePopState = () => setRoute(readRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  async function loadCurrentDashboard(): Promise<void> {
    setError("");
    try {
      setData(await loadDashboard(query));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function refreshDashboard(): Promise<void> {
    setRefreshing(true);
    setError("");
    setSyncNote("");
    try {
      const result = await syncPull();
      if (result.pulled > 0) {
        setSyncNote(`Pulled ${result.pulled} lesson(s), applied ${result.applied} update(s).`);
      } else {
        setSyncNote("No new lessons to pull.");
      }
    } catch (caught) {
      setSyncNote(caught instanceof Error ? `Sync pull skipped: ${caught.message}` : "Sync pull skipped.");
    }
    try {
      await loadCurrentDashboard();
      setSyncMeta(await syncStatus());
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCurrentDashboard();
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    syncStatus().then(setSyncMeta).catch(() => setSyncMeta(null));
  }, []);

  const tools = useMemo(() => data?.models ?? [], [data]);
  const modelCounts = useMemo(
    () => tools.map(({ name, count }) => ({ tool: name, count })),
    [tools],
  );
  const visible = useMemo(
    () =>
      data?.lessons.filter(
        (item) =>
          filter === "all" ||
          (filter === "learning" && item.understanding !== "understood") ||
          (filter === "understood" && item.understanding === "understood"),
      ) ?? [],
    [data, filter],
  );
  const modelVisible = useMemo(
    () =>
      visible.filter(
        (item) =>
          (modelFilter === "all" || item.tool === modelFilter.slice(5)) &&
          (selectedWeek === null || weekStartOf(item.createdAt) === selectedWeek),
      ),
    [modelFilter, selectedWeek, visible],
  );
  const totalPages = Math.max(1, Math.ceil(modelVisible.length / PAGE_SIZE));
  const pageLessons = useMemo(
    () => modelVisible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [modelVisible, page],
  );
  useEffect(() => {
    setPage(1);
  }, [filter, modelFilter, selectedWeek, query]);
  const selectedLesson = useMemo(
    () =>
      route.kind === "lesson"
        ? data?.lessons.find((lesson) => lesson.id === route.lessonId) ?? null
        : null,
    [data, route],
  );

  function navigate(to: string, replace = false) {
    if (replace) {
      window.history.replaceState({}, "", to);
    } else {
      window.history.pushState({}, "", to);
    }
    setRoute(readRoute());
  }

  function open(lesson: DashboardLesson, review: boolean) {
    navigate(lessonUrl(lesson.id, review));
  }
  function toggleWeek(weekStart: string) {
    setSelectedWeek((prev) => (prev === weekStart ? null : weekStart));
  }
  async function submitReview(answers: Record<string, string>, understanding: Understanding) {
    if (route.kind !== "lesson" || !selectedLesson) return;
    await saveReview(selectedLesson.id, answers, understanding);
    await loadCurrentDashboard();
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    navigate("/", true);
  }
  async function removeLesson(lessonId: string) {
    await deleteLesson(lessonId);
    await loadCurrentDashboard();
    if (route.kind === "lesson" && route.lessonId === lessonId) {
      navigate("/", true);
    }
  }
  async function resetAll() {
    await resetAllLessons();
    setConfirmingReset(false);
    await loadCurrentDashboard();
  }

  const filters: Array<[Filter, string]> = [
    ["all", "All"],
    ["learning", "Not learned"],
    ["understood", "Learned"],
  ];
  const modelFilters: Array<[ModelFilter, string]> = [
    ["all", "All models"],
    ...tools.map(({ name }): [ModelFilter, string] => [`tool:${name}`, formatToolName(name)]),
  ];

  return {
    data,
    error,
    filters,
    modelCounts,
    modelFilters,
    filter,
    modelFilter,
    modelVisible,
    page,
    pageLessons,
    query,
    refreshing,
    resetDialogRef,
    saved,
    selectedLesson,
    selectedWeek,
    setConfirmingReset,
    setFilter,
    setModelFilter,
    setPage,
    setQuery,
    setSelectedWeek,
    syncMeta,
    syncNote,
    totalPages,
    confirmingReset,
    navigate,
    open,
    refreshDashboard,
    removeLesson,
    resetAll,
    submitReview,
    toggleWeek,
    route,
  };
}
