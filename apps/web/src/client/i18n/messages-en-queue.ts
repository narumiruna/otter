import { interpolate, type MessageValues } from "./message-types.js";

export const enQueue = {
  offlineQueueBanner:
    "Offline: loaded data remains available. New expenses can be saved on this device; other edits require a connection.",
  queueSave: "Save on this device",
  queueSaved:
    "Saved on this device. Not yet included in balances; exchange rates are set when synced.",
  queueStorageError:
    "Could not save on this device. Keep this page open and try again.",
  queueTitle: "Unsynced expenses",
  queueNotice:
    "Only on this device. Not included in balances. Exchange rates are set at sync time. Clearing browser data loses these drafts.",
  queuePending: "Waiting to sync",
  queueAttempted:
    "Sync pending confirmation; keep the original request unchanged",
  queueConflict:
    "Sync stopped. Check access and participants before retrying; the original request is retained.",
  queueInvalid: "Not recorded. Edit the draft and retry.",
  queueEdit: "Edit draft",
  queueRetry: "Retry original request",
  queueDelete: "Delete local draft",
  queueDeleteConfirm:
    "Delete this local draft? A request already sent may still have been recorded on the server. Check the group first.",
  queueCount: (values: MessageValues) =>
    interpolate("{count} unsynced expenses on this device", values),
  queueSyncPricing:
    "Preview shows original currency only. The server sets the exchange rate at sync time.",
  queueOrphanTitle: "Drafts from unavailable groups",
  queueOrphanNotice:
    "These groups are no longer accessible. A sent request may have been recorded; verify before deleting its local copy.",
  queueOrphanTrip: (values: MessageValues) =>
    interpolate("Group ID: {id}", values),
};
