import { Cross2Icon } from "@radix-ui/react-icons";
import { Heading, Text } from "@radix-ui/themes";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  type ComponentProps,
  cloneElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type RenderElement = ReactElement<{
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}>;

type TriggerProps = Omit<
  ComponentProps<typeof DialogPrimitive.Trigger>,
  "asChild"
> & {
  render?: RenderElement;
};

type CloseProps = Omit<
  ComponentProps<typeof DialogPrimitive.Close>,
  "asChild"
> & {
  render?: RenderElement;
};

function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

function DialogTrigger({ children, render, ...props }: TriggerProps) {
  if (render) {
    return (
      <DialogPrimitive.Trigger asChild {...props}>
        {cloneElement(render, { children: children ?? render.props.children })}
      </DialogPrimitive.Trigger>
    );
  }
  return (
    <DialogPrimitive.Trigger {...props}>{children}</DialogPrimitive.Trigger>
  );
}

function DialogClose({ children, render, ...props }: CloseProps) {
  if (render) {
    return (
      <DialogPrimitive.Close asChild {...props}>
        {cloneElement(render, { children: children ?? render.props.children })}
      </DialogPrimitive.Close>
    );
  }
  return <DialogPrimitive.Close {...props}>{children}</DialogPrimitive.Close>;
}

function DialogContent({
  children,
  className,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="radix-dialog-overlay" />
      <DialogPrimitive.Content
        className={cn("radix-dialog-content", className)}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close asChild>
            <Button
              aria-label="關閉"
              className="radix-dialog-close"
              size="icon"
              variant="ghost"
            >
              <Cross2Icon aria-hidden="true" />
            </Button>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader(props: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("radix-dialog-header", props.className)} />
  );
}

function DialogFooter(props: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("radix-dialog-footer", props.className)} />
  );
}

function DialogTitle({
  children,
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title asChild {...props}>
      <Heading as="h2" size="5" className={className}>
        {children}
      </Heading>
    </DialogPrimitive.Title>
  );
}

function DialogDescription({
  children,
  className,
  render,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description> & {
  render?: RenderElement;
}) {
  if (render) {
    return (
      <DialogPrimitive.Description asChild {...props}>
        {cloneElement(render, {
          children: children ?? render.props.children,
          className: cn(
            "radix-dialog-description",
            className,
            render.props.className,
          ),
        })}
      </DialogPrimitive.Description>
    );
  }
  return (
    <DialogPrimitive.Description asChild {...props}>
      <Text
        as="p"
        color="gray"
        size="2"
        className={cn("radix-dialog-description", className)}
      >
        {children}
      </Text>
    </DialogPrimitive.Description>
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
