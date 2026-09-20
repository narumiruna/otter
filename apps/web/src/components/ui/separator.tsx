import {
  Separator as RadixSeparator,
  type SeparatorProps,
} from "@radix-ui/themes";
import { cn } from "@/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorProps) {
  return (
    <RadixSeparator
      data-slot="separator"
      orientation={orientation}
      size="4"
      className={cn("otter-separator", className)}
      {...props}
    />
  );
}

export { Separator };
