/**
 * OVI SYNC — Offline Banner Component
 * Shows a non-intrusive banner when the user is offline.
 */
import { WifiOff, CloudOff, RefreshCw, Loader2 } from "lucide-react";
import { useOnlineStatus, useSyncStatus } from "@/lib/offline/useOffline";
import { Button } from "@/components/ui/button";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  const { pendingCount, syncing, syncNow } = useSyncStatus();

  if (online && pendingCount === 0) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-2.5 flex items-center justify-between text-sm font-medium transition-all ${
      online
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-t border-amber-500/20"
        : "bg-red-500/10 text-red-700 dark:text-red-400 border-t border-red-500/20"
    }`}>
      <div className="flex items-center gap-2">
        {online ? (
          <>
            <CloudOff size={16} />
            <span>{pendingCount} change{pendingCount !== 1 ? "s" : ""} pending sync</span>
          </>
        ) : (
          <>
            <WifiOff size={16} />
            <span>You're offline — changes will sync when you reconnect</span>
          </>
        )}
      </div>

      {online && pendingCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => syncNow()}
          disabled={syncing}
          className="h-7 gap-1.5 text-xs"
        >
          {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      )}
    </div>
  );
}
