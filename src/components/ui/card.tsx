import { type CardProps, Card as RadixCard, Text } from "@radix-ui/themes";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Card({
  className,
  size = "default",
  ...props
}: Omit<CardProps, "size"> & { size?: "default" | "sm" }) {
  return (
    <RadixCard
      data-slot="card"
      data-size={size}
      size={size === "sm" ? "1" : "2"}
      className={cn("otter-card", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("otter-card-header", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("otter-card-title", className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  children,
  color: _color,
  ...props
}: ComponentProps<"div">) {
  return (
    <Text
      as="div"
      color="gray"
      data-slot="card-description"
      size="2"
      className={className}
      {...props}
    >
      {children}
    </Text>
  );
}

function CardAction({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("otter-card-action", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("otter-card-content", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("otter-card-footer", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
