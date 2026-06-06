/**
 * OVI SYNC — Sync Engine
 * Handles bidirectional sync between IndexedDB and Supabase.
 * Conflict resolution: server wins for reads, client wins for writes (last-write-wins).
 */
import { oviDb } from "./oviDb";
import { supabase } from "@/integrations/supabase/client";

const MAX_RETRY_ATTEMPTS = 3;
const SYNC_BATCH_SIZE = 50;

// ─── Online Status ─────────────────────────────────────

let _isOnline = navigator.onLine;
let _listeners: ((online: boolean) => void)[] = [];

window.addEventListener("online", () => {
  _isOnline = true;
  _listeners.forEach((fn) => fn(true));
  processSyncQueue();
});

window.addEventListener("offline", () => {
  _isOnline = false;
  _listeners.forEach((fn) => fn(false));
});

export function isOnline(): boolean {
  return _isOnline;
}

export function onOnlineStatusChange(fn: (online: boolean) => void): () => void {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}

// ─── Queue Operations ──────────────────────────────────

export async function addToSyncQueue(
  table: string,
  recordId: string,
  action: "insert" | "update" | "delete",
  payload: any
) {
  await oviDb.sync_queue.add({
    table,
    record_id: recordId,
    action,
    payload,
    created_at: new Date().toISOString(),
    attempts: 0,
    last_error: null,
  });

  // Try immediate sync if online
  if (_isOnline) {
    processSyncQueue();
  }
}

// ─── Sync Queue Processor ──────────────────────────────

export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  if (!_isOnline) return { synced: 0, failed: 0 };

  const pending = await oviDb.sync_queue
    .where("attempts")
    .below(MAX_RETRY_ATTEMPTS)
    .limit(SYNC_BATCH_SIZE)
    .toArray();

  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const { error } = await supabase.rpc("sync_upsert", {
        p_table: item.table,
        p_record_id: item.record_id,
        p_action: item.action,
        p_payload: item.payload,
      });

      if (error) throw error;

      // Mark local record as synced
      if (item.action !== "delete") {
        const table = oviDb.table(item.table);
        if (table) {
          await table.update(item.record_id, { _synced: 1 });
        }
      }

      // Remove from queue
      await oviDb.sync_queue.delete(item.id!);
      synced++;
    } catch (err) {
      // Increment attempt count and log error
      await oviDb.sync_queue.update(item.id!, {
        attempts: item.attempts + 1,
        last_error: err instanceof Error ? err.message : String(err),
      });
      failed++;
    }
  }

  return { synced, failed };
}

// ─── Pull from Server ──────────────────────────────────

const PULL_TABLES = [
  { table: "mastery", supabaseTable: "topic_mastery" },
  { table: "flashcards", supabaseTable: "flashcards" },
  { table: "assessments", supabaseTable: "assessments" },
  { table: "notes", supabaseTable: "revision_notes" },
  { table: "study_plan", supabaseTable: "study_plans" },
  { table: "streaks", supabaseTable: "streak_data" },
];

export async function pullFromServer(userId: string): Promise<number> {
  if (!_isOnline) return 0;

  let totalPulled = 0;

  for (const { table, supabaseTable } of PULL_TABLES) {
    try {
      const { data, error } = await supabase
        .from(supabaseTable)
        .select("*")
        .eq("user_id", userId);

      if (error || !data) continue;

      const localTable = oviDb.table(table);
      if (!localTable) continue;

      // Get local records to compare
      const localRecords = await localTable.where("user_id").equals(userId).toArray();
      const localMap = new Map(localRecords.map((r) => [r.id, r]));

      for (const serverRecord of data) {
        const local = localMap.get(serverRecord.id);

        // Server wins if local is synced or server is newer
        if (!local || local._synced === 1) {
          await localTable.put({
            ...serverRecord,
            _synced: 1,
            _version: (local?._version || 0) + 1,
          });
          totalPulled++;
        }
        // If local is dirty (unsynced), keep local — it will be pushed later
      }
    } catch {
      // Table might not exist yet — continue
    }
  }

  return totalPulled;
}

// ─── Full Sync ─────────────────────────────────────────

export async function fullSync(userId: string): Promise<{
  pulled: number;
  pushed: number;
  failed: number;
}> {
  // 1. Push local changes first
  const pushResult = await processSyncQueue();

  // 2. Pull server changes
  const pulled = await pullFromServer(userId);

  return {
    pulled,
    pushed: pushResult.synced,
    failed: pushResult.failed,
  };
}

// ─── Conflict Resolution Helpers ───────────────────────

export async function getUnsyncedCount(): Promise<number> {
  return oviDb.sync_queue.count();
}

export async function getDirtyRecords(table: string): Promise<any[]> {
  const localTable = oviDb.table(table);
  if (!localTable) return [];
  return localTable.where("_synced").equals(0).toArray();
}

export async function markAsSynced(table: string, id: string): Promise<void> {
  const localTable = oviDb.table(table);
  if (localTable) {
    await localTable.update(id, { _synced: 1 });
  }
}
