/**
 * OVI SYNC — React Hooks for Offline-First Architecture
 */
import { useState, useEffect, useCallback } from "react";
import { isOnline, onOnlineStatusChange, processSyncQueue, getUnsyncedCount, fullSync } from "./syncEngine";

// ─── useOnlineStatus ───────────────────────────────────

export function useOnlineStatus() {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    return onOnlineStatusChange(setOnline);
  }, []);

  return online;
}

// ─── useSyncStatus ─────────────────────────────────────

export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const online = useOnlineStatus();

  const refresh = useCallback(async () => {
    const count = await getUnsyncedCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [refresh]);

  // Auto-sync when coming online
  useEffect(() => {
    if (online && pendingCount > 0) {
      setSyncing(true);
      processSyncQueue().then(() => {
        refresh();
        setSyncing(false);
      });
    }
  }, [online, pendingCount, refresh]);

  const syncNow = useCallback(async (userId?: string) => {
    setSyncing(true);
    if (userId) {
      await fullSync(userId);
    } else {
      await processSyncQueue();
    }
    await refresh();
    setSyncing(false);
  }, [refresh]);

  return { pendingCount, syncing, online, syncNow };
}

// ─── useOfflineReady ───────────────────────────────────

export function useOfflineReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // IndexedDB is ready when the database opens successfully
    import("./oviDb").then(({ oviDb }) => {
      oviDb.open().then(() => setReady(true)).catch(() => setReady(false));
    });
  }, []);

  return ready;
}
