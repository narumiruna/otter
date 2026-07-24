import type * as ReactTypes from "react";
import * as ReactRuntime from "react";

const React = ReactRuntime;

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: ReactTypes.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };

// Keep a React binding for Node's tsx test loader, which uses the classic JSX
// transform for generated shadcn components.
void React;
