import { ExternalLinkIcon, ImageIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "../i18n.js";

export function ReceiptPreview({
  compact = false,
  name,
  url,
}: {
  compact?: boolean;
  name: string;
  url: string;
}) {
  const { messages } = useI18n();
  const [guestUrl, setGuestUrl] = useState("");
  const [open, setOpen] = useState(false);
  const token = window.location.pathname.match(
    /^\/share\/([A-Za-z0-9_-]{43})$/,
  )?.[1];
  useEffect(() => {
    if (!token || !open) return;
    const controller = new AbortController();
    let objectUrl = "";
    void fetch(url, {
      headers: { "X-Otter-Share-Token": token },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        objectUrl = URL.createObjectURL(await response.blob());
        if (!controller.signal.aborted) setGuestUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, url, open]);
  const displayUrl = token ? guestUrl : url;
  const triggerLabel = messages.viewReceiptForName({ name });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setGuestUrl("");
      }}
    >
      <DialogTrigger
        render={
          compact ? (
            <button
              aria-label={triggerLabel}
              className="receipt-preview-trigger"
              type="button"
            >
              <ImageIcon aria-hidden="true" />
            </button>
          ) : (
            <Button size="sm" type="button" variant="outline">
              <ImageIcon aria-hidden="true" />
              {messages.viewReceipt}
            </Button>
          )
        }
      />
      <DialogContent
        className="receipt-preview-dialog"
        closeLabel={messages.closeReceiptPreview}
      >
        <DialogHeader>
          <DialogTitle>{messages.receiptPreviewForName({ name })}</DialogTitle>
          <DialogDescription>
            {messages.closeReceiptPreviewHint}
          </DialogDescription>
        </DialogHeader>
        <DialogClose
          render={
            <button
              aria-label={messages.closeReceiptPreview}
              className="receipt-preview-image"
              type="button"
            />
          }
        >
          {displayUrl ? (
            <img
              alt={messages.receiptImageForName({ name })}
              src={displayUrl}
            />
          ) : null}
        </DialogClose>
        <a
          className="receipt-preview-original"
          href={displayUrl || undefined}
          aria-disabled={!displayUrl}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLinkIcon aria-hidden="true" />
          {messages.openOriginalReceipt}
        </a>
      </DialogContent>
    </Dialog>
  );
}
