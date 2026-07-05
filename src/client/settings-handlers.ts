import {
  type AppState,
  api,
  downloadText,
  safeFilename,
  type TripPayload,
} from "./client-support.js";

type Run = (
  action: () => Promise<void>,
  options?: { action?: string; errorTarget?: string },
) => void;

type SettingsHandlerOptions = {
  state: AppState;
  run: Run;
  loadTrips: () => Promise<void>;
  render: () => void;
  setMessage: (message: string, error?: string) => void;
};

export function bindSettingsHandlers({
  state,
  run,
  loadTrips,
  render,
  setMessage,
}: SettingsHandlerOptions) {
  document
    .querySelector<HTMLButtonElement>("#download-backup")
    ?.addEventListener("click", () => {
      const trip = state.selected?.trip;
      if (!trip) {
        return;
      }
      run(
        async () => {
          const backup = await api<unknown>(`/api/trips/${trip.id}/backup`);
          downloadText(
            `${safeFilename(trip.name)}-backup.json`,
            JSON.stringify(backup, null, 2),
            "application/json;charset=utf-8",
          );
          setMessage("已下載完整備份");
        },
        { action: "download-backup" },
      );
    });

  document
    .querySelector<HTMLFormElement>("#restore-backup-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const file = new FormData(event.currentTarget as HTMLFormElement).get(
        "backup",
      );
      if (!(file instanceof File)) {
        return;
      }
      run(
        async () => {
          const backup = JSON.parse(await file.text()) as unknown;
          state.selected = await api<TripPayload>("/api/trips/restore", {
            body: JSON.stringify(backup),
            method: "POST",
          });
          state.activeTab = "settings";
          await loadTrips();
          setMessage("已還原備份為新的支出群組");
        },
        { action: "restore-backup" },
      );
    });

  document
    .querySelector<HTMLFormElement>("#csv-import-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const tripId = state.selected?.trip.id;
      const file = new FormData(event.currentTarget as HTMLFormElement).get(
        "csv",
      );
      if (!tripId || !(file instanceof File)) {
        return;
      }
      run(
        async () => {
          state.csvImportErrors = [];
          const response = await fetch(`/api/trips/${tripId}/expenses/import`, {
            body: JSON.stringify({ csv: await file.text() }),
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            method: "POST",
          });
          const data = (await response.json()) as
            | TripPayload
            | { error?: string; errors?: string[] };
          if (!response.ok) {
            const errorData = data as { error?: string; errors?: string[] };
            state.csvImportErrors = errorData.errors ?? [];
            throw new Error(errorData.error ?? "CSV 匯入失敗");
          }
          state.selected = data as TripPayload;
          await loadTrips();
          setMessage("已匯入支出 CSV");
        },
        { action: "csv-import" },
      );
    });

  document
    .querySelector<HTMLButtonElement>("#create-share-link")
    ?.addEventListener("click", () => {
      const tripId = state.selected?.trip.id;
      if (!tripId) {
        return;
      }
      run(
        async () => {
          state.selected = await api<TripPayload>(
            `/api/trips/${tripId}/share-links`,
            { method: "POST" },
          );
          const url = state.selected.shareLinks?.find((link) => link.url)?.url;
          if (url && navigator.clipboard) {
            await navigator.clipboard.writeText(url).catch(() => undefined);
          }
          setMessage(url ? "已建立並複製分享連結" : "已建立分享連結");
        },
        { action: "share-create" },
      );
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-copy-share-url]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const url = button.dataset.copyShareUrl;
        if (!url) {
          return;
        }
        if (navigator.clipboard) {
          void navigator.clipboard.writeText(url).then(() => {
            setMessage("已複製分享連結");
            render();
          });
        }
      });
    });

  document
    .querySelectorAll<HTMLFormElement>("[data-revoke-share-link-form]")
    .forEach((formElement) => {
      formElement.addEventListener("submit", (event) => {
        event.preventDefault();
        const tripId = state.selected?.trip.id;
        const linkId = formElement.dataset.revokeShareLinkForm;
        if (!tripId || !linkId) {
          return;
        }
        run(
          async () => {
            state.selected = await api<TripPayload>(
              `/api/trips/${tripId}/share-links/${linkId}`,
              { method: "DELETE" },
            );
            setMessage("已撤銷分享連結");
          },
          { action: `share-revoke:${linkId}` },
        );
      });
    });

  document
    .querySelector<HTMLFormElement>("#collaborator-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const tripId = state.selected?.trip.id;
      const form = new FormData(event.currentTarget as HTMLFormElement);
      if (!tripId) {
        return;
      }
      run(
        async () => {
          state.selected = await api<TripPayload>(
            `/api/trips/${tripId}/members`,
            {
              body: JSON.stringify({ email: String(form.get("email") ?? "") }),
              method: "POST",
            },
          );
          await loadTrips();
          setMessage("已加入協作者");
        },
        { action: "collaborator-add" },
      );
    });

  document
    .querySelectorAll<HTMLFormElement>("[data-remove-collaborator-form]")
    .forEach((formElement) => {
      formElement.addEventListener("submit", (event) => {
        event.preventDefault();
        const tripId = state.selected?.trip.id;
        const userId = formElement.dataset.removeCollaboratorForm;
        if (!tripId || !userId) {
          return;
        }
        run(
          async () => {
            state.selected = await api<TripPayload>(
              `/api/trips/${tripId}/members/${userId}`,
              { method: "DELETE" },
            );
            setMessage("已移除協作者");
          },
          { action: `collaborator-remove:${userId}` },
        );
      });
    });
}
