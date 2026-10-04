import { CopyIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { api, type TripPayload } from "../client-support.js";
import { useI18n } from "../i18n.js";
import { useWorkspace } from "./workspace-context.js";
import { ConfirmDialog, SectionHeading } from "./workspace-ui.js";

export function CopyGroup({
  onCopied,
  payload,
}: {
  onCopied: (payload: TripPayload) => void | Promise<void>;
  payload: TripPayload;
}) {
  const { messages } = useI18n();
  const { announce, offline } = useWorkspace();

  async function copy() {
    const copied = await api<TripPayload>(
      `/api/trips/${encodeURIComponent(payload.trip.id)}/copy`,
      { method: "POST" },
    );
    await onCopied(copied);
    announce(messages.groupCopied);
  }

  return (
    <section className="surface grid gap-3">
      <SectionHeading description={messages.copyGroupDescription}>
        {messages.copyGroup}
      </SectionHeading>
      <ConfirmDialog
        confirmLabel={messages.copyGroup}
        description={messages.copyGroupDescription}
        disabled={offline}
        onConfirm={copy}
        title={messages.copyThisGroup}
        trigger={
          <Button className="w-fit" variant="outline">
            <CopyIcon aria-hidden="true" />
            {messages.copyGroup}
          </Button>
        }
      />
    </section>
  );
}
