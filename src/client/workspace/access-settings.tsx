import { Copy, Link, ShieldCheck, Trash2, UserRoundPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { TripPayload } from "../client-support.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import {
  BusyButton,
  ConfirmDialog,
  FormField,
  SectionHeading,
} from "./workspace-ui.js";

export function AccessSettings({ payload }: { payload: TripPayload }) {
  const activeLinks = (payload.shareLinks ?? []).filter(
    (link) => !link.revokedAt,
  ).length;
  return (
    <details className="surface disclosure">
      <summary>
        <ShieldCheck aria-hidden="true" />
        <span>分享與權限</span>
        <span className="summary-meta">
          {activeLinks} 個有效連結 · {payload.collaborators?.length ?? 0}{" "}
          位協作者
        </span>
      </summary>
      <div className="grid gap-6 pt-5">
        <ShareLinks payload={payload} />
        <Collaborators payload={payload} />
      </div>
    </details>
  );
}

function ShareLinks({ payload }: { payload: TripPayload }) {
  const { announce, offline, requestPayload } = useWorkspace();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const next = await requestPayload(
        `/api/trips/${payload.trip.id}/share-links`,
        { method: "POST" },
        "已建立唯讀分享連結",
      );
      const url = next.shareLinks?.find((item) => item.url)?.url;
      if (url) {
        try {
          await navigator.clipboard.writeText(url);
          announce("已建立並複製唯讀分享連結");
        } catch {
          announce("已建立分享連結；瀏覽器未允許自動複製，請手動複製");
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "建立連結失敗");
    } finally {
      setBusy(false);
    }
  }
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      announce("已複製分享連結");
      setError("");
    } catch {
      setError("瀏覽器未允許複製，請開啟連結後從網址列複製");
    }
  }
  return (
    <section className="grid gap-3">
      <SectionHeading description="知道連結的人不需登入即可查看支出、餘額與結清；不能修改資料。">
        唯讀分享連結
      </SectionHeading>
      <ActionError message={error} />
      <ConfirmDialog
        confirmLabel="建立唯讀連結"
        disabled={offline}
        description="任何取得連結的人都能查看這個群組的支出、餘額與結清建議，但不能新增或修改資料。"
        onConfirm={create}
        title="建立分享連結？"
        trigger={
          <BusyButton busy={busy} variant="outline">
            <Link aria-hidden="true" />
            建立分享連結
          </BusyButton>
        }
      />
      <ul className="grid gap-2">
        {payload.shareLinks?.length ? (
          payload.shareLinks.map((link) => (
            <li
              className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"
              key={link.id}
            >
              <span>
                {link.createdAt.slice(0, 10)} ·{" "}
                {link.revokedAt ? "已撤銷" : "可使用"}
              </span>
              {link.url ? (
                <>
                  <a
                    className="break-all text-primary underline"
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    開啟連結
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void copy(link.url ?? "")}
                  >
                    <Copy aria-hidden="true" />
                    複製
                  </Button>
                </>
              ) : null}
              {!link.revokedAt ? (
                <ConfirmDialog
                  confirmLabel="撤銷連結"
                  disabled={offline}
                  description="撤銷後，知道舊連結的人將立即無法查看這個群組。"
                  destructive
                  onConfirm={() =>
                    requestPayload(
                      `/api/trips/${payload.trip.id}/share-links/${link.id}`,
                      { method: "DELETE" },
                      "已撤銷分享連結",
                    )
                  }
                  title="撤銷分享連結？"
                  trigger={
                    <Button className="ml-auto" size="sm" variant="ghost">
                      <Trash2 aria-hidden="true" />
                      撤銷
                    </Button>
                  }
                />
              ) : null}
            </li>
          ))
        ) : (
          <li className="empty-copy">尚未建立分享連結。</li>
        )}
      </ul>
    </section>
  );
}

function Collaborators({ payload }: { payload: TripPayload }) {
  const { offline, requestPayload } = useWorkspace();
  const [error, setError] = useState("");
  const form = useForm<{ email: string }>({ defaultValues: { email: "" } });
  async function add({ email }: { email: string }) {
    setError("");
    try {
      await requestPayload(
        `/api/trips/${payload.trip.id}/members`,
        { body: JSON.stringify({ email }), method: "POST" },
        "已加入協作者",
        true,
      );
      form.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "加入失敗");
    }
  }
  return (
    <section className="grid gap-3 border-t pt-5">
      <SectionHeading description="協作者必須是既有使用者，可維護支出與分帳成員，但不能管理擁有者設定。">
        協作者
      </SectionHeading>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={form.handleSubmit(add)}
      >
        <FormField label="既有使用者 Email">
          <input
            className="form-control"
            type="email"
            placeholder="friend@example.com"
            {...form.register("email", { required: true })}
          />
        </FormField>
        <BusyButton
          busy={form.formState.isSubmitting}
          disabled={offline}
          type="submit"
        >
          <UserRoundPlus aria-hidden="true" />
          加入協作者
        </BusyButton>
      </form>
      <ActionError message={error} />
      <ul className="grid gap-2">
        {payload.collaborators?.map((member) => (
          <li
            className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"
            key={member.userId}
          >
            <span className="min-w-0 flex-1 break-anywhere">
              <strong>{member.name}</strong> · {member.email} ·{" "}
              {member.role === "owner" ? "擁有者" : "協作者"}
            </span>
            {member.role === "editor" ? (
              <ConfirmDialog
                confirmLabel={`移除 ${member.name}`}
                disabled={offline}
                description="移除後這個帳號將無法再維護群組；既有支出資料不會被刪除。"
                destructive
                onConfirm={() =>
                  requestPayload(
                    `/api/trips/${payload.trip.id}/members/${member.userId}`,
                    { method: "DELETE" },
                    "已移除協作者",
                    true,
                  )
                }
                title="移除協作者？"
                trigger={
                  <Button size="sm" variant="ghost">
                    <Trash2 aria-hidden="true" />
                    移除
                  </Button>
                }
              />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
