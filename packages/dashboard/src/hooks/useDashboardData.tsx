import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  deleteLesson,
  loadDashboard,
  resetAllLessons,
  saveReview,
  syncRun,
  syncStatus,
} from "@/lib/api";
import type { DashboardData, SyncMeta, Understanding } from "@/lib/types";

function syncMetaFromError(caught: unknown): SyncMeta {
  return {
    loggedIn: false,
    syncEnabled: false,
    pendingPushCount: 0,
    conflictCount: 0,
    lastSyncError: caught instanceof Error ? caught.message : String(caught),
  };
}

interface DashboardDataContextValue {
  data: DashboardData | null;
  error: string;
  refreshing: boolean;
  saved: boolean;
  syncMeta: SyncMeta | null;
  loadDashboardData(): Promise<void>;
  refreshDashboard(): Promise<boolean>;
  submitReview(
    lessonId: string,
    answers: Record<string, string>,
    understanding: Understanding,
  ): Promise<void>;
  removeLesson(lessonId: string): Promise<void>;
  resetAll(): Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncMeta, setSyncMeta] = useState<SyncMeta | null>(null);
  const savedTimerRef = useRef<number | null>(null);

  const loadDashboardData = useCallback(async (): Promise<void> => {
    setError("");
    try {
      setData(await loadDashboard());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, []);

  const refreshDashboard = useCallback(async (): Promise<boolean> => {
    setRefreshing(true);
    setError("");
    let synced = false;
    try {
      const status = await syncStatus();
      setSyncMeta(status);
      if (status.syncEnabled) {
        await syncRun();
        setSyncMeta(await syncStatus());
        synced = true;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSyncMeta(syncMetaFromError(caught));
    }
    try {
      await loadDashboardData();
    } finally {
      setRefreshing(false);
    }
    return synced;
  }, [loadDashboardData]);

  const submitReview = useCallback(async (
    lessonId: string,
    answers: Record<string, string>,
    understanding: Understanding,
  ): Promise<void> => {
    await saveReview(lessonId, answers, understanding);
    await loadDashboardData();
    setSaved(true);
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => setSaved(false), 1800);
  }, [loadDashboardData]);

  const removeLesson = useCallback(async (lessonId: string): Promise<void> => {
    await deleteLesson(lessonId);
    await loadDashboardData();
  }, [loadDashboardData]);

  const resetAll = useCallback(async (): Promise<void> => {
    await resetAllLessons();
    await loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    syncStatus()
      .then(setSyncMeta)
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : String(caught));
        setSyncMeta(syncMetaFromError(caught));
      });
    return () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

  const value = useMemo<DashboardDataContextValue>(
    () => ({
      data,
      error,
      refreshing,
      saved,
      syncMeta,
      loadDashboardData,
      refreshDashboard,
      submitReview,
      removeLesson,
      resetAll,
    }),
    [
      data,
      error,
      refreshing,
      saved,
      syncMeta,
      loadDashboardData,
      refreshDashboard,
      submitReview,
      removeLesson,
      resetAll,
    ],
  );

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const value = useContext(DashboardDataContext);
  if (!value) {
    throw new Error("useDashboardData must be used within DashboardDataProvider.");
  }
  return value;
}
