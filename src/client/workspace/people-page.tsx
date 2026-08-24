import {
  MixIcon as Merge,
  Pencil2Icon as Pencil,
  TrashIcon as Trash2,
  PersonIcon as UserPlus,
} from "@radix-ui/react-icons";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Participant, Trip } from "../../shared/settlement.js";
import { participantDeleteBlockReason } from "../client-support.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import {
  BusyButton,
  ConfirmDialog,
  FormField,
  SectionHeading,
} from "./workspace-ui.js";

export function PeoplePage({
  readonly = false,
  trip,
}: {
  readonly?: boolean;
  trip: Trip;
}) {
  const { offline, requestPayload } = useWorkspace();
  const [error, setError] = useState("");
  const form = useForm<{ name: string }>({ defaultValues: { name: "" } });
  const submit = form.handleSubmit(async ({ name }) => {
    setError("");
    try {
      await requestPayload(
        `/api/trips/${trip.id}/participants`,
        { body: JSON.stringify({ name }), method: "POST" },
        "已新增分帳成員",
        true,
      );
      form.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "無法新增成員");
    }
  });
  return (
    <section className="surface grid gap-5" aria-labelledby="people-heading">
      <SectionHeading description="分帳成員不需要登入；有登入權限的帳號請到「更多 → 分享與權限」管理。">
        <span id="people-heading">分帳成員</span>
      </SectionHeading>
      {!readonly ? (
        <form
          className="grid gap-3 rounded-xl border bg-muted/40 p-4 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={submit}
        >
          <FormField label="成員名稱">
            <input
              className="form-control"
              maxLength={80}
              placeholder="朋友名字"
              {...form.register("name", { required: "請輸入名稱" })}
            />
          </FormField>
          <BusyButton
            busy={form.formState.isSubmitting}
            disabled={offline}
            type="submit"
          >
            <UserPlus aria-hidden="true" />
            新增成員
          </BusyButton>
          <div className="sm:col-span-2">
            <ActionError
              message={error || form.formState.errors.name?.message || ""}
            />
          </div>
        </form>
      ) : (
        <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          已封存群組為唯讀；還原後才能修改分帳成員。
        </p>
      )}
      <ul className="divide-y rounded-xl border bg-card">
        {trip.participants.map((person) => (
          <ParticipantRow
            key={person.id}
            person={person}
            readonly={readonly}
            trip={trip}
          />
        ))}
      </ul>
      {!readonly && trip.participants.length > 1 ? (
        <MergeParticipants trip={trip} />
      ) : null}
    </section>
  );
}

function ParticipantRow({
  person,
  readonly,
  trip,
}: {
  person: Participant;
  readonly: boolean;
  trip: Trip;
}) {
  const { offline, requestPayload } = useWorkspace();
  const blocked =
    participantDeleteBlockReason(trip, person.id) ||
    ((trip.settlementPayments ?? []).some(
      (payment) => payment.fromId === person.id || payment.toId === person.id,
    )
      ? "已有付款紀錄"
      : null);
  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary font-semibold text-secondary-foreground"
        aria-hidden="true"
      >
        {person.name.trim().charAt(0).toLocaleUpperCase() || "?"}
      </span>
      <strong className="min-w-0 flex-1 break-anywhere">{person.name}</strong>
      {!readonly ? (
        <RenameParticipant offline={offline} person={person} trip={trip} />
      ) : null}
      {!readonly &&
        (blocked ? (
          <span className="text-xs text-muted-foreground">
            無法刪除：{blocked}。請先修改相關支出，或使用下方合併工具。
          </span>
        ) : (
          <ConfirmDialog
            confirmLabel={`刪除 ${person.name}`}
            description="這位成員尚未用於任何支出或付款；刪除後無法復原。"
            destructive
            disabled={offline}
            onConfirm={() =>
              requestPayload(
                `/api/trips/${trip.id}/participants/${person.id}`,
                { method: "DELETE" },
                "已刪除分帳成員",
                true,
              )
            }
            title="刪除分帳成員？"
            trigger={
              <Button size="sm" variant="ghost">
                <Trash2 aria-hidden="true" />
                刪除
              </Button>
            }
          />
        ))}
    </li>
  );
}

function RenameParticipant({
  offline,
  person,
  trip,
}: {
  offline: boolean;
  person: Participant;
  trip: Trip;
}) {
  const { requestPayload } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(person.name);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setError("");
    try {
      await requestPayload(
        `/api/trips/${trip.id}/participants/${person.id}`,
        { body: JSON.stringify({ name }), method: "PATCH" },
        "已更新成員名稱",
      );
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "無法更新名稱");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={offline}
        render={<Button disabled={offline} size="sm" variant="outline" />}
      >
        <Pencil aria-hidden="true" />
        重新命名
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重新命名 {person.name}</DialogTitle>
          <DialogDescription>
            既有支出和付款紀錄會繼續連結到這位成員。
          </DialogDescription>
        </DialogHeader>
        <FormField label="新名稱">
          <input
            className="form-control"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <ActionError message={error} />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
          <BusyButton
            busy={busy}
            disabled={offline}
            onClick={() => void save()}
          >
            儲存名稱
          </BusyButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MergeParticipants({ trip }: { trip: Trip }) {
  const { offline, requestPayload } = useWorkspace();
  const [sourceId, setSourceId] = useState(trip.participants[0]?.id ?? "");
  const [targetId, setTargetId] = useState(trip.participants[1]?.id ?? "");
  const [error, setError] = useState("");
  const source = trip.participants.find((person) => person.id === sourceId);
  const target = trip.participants.find((person) => person.id === targetId);
  const counts = useMemo(
    () => ({
      expenses: trip.expenses.filter(
        (expense) =>
          expense.paidById === sourceId ||
          expense.participantIds.includes(sourceId),
      ).length,
      payments: (trip.settlementPayments ?? []).filter(
        (payment) => payment.fromId === sourceId || payment.toId === sourceId,
      ).length,
    }),
    [sourceId, trip.expenses, trip.settlementPayments],
  );
  return (
    <details className="disclosure">
      <summary>
        <Merge aria-hidden="true" />
        進階成員工具 <span className="summary-meta">合併重複成員</span>
      </summary>
      <div className="grid gap-4 pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="來源成員">
            <select
              className="form-control"
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
            >
              {trip.participants.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="合併到">
            <select
              className="form-control"
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
            >
              {trip.participants.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="rounded-xl border bg-muted/50 p-4 text-sm">
          <strong>變更預覽</strong>
          <p className="mt-1">
            {source?.name ?? "來源成員"} 的 {counts.expenses} 筆相關支出與{" "}
            {counts.payments} 筆付款紀錄將移到 {target?.name ?? "目標成員"}
            ，之後來源成員會被刪除。
          </p>
        </div>
        <ActionError message={error} />
        <ConfirmDialog
          confirmLabel="確認合併成員"
          disabled={offline || !source || !target || sourceId === targetId}
          description={`${source?.name ?? "來源成員"} 會被刪除；相關資料會原子性移轉到 ${target?.name ?? "目標成員"}。`}
          destructive
          onConfirm={async () => {
            try {
              setError("");
              await requestPayload(
                `/api/trips/${trip.id}/participants/${sourceId}/merge`,
                {
                  body: JSON.stringify({ targetParticipantId: targetId }),
                  method: "POST",
                },
                "已合併分帳成員",
                true,
              );
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "合併失敗");
            }
          }}
          title="套用合併？"
          trigger={<Button variant="outline">預覽並合併</Button>}
        />
      </div>
    </details>
  );
}
