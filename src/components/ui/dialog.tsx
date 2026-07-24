import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
// biome-ignore lint/style/useImportType: Node's tsx test loader requires a React runtime binding.
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogContent({
  children,
  className,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & { showCloseButton?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <DialogPrimitive.Popup
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-2xl bg-popover p-5 text-popover-foreground shadow-2xl ring-1 ring-black/10 outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            render={
              <Button
                className="absolute top-3 right-3"
                size="icon"
                variant="ghost"
              />
            }
          >
            <XIcon aria-hidden="true" />
            <span className="sr-only">關閉</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader(props: React.ComponentProps<"div">) {
  return <div {...props} className={cn("grid gap-2 pr-8", props.className)} />;
}

function DialogFooter(props: React.ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end",
        props.className,
      )}
    />
  );
}

function DialogTitle(props: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      {...props}
      className={cn("text-lg font-semibold", props.className)}
    />
  );
}

function DialogDescription(props: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      {...props}
      className={cn("text-sm text-muted-foreground", props.className)}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
