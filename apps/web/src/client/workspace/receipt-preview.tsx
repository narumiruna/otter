import { ExternalLinkIcon, ImageIcon } from "@radix-ui/react-icons";
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
  const triggerLabel = messages.viewReceiptForName({ name });

  return (
    <Dialog>
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
          <img alt={messages.receiptImageForName({ name })} src={url} />
        </DialogClose>
        <a
          className="receipt-preview-original"
          href={url}
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
