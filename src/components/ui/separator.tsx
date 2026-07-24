import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import * as ReactRuntime from "react";

const React = ReactRuntime;

import { cn } from "@/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };

// Keep a React binding for Node's tsx test loader, which uses the classic JSX
// transform for generated shadcn components.
void React;
